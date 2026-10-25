const { createServerClient, parseCookieHeader, serializeCookieHeader } = require('@supabase/ssr');
const { createClient } = require('@supabase/supabase-js');

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && supabasePublicKey());
}

function supabasePublicKey() { return process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY; }
function supabaseSecretKey() { return process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY; }

function createAdminClient() {
  const secretKey = supabaseSecretKey();
  if (!process.env.SUPABASE_URL || !secretKey) throw new Error('SUPABASE_ADMIN_NOT_CONFIGURED');
  return createClient(process.env.SUPABASE_URL, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
  });
}

function createRequestClient(req, res) {
  if (!isSupabaseConfigured()) throw new Error('SUPABASE_NOT_CONFIGURED');
  const pendingCookies = [];
  const secure = process.env.NODE_ENV === 'production';
  const client = createServerClient(process.env.SUPABASE_URL, supabasePublicKey(), {
    auth: { flowType: 'pkce', autoRefreshToken: true, persistSession: true, detectSessionInUrl: false },
    cookieOptions: { path: '/', sameSite: 'lax', secure, httpOnly: true },
    cookies: {
      getAll() { return parseCookieHeader(req.headers.cookie || ''); },
      setAll(cookies) {
        for (const { name, value, options = {} } of cookies) {
          pendingCookies.push(serializeCookieHeader(name, value, {
            ...options, path: options.path || '/', sameSite: options.sameSite || 'lax',
            httpOnly: true, secure: secure || options.secure === true
          }));
        }
      }
    }
  });
  return {
    client,
    commit() { if (pendingCookies.length) res.setHeader('Set-Cookie', pendingCookies); }
  };
}

async function requireLeadManager(client, { allowMfaStep = false } = {}) {
  const { data: { user } = {}, error: authError } = await client.auth.getUser();
  if (authError || !user) return { error: { status: 401, code: 'UNAUTHENTICATED', message: 'Please sign in.' } };
  const { data: roles, error: roleError } = await client.from('user_roles')
    .select('role').eq('user_id', user.id).is('revoked_at', null);
  if (roleError) return { error: { status: 503, code: 'AUTHORIZATION_UNAVAILABLE', message: 'Access could not be verified.' } };
  if (!roles?.some(({ role }) => role === 'owner' || role === 'admin')) {
    return { error: { status: 403, code: 'FORBIDDEN', message: 'This account cannot access the owner workspace.' } };
  }
  const mfaRequired = process.env.OWNER_REQUIRE_AAL2 !== 'false';
  if (mfaRequired && !allowMfaStep) {
    const { data: assurance, error: mfaError } = await client.auth.mfa.getAuthenticatorAssuranceLevel();
    if (mfaError) return { error: { status: 503, code: 'MFA_CHECK_UNAVAILABLE', message: 'Multi-factor status could not be verified.' } };
    if (assurance?.currentLevel !== 'aal2') return { error: { status: 403, code: 'MFA_REQUIRED', message: 'Complete multi-factor verification to continue.' } };
  }
  return { user, roles: roles.map(row => row.role) };
}

function reply(res, status, payload, session) {
  session?.commit();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  return res.status(status).json(payload);
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host) return false;
  try {
    const parsed = new URL(origin);
    const forwardedProto = req.headers['x-forwarded-proto'];
    const expectedProto = forwardedProto ? String(forwardedProto).split(',')[0].trim() : (process.env.NODE_ENV === 'production' ? 'https' : parsed.protocol.slice(0, -1));
    return parsed.host === host && parsed.protocol === `${expectedProto}:`;
  } catch { return false; }
}

module.exports = { createRequestClient, createAdminClient, isSupabaseConfigured, supabasePublicKey, supabaseSecretKey, requireLeadManager, reply, sameOrigin };
