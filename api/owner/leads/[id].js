const { createRequestClient, isSupabaseConfigured, requireLeadManager, reply, sameOrigin } = require('../../../lib/server/supabase');
const statuses = new Set(['new','contacted','qualified','proposal_sent','negotiation','won','lost']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

module.exports = async function ownerLead(req, res) {
  if (!['GET','PATCH'].includes(req.method)) return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (req.method === 'PATCH' && !sameOrigin(req)) return reply(res, 403, { error: { code: 'ORIGIN_REJECTED', message: 'Request origin could not be verified.' } });
  if (!isSupabaseConfigured()) return reply(res, 503, { error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Owner workspace storage is not configured.' } });
  const id = req.query?.id;
  if (!uuid.test(id || '')) return reply(res, 404, { error: { code: 'NOT_FOUND', message: 'Lead not found.' } });
  let session;
  try {
    session = createRequestClient(req, res);
    const access = await requireLeadManager(session.client);
    if (access.error) return reply(res, access.error.status, { error: access.error }, session);
    if (req.method === 'GET') {
      const [leadResult, notesResult, activityResult] = await Promise.all([
        session.client.from('leads').select('id,public_reference,full_name,email_normalized,phone,company_name,website_url,service_areas,project_description,budget_band,preferred_contact_method,status,follow_up_at,consent_version,consented_at,created_at,updated_at').eq('id', id).maybeSingle(),
        session.client.from('lead_notes').select('id,body,created_by,created_at').eq('lead_id', id).order('created_at', { ascending: false }).limit(50),
        session.client.from('lead_activities').select('id,activity_type,summary,created_at').eq('lead_id', id).order('created_at', { ascending: false }).limit(50)
      ]);
      if (leadResult.error || notesResult.error || activityResult.error) return reply(res, 503, { error: { code: 'LEAD_UNAVAILABLE', message: 'Lead details could not be loaded.' } }, session);
      if (!leadResult.data) return reply(res, 404, { error: { code: 'NOT_FOUND', message: 'Lead not found.' } }, session);
      return reply(res, 200, { data: { ...leadResult.data, notes: notesResult.data || [], activity: activityResult.data || [] } }, session);
    }
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    const patch = {};
    if (Object.hasOwn(body, 'status')) {
      if (!statuses.has(body.status)) return reply(res, 400, { error: { code: 'INVALID_STATUS', message: 'Choose a valid lead status.' } }, session);
      patch.status = body.status;
    }
    if (Object.hasOwn(body, 'followUpAt')) {
      if (body.followUpAt === null || body.followUpAt === '') patch.follow_up_at = null;
      else if (typeof body.followUpAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(body.followUpAt) || Number.isNaN(Date.parse(body.followUpAt))) {
        return reply(res, 400, { error: { code: 'INVALID_FOLLOW_UP', message: 'Enter a valid follow-up date and time.' } }, session);
      } else patch.follow_up_at = new Date(body.followUpAt).toISOString();
    }
    if (!Object.keys(patch).length) return reply(res, 400, { error: { code: 'EMPTY_UPDATE', message: 'Choose a status or follow-up date to update.' } }, session);
    const { data, error } = await session.client.from('leads').update(patch).eq('id', id).select('id,public_reference,status,follow_up_at,updated_at').maybeSingle();
    if (error) return reply(res, 503, { error: { code: 'LEAD_UPDATE_FAILED', message: 'Lead update could not be saved.' } }, session);
    if (!data) return reply(res, 404, { error: { code: 'NOT_FOUND', message: 'Lead not found.' } }, session);
    return reply(res, 200, { data }, session);
  } catch {
    return reply(res, 503, { error: { code: 'LEAD_UNAVAILABLE', message: 'Lead details could not be loaded.' } }, session);
  }
};
