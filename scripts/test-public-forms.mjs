import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const submit = require('../api/submit.js');
const status = require('../api/status.js');
const ownerLogin = require('../lib/server/owner-api/login.js');
const ownerLeads = require('../lib/server/owner-api/lead-list.js');
const ownerExport = require('../lib/server/owner-api/lead-export.js');
const ownerMfa = require('../lib/server/owner-api/mfa.js');
const cronSheets = require('../api/cron/sheets-sync.js');
function response() { return { headers: {}, code: 200, body: null, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
function withHeaders() { return { headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; }, send(body) { this.body = body; return this; } }; }
const request = (body, origin = 'https://thehookmedia.example') => ({ method: 'POST', headers: { host: 'thehookmedia.example', origin, 'content-type': 'application/json' }, body });
(async () => {
  const source = readFileSync(require.resolve('../api/submit.js'), 'utf8');
  const exposed = `${source.replace('module.exports = async function submit', 'module.exports = async function submit')}\nmodule.exports.validate = validate;`;
  const validationModule = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'console', exposed)(require, validationModule, validationModule.exports, process, console);
  const validate = validationModule.exports.validate;
  if (validate({ type: 'partners', name: 'A', email: 'bad', consent: true }).record) throw new Error('Invalid email must be rejected');
  const validInquiry = { type: 'partners', name: 'A', email: 'a@example.com', area: 'AI & automation, Web & apps', message: 'Build a site', phone: '+91 98765 43210', website: 'https://example.com', contactPreference: 'Email', consent: true };
  if (!validate(validInquiry).payload) throw new Error('Valid HookMedia project inquiry must be accepted and mapped to secure storage');
  if (!validate({ ...validInquiry, phone: '' }).error) throw new Error('A phone number must be required for every inquiry');
  const career = validate({ type: 'talent', name: 'Taylor', email: 'taylor@example.com', phone: '+91 98765 43210', consent: true, role: 'Designer', skills: 'Brand systems', motivation: 'I would like to collaborate.', linkedin: 'https://linkedin.com/in/taylor', portfolio: 'https://example.com/work', availability: 'Part time', engagement: 'Freelance' });
  if (!career.payload || career.payload.type !== 'partners' || !career.payload.area.includes('Designer') || !career.payload.message.includes('Brand systems') || career.payload.phone !== '+91 98765 43210') throw new Error('Career interest details must be retained in the owner lead record');
  const csv = ownerExport.toCsv([{ id: 'lead-1', public_reference: 'HM-1', created_at: '2026-01-01T00:00:00Z', full_name: '=2+2', email_normalized: 'a@example.com', phone: '+91 98765 43210', service_areas: 'AI automation', project_description: 'Build an agent', consent_version: 'privacy-v1', consented_at: '2026-01-01T00:00:00Z' }]);
  if (!csv.includes('"Lead ID","Reference","Received (UTC)","Name","Email","Phone"') || !csv.includes('"lead-1"') || !csv.includes("\"'=2+2\"") || !csv.includes('"AI automation"') || !csv.includes('"privacy-v1"')) throw new Error('CSV export must include contact, service, consent and formula-safe data');
  if (!validate({ ...validInquiry, website: 'http://example.com' }).error) throw new Error('Non-HTTPS website must be rejected');
  if (!validate({ ...validInquiry, phone: 'not a number' }).error) throw new Error('Malformed phone number must be rejected');
  if (!validate({ ...validInquiry, companyWebsite: 'spam.example' }).error) throw new Error('Filled honeypot must be rejected');
  if (!validate({ ...validInquiry, contactPreference: 'Telegram' }).error) throw new Error('Unknown contact preference must be rejected');
  const verifiedFactor = { id: 'verified-factor', factor_type: 'totp', status: 'verified' };
  const pendingFactor = { id: 'pending-factor', factor_type: 'totp', status: 'unverified' };
  if (ownerMfa.selectAvailableTotpFactor([verifiedFactor], verifiedFactor.id) !== verifiedFactor) throw new Error('An existing verified authenticator must be accepted for MFA verification');
  if (ownerMfa.selectAvailableTotpFactor([pendingFactor], pendingFactor.id) !== pendingFactor) throw new Error('A pending authenticator must be accepted for MFA verification');
  if (ownerMfa.selectAvailableTotpFactor([{ ...verifiedFactor, factor_type: 'webauthn' }], verifiedFactor.id)) throw new Error('Non-TOTP factors must not be used for authenticator verification');
  delete process.env.GOOGLE_SHEETS_WEB_APP_URL; delete process.env.GOOGLE_SHEETS_SECRET;
  const unavailable = response(); status({ method: 'GET' }, unavailable);
  if (unavailable.body.ready !== false) throw new Error('Unconfigured production storage must remain unavailable');
  const method = response(); await submit({ method: 'GET', headers: {} }, method);
  if (method.code !== 405) throw new Error('Non-POST submission must be rejected');
  const wrongOrigin = response(); await submit(request({}, 'https://attacker.example'), wrongOrigin);
  if (wrongOrigin.code !== 403) throw new Error('Cross-origin submission must be rejected');
  for (const [handler, req, expected, label] of [
    [ownerLogin, { method: 'POST', headers: { host: 'thehookmedia.example', origin: 'https://thehookmedia.example' }, body: {} }, 503, 'unconfigured owner login'],
    [ownerLeads, { method: 'GET', headers: {}, query: {} }, 503, 'unconfigured owner lead list'],
    [ownerExport, { method: 'GET', headers: {}, query: {} }, 503, 'unconfigured owner export'],
    [cronSheets, { method: 'POST', headers: {} }, 401, 'unauthorized Sheets cron']
  ]) {
    const res = withHeaders(); await handler(req, res);
    if (res.code !== expected) throw new Error(`${label} should fail closed with HTTP ${expected}, received ${res.code}`);
  }
  console.log('Inquiry validation, disabled-storage status, HTTP method, and origin checks verified.');
})();
