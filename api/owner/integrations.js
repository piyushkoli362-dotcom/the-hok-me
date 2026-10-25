const { createRequestClient, isSupabaseConfigured, requireLeadManager, reply } = require('../../lib/server/supabase');
const { sheetsConfigured } = require('../../lib/server/sheets-sync');

module.exports = async function ownerIntegrations(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (!isSupabaseConfigured()) return reply(res, 503, { error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Owner workspace storage is not configured.' } });
  let session;
  try {
    session = createRequestClient(req, res);
    const access = await requireLeadManager(session.client);
    if (access.error) return reply(res, access.error.status, { error: access.error }, session);
    const { data: syncCounts, error } = await session.client.rpc('owner_sheets_sync_counts');
    if (error) return reply(res, 503, { error: { code: 'INTEGRATION_STATUS_UNAVAILABLE', message: 'Integration status could not be loaded.' } }, session);
    return reply(res, 200, { sheets: { configured: sheetsConfigured(), counts: syncCounts || {} } }, session);
  } catch {
    return reply(res, 503, { error: { code: 'INTEGRATION_STATUS_UNAVAILABLE', message: 'Integration status could not be loaded.' } }, session);
  }
};
