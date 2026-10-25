const { createRequestClient, isSupabaseConfigured, requireLeadManager, reply, sameOrigin } = require('../supabase');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function ownerLeadNotes(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (!sameOrigin(req)) return reply(res, 403, { error: { code: 'ORIGIN_REJECTED', message: 'Request origin could not be verified.' } });
  if (!isSupabaseConfigured()) return reply(res, 503, { error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Owner workspace storage is not configured.' } });
  const leadId = req.query?.id;
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body.body : '';
  const note = typeof body === 'string' ? body.trim() : '';
  if (!uuid.test(leadId || '')) return reply(res, 404, { error: { code: 'NOT_FOUND', message: 'Lead not found.' } });
  if (!note || note.length > 3000) return reply(res, 400, { error: { code: 'INVALID_NOTE', message: 'Internal notes must be between 1 and 3,000 characters.' } });
  let session;
  try {
    session = createRequestClient(req, res);
    const access = await requireLeadManager(session.client);
    if (access.error) return reply(res, access.error.status, { error: access.error }, session);
    const { data, error } = await session.client.from('lead_notes').insert({ lead_id: leadId, body: note, created_by: access.user.id }).select('id,body,created_by,created_at').single();
    if (error) {
      if (error.code === '23503') return reply(res, 404, { error: { code: 'NOT_FOUND', message: 'Lead not found.' } }, session);
      return reply(res, 503, { error: { code: 'NOTE_SAVE_FAILED', message: 'Internal note could not be saved.' } }, session);
    }
    return reply(res, 201, { data }, session);
  } catch {
    return reply(res, 503, { error: { code: 'NOTE_SAVE_FAILED', message: 'Internal note could not be saved.' } }, session);
  }
};
