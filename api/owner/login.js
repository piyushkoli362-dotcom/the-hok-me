const { createRequestClient, isSupabaseConfigured, requireLeadManager, reply, sameOrigin } = require('../../lib/server/supabase');

module.exports = async function login(req, res) {
  if (req.method !== 'POST') return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (!sameOrigin(req)) return reply(res, 403, { error: { code: 'ORIGIN_REJECTED', message: 'Request origin could not be verified.' } });
  if (!isSupabaseConfigured()) return reply(res, 503, { error: { code: 'AUTH_NOT_CONFIGURED', message: 'Owner access is not configured yet.' } });
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !password || password.length > 256) {
    return reply(res, 400, { error: { code: 'INVALID_CREDENTIALS', message: 'Enter a valid email and password.' } });
  }
  let session;
  try {
    session = createRequestClient(req, res);
    const { data, error } = await session.client.auth.signInWithPassword({ email, password });
    if (error || !data.user) return reply(res, 401, { error: { code: 'SIGN_IN_FAILED', message: 'Email or password could not be verified.' } }, session);
    const access = await requireLeadManager(session.client, { allowMfaStep: true });
    if (access.error && access.error.code !== 'MFA_REQUIRED') {
      await session.client.auth.signOut();
      return reply(res, access.error.status, { error: { code: 'SIGN_IN_FAILED', message: 'This account cannot access the owner workspace.' } }, session);
    }
    if (process.env.OWNER_REQUIRE_AAL2 !== 'false') {
      const { data: assurance, error: mfaError } = await session.client.auth.mfa.getAuthenticatorAssuranceLevel();
      if (mfaError) return reply(res, 503, { error: { code: 'MFA_CHECK_UNAVAILABLE', message: 'Multi-factor status could not be verified.' } }, session);
      if (assurance?.currentLevel !== 'aal2') return reply(res, 200, { authenticated: true, mfaRequired: true }, session);
    }
    if (access.error?.code === 'MFA_REQUIRED') return reply(res, 200, { authenticated: true, mfaRequired: true }, session);
    return reply(res, 200, { authenticated: true, user: { email: data.user.email }, roles: access.roles }, session);
  } catch (error) {
    if (error.message === 'SUPABASE_NOT_CONFIGURED') return reply(res, 503, { error: { code: 'AUTH_NOT_CONFIGURED', message: 'Owner access is not configured yet.' } });
    console.error('Owner sign-in failed.');
    return reply(res, 503, { error: { code: 'AUTH_UNAVAILABLE', message: 'Sign-in is temporarily unavailable.' } }, session);
  }
};
