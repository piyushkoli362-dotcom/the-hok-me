const handlers = {
  login: require('../../lib/server/owner-api/login'),
  logout: require('../../lib/server/owner-api/logout'),
  session: require('../../lib/server/owner-api/session'),
  mfa: require('../../lib/server/owner-api/mfa'),
  dashboard: require('../../lib/server/owner-api/dashboard'),
  integrations: require('../../lib/server/owner-api/integrations'),
  'sheets-sync': require('../../lib/server/owner-api/sheets-sync'),
  leads: require('../../lib/server/owner-api/lead-list'),
  'leads/export': require('../../lib/server/owner-api/lead-export')
};

module.exports = async function ownerApi(req, res) {
  let path;
  try { path = decodeURIComponent(new URL(req.url, `https://${req.headers.host || 'localhost'}`).pathname).replace(/\/$/, ''); }
  catch { return res.status(400).json({ error: { code: 'INVALID_URL', message: 'Invalid request path.' } }); }
  const prefix = '/api/owner/';
  if (!path.startsWith(prefix)) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
  const route = path.slice(prefix.length);
  let handler = handlers[route];
  const lead = route.match(/^leads\/([^/]+)$/);
  const notes = route.match(/^leads\/([^/]+)\/notes$/);
  if (notes) { handler = require('../../lib/server/owner-api/lead-notes'); req.query = { ...req.query, id: notes[1] }; }
  else if (lead && lead[1] !== 'export') { handler = require('../../lib/server/owner-api/lead-detail'); req.query = { ...req.query, id: lead[1] }; }
  if (!handler) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found.' } });
  const params = Object.fromEntries(new URL(req.url, `https://${req.headers.host || 'localhost'}`).searchParams.entries());
  req.query = { ...params, ...req.query };
  return handler(req, res);
};
