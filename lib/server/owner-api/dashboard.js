const { createRequestClient, isSupabaseConfigured, requireLeadManager, reply } = require('../supabase');

module.exports = async function ownerDashboard(req, res) {
  if (req.method !== 'GET') return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (!isSupabaseConfigured()) return reply(res, 503, { error: { code: 'DATABASE_NOT_CONFIGURED', message: 'Owner workspace storage is not configured.' } });
  let session;
  try {
    session = createRequestClient(req, res);
    const access = await requireLeadManager(session.client);
    if (access.error) return reply(res, access.error.status, { error: access.error }, session);
    const [all, fresh, followups] = await Promise.all([
      session.client.from('leads').select('id', { count: 'exact', head: true }),
      session.client.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'new'),
      session.client.from('leads').select('id', { count: 'exact', head: true }).not('follow_up_at', 'is', null).lte('follow_up_at', new Date().toISOString()).not('status', 'in', '(won,lost)')
    ]);
    if (all.error || fresh.error || followups.error) return reply(res, 503, { error: { code: 'DASHBOARD_UNAVAILABLE', message: 'Dashboard data could not be loaded.' } }, session);
    return reply(res, 200, { counts: { leads: all.count || 0, newLeads: fresh.count || 0, followUpsDue: followups.count || 0 } }, session);
  } catch {
    return reply(res, 503, { error: { code: 'DASHBOARD_UNAVAILABLE', message: 'Dashboard data could not be loaded.' } }, session);
  }
};
