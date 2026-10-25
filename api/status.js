const { createClient } = require('@supabase/supabase-js');
const { sheetsConfigured: sheetConfigured } = require('../lib/server/sheets-sync');
const { supabasePublicKey, supabaseSecretKey } = require('../lib/server/supabase');

module.exports = async function status(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  if (!process.env.SUPABASE_URL || !supabasePublicKey() || !supabaseSecretKey() || (process.env.RATE_LIMIT_HASH_SECRET || '').length < 32) return res.status(200).json({ ready: false, sheetsReady: sheetConfigured() });
  try {
    const client = createClient(process.env.SUPABASE_URL, supabasePublicKey(), { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.rpc('public_health_check');
    return res.status(200).json({ ready: !error && data === true, sheetsReady: sheetConfigured() });
  } catch {
    return res.status(200).json({ ready: false, sheetsReady: sheetConfigured() });
  }
};
