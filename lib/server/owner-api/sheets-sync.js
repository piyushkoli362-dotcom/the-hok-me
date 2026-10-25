const { createRequestClient, isSupabaseConfigured, requireLeadManager, reply, sameOrigin } = require('../supabase');
const { syncPendingSheetsRows } = require('../sheets-sync');

module.exports = async function ownerSheetsSync(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (!sameOrigin(req)) return reply(res, 403, { error: { code: 'ORIGIN_REJECTED', message: 'Request origin could not be verified.' } });
  if (!isSupabaseConfigured()) return reply(res, 503, { error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Owner workspace storage is not configured.' } });
  let session;
  try {
    session = createRequestClient(req, res);
    const access = await requireLeadManager(session.client);
    if (access.error) return reply(res, access.error.status, { error: access.error }, session);
    if (req.body?.retryFailed === true) {
      const { error: retryError } = await session.client.rpc('retry_failed_sheets_sync');
      if (retryError) return reply(res, 503, { error: { code: 'RETRY_UNAVAILABLE', message: 'Failed rows could not be queued for retry.' } }, session);
    }
    const result = await syncPendingSheetsRows(10);
    if (!result.configured) return reply(res, 503, { error: { code: 'SHEETS_NOT_CONFIGURED', message: 'Google Sheets sync is not configured yet.' } }, session);
    return reply(res, 200, result, session);
  } catch {
    return reply(res, 503, { error: { code: 'SHEETS_SYNC_FAILED', message: 'Google Sheets sync could not be completed.' } }, session);
  }
};
