const { createRequestClient, isSupabaseConfigured, reply, sameOrigin } = require('../supabase');

module.exports = async function ownerLogout(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (!sameOrigin(req)) return reply(res, 403, { error: { code: 'ORIGIN_REJECTED', message: 'Request origin could not be verified.' } });
  if (!isSupabaseConfigured()) return reply(res, 200, { signedOut: true });
  let session;
  try {
    session = createRequestClient(req, res);
    await session.client.auth.signOut();
    return reply(res, 200, { signedOut: true }, session);
  } catch {
    return reply(res, 503, { error: { code: 'SIGN_OUT_UNAVAILABLE', message: 'Sign-out could not be confirmed.' } }, session);
  }
};
