const { createRequestClient, isSupabaseConfigured, requireLeadManager, reply } = require('../supabase');
const statuses = new Set(['new','contacted','qualified','proposal_sent','negotiation','won','lost']);

module.exports = async function ownerLeads(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (!isSupabaseConfigured()) return reply(res, 503, { error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Owner workspace storage is not configured.' } });
  let session;
  try {
    session = createRequestClient(req, res);
    const access = await requireLeadManager(session.client);
    if (access.error) return reply(res, access.error.status, { error: access.error }, session);
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const query = req.query || Object.fromEntries(url.searchParams.entries());
    const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit || '25', 10) || 25));
    const page = Math.max(1, Number.parseInt(query.page || '1', 10) || 1);
    if (page > 10000) return reply(res, 400, { error: { code: 'INVALID_PAGE', message: 'Page is outside the supported range.' } }, session);
    const status = typeof query.status === 'string' ? query.status : '';
    if (status && !statuses.has(status)) return reply(res, 400, { error: { code: 'INVALID_STATUS', message: 'Choose a valid lead status.' } }, session);
    const rawSearch = typeof query.search === 'string' ? query.search.trim() : '';
    if (rawSearch.length > 80 || /[,()%\\"<>]/.test(rawSearch)) return reply(res, 400, { error: { code: 'INVALID_SEARCH', message: 'Search text contains unsupported characters.' } }, session);
    let request = session.client.from('leads').select('id,public_reference,full_name,email_normalized,phone,company_name,website_url,service_areas,project_description,budget_band,preferred_contact_method,status,follow_up_at,consent_version,consented_at,created_at,updated_at', { count: 'exact' }).order('created_at', { ascending: false }).order('id', { ascending: false });
    if (status) request = request.eq('status', status);
    if (rawSearch) {
      const term = `*${rawSearch.replace(/[.*]/g, '\\$&')}*`;
      request = request.or(`full_name.ilike.${term},email_normalized.ilike.${term},company_name.ilike.${term},public_reference.ilike.${term}`);
    }
    const from = (page - 1) * limit;
    const { data, count, error } = await request.range(from, from + limit - 1);
    if (error) return reply(res, 503, { error: { code: 'LEADS_UNAVAILABLE', message: 'Leads could not be loaded.' } }, session);
    return reply(res, 200, { data: data || [], pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) } }, session);
  } catch {
    return reply(res, 503, { error: { code: 'LEADS_UNAVAILABLE', message: 'Leads could not be loaded.' } }, session);
  }
};
