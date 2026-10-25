const { timingSafeEqual } = require('node:crypto');
const { syncPendingSheetsRows } = require('../../lib/server/sheets-sync');

function safeEqual(left, right) {
  const a = Buffer.from(String(left || ''));
  const b = Buffer.from(String(right || ''));
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
function respond(res, status, body) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  return res.status(status).json(body);
}

module.exports = async function sheetsSync(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') return respond(res, 405, { error: 'Method not allowed.' });
  const secret = process.env.CRON_SECRET;
  if (!safeEqual(req.headers.authorization, `Bearer ${secret}`)) return respond(res, 401, { error: 'Unauthorized.' });
  try { return respond(res, 200, await syncPendingSheetsRows(10)); }
  catch { return respond(res, 503, { error: 'Sync queue could not be processed.' }); }
};
