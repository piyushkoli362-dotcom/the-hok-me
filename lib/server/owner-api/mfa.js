const { createRequestClient, createAdminClient, isSupabaseConfigured, requireLeadManager, reply, sameOrigin } = require('../supabase');

function selectAvailableTotpFactor(factors, factorId) {
  return (factors || []).find(factor => factor.factor_type === 'totp' && ['verified','unverified'].includes(factor.status) && factor.id === factorId) || null;
}

module.exports = async function ownerMfa(req, res) {
  if (!['GET','POST'].includes(req.method)) return reply(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  if (req.method === 'POST' && !sameOrigin(req)) return reply(res, 403, { error: { code: 'ORIGIN_REJECTED', message: 'Request origin could not be verified.' } });
  if (!isSupabaseConfigured()) return reply(res, 503, { error: { code: 'AUTH_NOT_CONFIGURED', message: 'Owner access is not configured yet.' } });
  let session;
  try {
    session = createRequestClient(req, res);
    const access = await requireLeadManager(session.client, { allowMfaStep: true });
    if (access.error) return reply(res, access.error.status, { error: access.error }, session);
    if (req.method === 'GET') {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: access.user.id });
      if (error) return reply(res, 503, { error: { code: 'MFA_UNAVAILABLE', message: 'Multi-factor setup could not be loaded.' } }, session);
      const totp = (data?.factors || []).filter(factor => factor.factor_type === 'totp').map(factor => ({ id: factor.id, friendlyName: factor.friendly_name || 'Authenticator app', status: factor.status }));
      return reply(res, 200, { factors: totp.filter(factor => factor.status === 'verified'), pending: totp.find(factor => factor.status === 'unverified') || null }, session);
    }
    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (body.action === 'cancel-pending') {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.mfa.listFactors({ userId: access.user.id });
      if (error) return reply(res, 503, { error: { code: 'MFA_UNAVAILABLE', message: 'Authenticator setup could not be loaded.' } }, session);
      for (const factor of data?.factors || []) {
        if (factor.factor_type === 'totp' && factor.status === 'unverified') {
          const { error: removeError } = await admin.auth.admin.mfa.deleteFactor({ id: factor.id, userId: access.user.id });
          if (removeError) return reply(res, 503, { error: { code: 'MFA_RESET_FAILED', message: 'Pending authenticator setup could not be reset.' } }, session);
        }
      }
      return reply(res, 200, { reset: true }, session);
    }
    if (body.action === 'enroll') {
      const friendlyName = `The HookMedia owner ${Date.now().toString(36).slice(-6)}`;
      const { data, error } = await session.client.auth.mfa.enroll({ factorType: 'totp', friendlyName });
      if (error || !data?.id || !data?.totp?.qr_code || !data?.totp?.secret) {
        return reply(res, 503, { error: { code: 'MFA_ENROLL_FAILED', message: 'Authenticator setup could not be started.' } }, session);
      }
      return reply(res, 201, { factor: { id: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri } }, session);
    }
    if (body.action === 'verify') {
      const factorId = typeof body.factorId === 'string' ? body.factorId : '';
      const code = typeof body.code === 'string' ? body.code.replace(/\s/g, '') : '';
      if (!factorId || !/^\d{6,8}$/.test(code)) return reply(res, 400, { error: { code: 'INVALID_MFA_CODE', message: 'Enter the current authenticator code.' } }, session);
      const admin = createAdminClient();
      const { data: factors, error: listError } = await admin.auth.admin.mfa.listFactors({ userId: access.user.id });
      if (listError) return reply(res, 503, { error: { code: 'MFA_UNAVAILABLE', message: 'Authenticator factors could not be loaded.' } }, session);
      const target = selectAvailableTotpFactor(factors?.factors, factorId);
      if (!target) {
        return reply(res, 403, { error: { code: 'INVALID_MFA_FACTOR', message: 'That authenticator setup is not available for this account.' } }, session);
      }
      const { error } = await session.client.auth.mfa.challengeAndVerify({ factorId: target.id, code });
      if (error) return reply(res, 401, { error: { code: 'MFA_VERIFICATION_FAILED', message: 'The code could not be verified. Try the current code again.' } }, session);
      return reply(res, 200, { verified: true }, session);
    }
    return reply(res, 400, { error: { code: 'INVALID_MFA_ACTION', message: 'Choose a supported authenticator action.' } }, session);
  } catch {
    return reply(res, 503, { error: { code: 'MFA_UNAVAILABLE', message: 'Multi-factor setup could not be completed.' } }, session);
  }
};

module.exports.selectAvailableTotpFactor = selectAvailableTotpFactor;
