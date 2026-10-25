const { createClient } = require('@supabase/supabase-js');
const { supabaseSecretKey } = require('./supabase');

function sheetsConfigured() {
  return Boolean(
    process.env.SUPABASE_URL && supabaseSecretKey() && process.env.CRON_SECRET &&
    process.env.GOOGLE_SHEETS_WEB_APP_URL?.startsWith('https://script.google.com/macros/s/') &&
    process.env.GOOGLE_SHEETS_WEB_APP_URL?.endsWith('/exec') && process.env.GOOGLE_SHEETS_SECRET
  );
}

async function syncPendingSheetsRows(batchSize = 10) {
  if (!sheetsConfigured()) return { configured: false, processed: 0, succeeded: 0, failed: 0 };
  const admin = createClient(process.env.SUPABASE_URL, supabaseSecretKey(), { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  const { data: batch, error: claimError } = await admin.rpc('claim_google_sheets_outbox', { p_batch_size: batchSize });
  if (claimError) {
    console.error('Google Sheets outbox claim failed.');
    throw new Error('SYNC_QUEUE_UNAVAILABLE');
  }
  let processed = 0, succeeded = 0, failed = 0;
  for (const item of batch || []) {
    processed++;
    let accepted = false;
    try {
      const upstream = await fetch(process.env.GOOGLE_SHEETS_WEB_APP_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ secret: process.env.GOOGLE_SHEETS_SECRET, record: item.record }),
        signal: AbortSignal.timeout(15000), redirect: 'follow'
      });
      const result = await upstream.json();
      accepted = upstream.ok && result.saved === true && result.id === item.record.id;
    } catch { accepted = false; }
    const now = new Date().toISOString();
    let update;
    if (accepted) {
      update = { status: 'succeeded', last_error_code: null, processed_at: now, updated_at: now };
      succeeded++;
    } else {
      const terminal = item.attempt_count >= 5;
      const delayMinutes = Math.min(60, 2 ** Math.min(item.attempt_count, 6));
      update = {
        status: terminal ? 'permanent_failure' : 'retryable_failure', last_error_code: 'PROVIDER_UNCONFIRMED',
        next_attempt_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        processed_at: terminal ? now : null, updated_at: now
      };
      failed++;
    }
    const { error: updateError } = await admin.from('integration_outbox').update(update).eq('id', item.event_id);
    if (updateError) {
      console.error('Google Sheets outbox result could not be recorded.');
      throw new Error('SYNC_RESULT_UNAVAILABLE');
    }
  }
  return { configured: true, processed, succeeded, failed };
}

module.exports = { sheetsConfigured, syncPendingSheetsRows };
