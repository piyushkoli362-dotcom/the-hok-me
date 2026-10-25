const { createRequestClient, isSupabaseConfigured, requireLeadManager, reply } = require('../../lib/server/supabase');

module.exports = async function ownerSession(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (!isSupabaseConfigured()) return reply(res, 503, { error: { code: 'AUTH_NOT_CONFIGURED', message: 'Owner access is not configured yet.' } });
  let session;
  try {
    session = createRequestClient(req, res);
    const access = await requireLeadManager(session.client);
    if (access.error) return reply(res, access.error.status, { error: access.error }, session);
    return reply(res, 200, { authenticated: true, user: { email: access.user.email }, roles: access.roles }, session);
  } catch {
    return reply(res, 503, { error: { code: 'AUTH_UNAVAILABLE', message: 'Owner access is temporarily unavailable.' } }, session);
  }
};
