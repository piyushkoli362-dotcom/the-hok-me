const $ = selector => document.querySelector(selector);
const loginPanel = $('#login-panel'), workspacePanel = $('#workspace-panel'), loginError = $('#login-error'), mfaPanel = $('#mfa-panel');
const state = { page: 1, limit: 25, totalPages: 1, search: '', status: '', selectedId: '', request: 0 };
const statusLabels = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', proposal_sent: 'Proposal sent', negotiation: 'Negotiation', won: 'Won', lost: 'Lost' };

function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined && text !== null) node.textContent = String(text); return node; }
function formatDate(value, options = { dateStyle: 'medium', timeStyle: 'short' }) { if (!value) return '—'; const date = new Date(value); return Number.isNaN(date.valueOf()) ? '—' : new Intl.DateTimeFormat('en-IN', options).format(date); }
async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, { method, credentials: 'same-origin', cache: 'no-store', headers: body === undefined ? {} : { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : null;
  if (!response.ok) { const error = new Error(payload?.error?.message || payload?.error || 'Request could not be completed.'); error.code = payload?.error?.code; error.status = response.status; throw error; }
  return { payload, response };
}
function showLogin(message = '') {
  workspacePanel.hidden = true; loginPanel.hidden = false; $('#sign-out').hidden = true; $('#owner-email').textContent = ''; mfaPanel.hidden = true;
  if (message) loginError.textContent = message;
}
function showWorkspace(email) {
  loginPanel.hidden = true; workspacePanel.hidden = false; $('#sign-out').hidden = false; $('#owner-email').textContent = email || '';
  $('#workspace-error').textContent = ''; loadWorkspace();
}
function showMfa() {
  loginPanel.hidden = false; $('#login-form').hidden = true; mfaPanel.hidden = false; $('#mfa-error').textContent = ''; prepareMfa();
}
function resetMfa() { $('#login-form').hidden = false; mfaPanel.hidden = true; $('#mfa-enrollment').hidden = true; $('#mfa-form').reset(); }

async function prepareMfa() {
  const instructions = $('#mfa-instructions');
  try {
    let { payload } = await api('/api/owner/mfa');
    if (payload.factors?.length) {
      const factor = payload.factors[0]; $('#mfa-form [name="factorId"]').value = factor.id;
      instructions.textContent = `Enter the current code from ${factor.friendlyName}.`;
      return;
    }
    if (payload.pending) {
      await api('/api/owner/mfa', { method: 'POST', body: { action: 'cancel-pending' } });
    }
    ({ payload } = await api('/api/owner/mfa', { method: 'POST', body: { action: 'enroll' } }));
    $('#mfa-form [name="factorId"]').value = payload.factor.id;
    $('#mfa-enrollment').hidden = false; $('#mfa-qr').src = payload.factor.qrCode; $('#mfa-secret').textContent = payload.factor.secret;
    instructions.textContent = 'Add this account to an authenticator app, then enter its current code below. The setup key stays in this browser session.';
  } catch (error) { $('#mfa-error').textContent = error.message; }
}

async function loadWorkspace() {
  const current = ++state.request;
  $('#workspace-error').textContent = ''; $('#lead-rows').replaceChildren(element('tr'));
  const [dashboard, leads, integrations] = await Promise.allSettled([
    api('/api/owner/dashboard'), api(`/api/owner/leads?page=${state.page}&limit=${state.limit}&status=${encodeURIComponent(state.status)}&search=${encodeURIComponent(state.search)}`), api('/api/owner/integrations')
  ]);
  if (current !== state.request) return;
  const failed = [dashboard, leads, integrations].find(result => result.status === 'rejected');
  if (failed) {
    if (failed.reason?.status === 401 || failed.reason?.code === 'MFA_REQUIRED') { showLogin(failed.reason.code === 'MFA_REQUIRED' ? 'Complete authenticator verification to continue.' : 'Your session ended. Please sign in again.'); if (failed.reason.code === 'MFA_REQUIRED') showMfa(); return; }
    $('#workspace-error').textContent = failed.reason?.message || 'Workspace data is unavailable.'; return;
  }
  const counts = dashboard.value.payload.counts;
  $('#metric-total').textContent = counts.leads; $('#metric-new').textContent = counts.newLeads; $('#metric-followups').textContent = counts.followUpsDue;
  state.totalPages = Math.max(1, leads.value.payload.pagination.pages); renderLeads(leads.value.payload.data || []); renderPage();
  const sheets = integrations.value.payload.sheets;
  $('#sync-state').textContent = sheets.configured ? 'Private spreadsheet sync is configured.' : 'Not configured. Inquiry records remain in PostgreSQL.';
  const syncCounts = sheets.counts || {};
  $('#sync-counts').textContent = `Pending ${syncCounts.pending || 0} · Retryable ${syncCounts.retryable_failure || 0} · Failed ${syncCounts.permanent_failure || 0} · Complete ${syncCounts.succeeded || 0}`;
  $('#sync-now').disabled = !sheets.configured;
}

function renderLeads(leads) {
  const rows = $('#lead-rows'); rows.replaceChildren();
  if (!leads.length) { const tr = element('tr'), td = element('td', '', 'No inquiries match these filters.'); td.colSpan = 4; tr.append(td); rows.append(tr); return; }
  for (const lead of leads) {
    const tr = element('tr'), person = element('td'), select = element('button', 'lead-select', lead.full_name); select.type = 'button'; select.addEventListener('click', () => loadLead(lead.id));
    person.append(select, element('span', 'lead-sub', `${lead.public_reference} · ${lead.email_normalized}`));
    const service = element('td', '', lead.service_areas); const status = element('td'); status.append(element('span', `status-badge ${lead.status}`, statusLabels[lead.status] || lead.status));
    const created = element('td', '', formatDate(lead.created_at, { dateStyle: 'medium' })); tr.append(person, service, status, created); rows.append(tr);
  }
}
function renderPage() { $('#page-indicator').textContent = `Page ${state.page} of ${state.totalPages}`; $('#previous-page').disabled = state.page <= 1; $('#next-page').disabled = state.page >= state.totalPages; }

function renderLeadDetail(lead) {
  const panel = $('#lead-detail'); panel.replaceChildren();
  const head = element('div', 'detail-head'), titleGroup = element('div'); titleGroup.append(element('span', 'detail-ref', lead.public_reference), element('h2', '', lead.full_name), element('div', 'detail-contact', lead.email_normalized));
  const contact = titleGroup.querySelector('.detail-contact');
  if (lead.phone) { const phone = element('a', '', lead.phone); phone.href = `tel:${lead.phone.replace(/[^+\d]/g, '')}`; contact.append(element('span', '', ' · '), phone); }
  if (lead.company_name) contact.append(element('span', '', lead.company_name));
  if (lead.website_url) { const website = element('a', '', lead.website_url); website.href = lead.website_url; website.target = '_blank'; website.rel = 'noreferrer'; contact.append(website); }
  head.append(titleGroup, element('span', `status-badge ${lead.status}`, statusLabels[lead.status])); panel.append(head);
  const addBlock = (title, value) => { const block = element('section', 'detail-block'); block.append(element('h3', '', title), element('p', '', value || '—')); panel.append(block); };
  addBlock('Project areas', lead.service_areas); addBlock('Project summary', lead.project_description);
  addBlock('Budget · contact preference', [lead.budget_band, lead.preferred_contact_method].filter(Boolean).join(' · ') || 'Not provided');
  addBlock('Consent record', `${lead.consent_version} · ${formatDate(lead.consented_at)}`);
  const controls = element('form', 'detail-block detail-controls'); controls.id = 'lead-update-form';
  const statusLabel = element('label', '', 'Pipeline status'); const select = document.createElement('select'); select.name = 'status';
  for (const [value, label] of Object.entries(statusLabels)) { const option = document.createElement('option'); option.value = value; option.textContent = label; select.append(option); } select.value = lead.status; statusLabel.append(select);
  const followLabel = element('label', '', 'Follow-up date'); const followInput = document.createElement('input'); followInput.name = 'followUpAt'; followInput.type = 'datetime-local'; followInput.value = lead.follow_up_at ? new Date(new Date(lead.follow_up_at).getTime() - new Date(lead.follow_up_at).getTimezoneOffset() * 60000).toISOString().slice(0,16) : ''; followLabel.append(followInput);
  const save = element('button', 'button secondary full', 'Save lead updates'); save.type = 'submit'; controls.append(statusLabel, followLabel, save); panel.append(controls);
  controls.addEventListener('submit', async event => { event.preventDefault(); save.disabled = true; try { const body = { status: select.value, followUpAt: followInput.value ? new Date(followInput.value).toISOString() : null }; await api(`/api/owner/leads/${lead.id}`, { method: 'PATCH', body }); await loadLead(lead.id); await loadWorkspace(); } catch (error) { $('#workspace-error').textContent = error.message; } finally { save.disabled = false; } });
  const notes = element('section', 'detail-block'); notes.append(element('h3', '', 'Internal notes')); const notesList = element('div', 'notes-list');
  if (lead.notes?.length) for (const note of lead.notes) { const item = element('div', 'note-item', note.body); item.append(element('time', '', formatDate(note.created_at))); notesList.append(item); }
  else notesList.append(element('p', '', 'No internal notes yet.'));
  notes.append(notesList); const noteForm = element('form', 'note-form'), noteText = document.createElement('textarea'); noteText.name = 'body'; noteText.maxLength = 3000; noteText.required = true; noteText.placeholder = 'Add a private follow-up note…'; const noteButton = element('button', 'button secondary', 'Add internal note'); noteButton.type = 'submit'; noteForm.append(noteText, noteButton); notes.append(noteForm); panel.append(notes);
  noteForm.addEventListener('submit', async event => { event.preventDefault(); noteButton.disabled = true; try { await api(`/api/owner/leads/${lead.id}/notes`, { method: 'POST', body: { body: noteText.value } }); await loadLead(lead.id); noteForm.reset(); } catch (error) { $('#workspace-error').textContent = error.message; } finally { noteButton.disabled = false; } });
  const activity = element('section', 'detail-block'); activity.append(element('h3', '', 'Activity')); const activityList = element('div', 'activity-list');
  if (lead.activity?.length) for (const item of lead.activity) { const node = element('div', 'activity-item', item.summary); node.append(element('time', '', formatDate(item.created_at))); activityList.append(node); } else activityList.append(element('p', '', 'No activity recorded.'));
  activity.append(activityList); panel.append(activity);
}

async function loadLead(id) {
  $('#workspace-error').textContent = ''; state.selectedId = id; $('#lead-detail').replaceChildren(element('p', 'owner-message', 'Loading inquiry…'));
  try { const { payload } = await api(`/api/owner/leads/${id}`); renderLeadDetail(payload.data); }
  catch (error) { $('#lead-detail').replaceChildren(element('p', 'owner-message', error.message)); if (error.status === 401 || error.code === 'MFA_REQUIRED') showLogin('Your session ended. Please sign in again.'); }
}

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault(); loginError.textContent = ''; const button = $('#login-form button[type="submit"]'); button.disabled = true;
  const form = new FormData(event.currentTarget);
  try { const { payload } = await api('/api/owner/login', { method: 'POST', body: { email: form.get('email'), password: form.get('password') } }); if (payload.mfaRequired) showMfa(); else showWorkspace(payload.user?.email); }
  catch (error) { loginError.textContent = error.message; }
  finally { button.disabled = false; }
});
$('#mfa-form').addEventListener('submit', async event => {
  event.preventDefault(); const button = $('#mfa-form button[type="submit"]'); button.disabled = true; $('#mfa-error').textContent = '';
  const factorId = $('#mfa-form [name="factorId"]').value, code = $('#mfa-form [name="code"]').value;
  try { await api('/api/owner/mfa', { method: 'POST', body: { action: 'verify', factorId, code } }); resetMfa(); const { payload } = await api('/api/owner/session'); showWorkspace(payload.user?.email); }
  catch (error) { $('#mfa-error').textContent = error.message; }
  finally { button.disabled = false; }
});
$('#sign-out').addEventListener('click', async () => { try { await api('/api/owner/logout', { method: 'POST', body: {} }); } finally { showLogin('You have been signed out.'); $('#login-form').reset(); } });
$('#previous-page').addEventListener('click', () => { if (state.page > 1) { state.page--; loadWorkspace(); } });
$('#next-page').addEventListener('click', () => { if (state.page < state.totalPages) { state.page++; loadWorkspace(); } });
$('#lead-status').addEventListener('change', event => { state.status = event.target.value; state.page = 1; loadWorkspace(); });
let searchTimer; $('#lead-search').addEventListener('input', event => { clearTimeout(searchTimer); searchTimer = setTimeout(() => { state.search = event.target.value.trim(); state.page = 1; loadWorkspace(); }, 250); });
$('#export-leads').addEventListener('click', async event => { const button = event.currentTarget; button.disabled = true; $('#workspace-error').textContent = ''; try { const { payload, response } = await api('/api/owner/leads/export'); const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = element('a'); link.href = url; link.download = `the-hookmedia-leads-${new Date().toISOString().slice(0,10)}.csv`; link.click(); URL.revokeObjectURL(url); } catch (error) { $('#workspace-error').textContent = error.message; } finally { button.disabled = false; } });
$('#sync-now').addEventListener('click', async event => { const button = event.currentTarget; button.disabled = true; $('#workspace-error').textContent = ''; try { const { payload } = await api('/api/owner/sheets-sync', { method: 'POST', body: { retryFailed: true } }); $('#workspace-error').textContent = `Sync complete: ${payload.succeeded} saved, ${payload.failed} failed.`; await loadWorkspace(); } catch (error) { $('#workspace-error').textContent = error.message; } finally { button.disabled = false; } });

(async function initialize() {
  try { const { payload } = await api('/api/owner/session'); if (payload.authenticated) showWorkspace(payload.user?.email); }
  catch (error) { if (error.code === 'MFA_REQUIRED') showMfa(); else if (error.code !== 'UNAUTHENTICATED' && error.status !== 401) loginError.textContent = error.message; }
})();
