import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const root = process.cwd();
const port = Number(process.env.PORT || 3000);
for (const filename of ['.env.local', '.env']) {
  const envFile = path.join(root, filename);
  if (!fs.existsSync(envFile)) continue;
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || Object.hasOwn(process.env, match[1])) continue;
    const value = match[2].replace(/^(['"])(.*)\1$/, '$2');
    process.env[match[1]] = value;
  }
}
const dataDir = path.resolve(process.env.CROPTERA_DATA_DIR || path.join(root, 'outputs', '01a14bb4-619f-7b02-956a-0d044f0b2e4b'));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg' };
const publicFiles = new Set(['index.html', 'careers.html', 'privacy.html', 'updates.html', '404.html', 'owner.html', 'owner.css', 'owner.js', 'brand-tokens.css', 'styles.css', 'showcase.css', 'script.js', 'robots.txt']);
const apiHandlers = new Map([
  ['/api/status', require('../api/status.js')], ['/api/owner/login', require('../api/owner/login.js')],
  ['/api/owner/logout', require('../api/owner/logout.js')], ['/api/owner/session', require('../api/owner/session.js')],
  ['/api/owner/mfa', require('../api/owner/mfa.js')], ['/api/owner/dashboard', require('../api/owner/dashboard.js')],
  ['/api/owner/leads', require('../api/owner/leads.js')], ['/api/owner/integrations', require('../api/owner/integrations.js')],
  ['/api/owner/sheets-sync', require('../api/owner/sheets-sync.js')], ['/api/owner/leads/export', require('../api/owner/leads/export.js')],
  ['/api/cron/sheets-sync', require('../api/cron/sheets-sync.js')]
]);
const rateLimits = new Map();
let submissionQueue = Promise.resolve();

function send(res, code, data) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
}
async function dispatchApi(req, res, pathname, searchParams) {
  let handler = apiHandlers.get(pathname), params = {};
  const noteMatch = pathname.match(/^\/api\/owner\/leads\/([^/]+)\/notes$/);
  const leadMatch = pathname.match(/^\/api\/owner\/leads\/([^/]+)$/);
  if (!handler && noteMatch) { handler = require('../api/owner/leads/[id]/notes.js'); params.id = decodeURIComponent(noteMatch[1]); }
  if (!handler && leadMatch) { handler = require('../api/owner/leads/[id].js'); params.id = decodeURIComponent(leadMatch[1]); }
  if (!handler) return false;
  let body;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: { code: 'JSON_REQUIRED', message: 'JSON is required.' } });
    let raw = '';
    try { for await (const chunk of req) { raw += chunk; if (raw.length > 16_384) return send(res, 413, { error: { code: 'TOO_LARGE', message: 'Request is too large.' } }); } body = JSON.parse(raw); }
    catch { return send(res, 400, { error: { code: 'INVALID_JSON', message: 'Invalid JSON.' } }); }
  }
  const query = Object.fromEntries(searchParams.entries()); Object.assign(query, params);
  const apiRequest = Object.assign(req, { body, query });
  const apiResponse = {
    status(code) { res.statusCode = code; return this; },
    setHeader(name, value) { res.setHeader(name, value); },
    json(payload) { if (!res.headersSent) res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(payload)); return this; },
    send(payload) { res.end(payload); return this; }
  };
  try { await handler(apiRequest, apiResponse); }
  catch (error) { console.error('Local API handler failed:', error.message); if (!res.headersSent) send(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'The request could not be completed.' } }); }
  return true;
}
function clean(value, max = 300) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function emailOkay(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254; }
function urlOkay(value) { if (!value) return true; try { return new URL(value).protocol === 'https:'; } catch { return false; } }
function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid submission.' };
  const type = body.type;
  if (!['farmers', 'partners', 'talent'].includes(type)) return { error: 'Unknown form type.' };
  if (clean(body.companyWebsite)) return { error: 'Submission rejected.' };
  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  if (!name || !emailOkay(email) || body.consent !== true) return { error: 'Name, valid email and consent are required.' };
  const record = { id: randomUUID(), submittedAt: new Date().toISOString(), type, name, email, consent: true };
  if (type === 'farmers') Object.assign(record, { state: clean(body.state, 80), district: clean(body.district, 80), category: clean(body.category, 80) });
  if (type === 'partners') {
    const area = clean(body.area, 260), message = clean(body.message, 3000);
    if (!area || !message) return { error: 'Collaboration area and message are required.' };
    const website = clean(body.website, 500);
    if (!urlOkay(website)) return { error: 'Website or social profile must use a valid HTTPS URL.' };
    const phone = clean(body.phone, 30);
    if (phone && !/^[+()\d .-]{7,30}$/.test(phone)) return { error: 'Enter a valid phone number.' };
    const contactPreference = clean(body.contactPreference, 40);
    if (contactPreference && !['Email', 'Phone', 'WhatsApp'].includes(contactPreference)) return { error: 'Select a valid contact preference.' };
    Object.assign(record, { organization: clean(body.organization, 160), area, message, phone, website, budget: clean(body.budget, 80), contactPreference });
  }
  if (type === 'talent') {
    const role = clean(body.role, 120), motivation = clean(body.motivation, 3000);
    const linkedin = clean(body.linkedin, 500), portfolio = clean(body.portfolio, 500), resume = clean(body.resume, 500);
    if (!role || !motivation || ![linkedin, portfolio, resume].every(urlOkay)) return { error: 'Interest area, motivation and valid HTTPS links are required.' };
    Object.assign(record, { role, motivation, skills: clean(body.skills, 3000), linkedin, portfolio, resume, availability: clean(body.availability, 200), engagement: clean(body.engagement, 100) });
  }
  return { record };
}
function exportWorkbook() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, 'scripts', 'export-submissions.mjs')], { cwd: root, env: { ...process.env, CROPTERA_DATA_DIR: dataDir }, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
    let errors = '';
    child.stderr.on('data', chunk => { errors += chunk.toString().slice(0, 3000); });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(errors || `Excel export exited ${code}`)));
  });
}
async function handleSubmission(req, res) {
  const origin = req.headers.origin;
  if (origin && origin !== `http://localhost:${port}` && origin !== `http://127.0.0.1:${port}`) return send(res, 403, { error: 'Origin rejected.' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return send(res, 415, { error: 'JSON is required.' });
  const now = Date.now();
  const recent = (rateLimits.get(req.socket.remoteAddress) || []).filter(time => now - time < 60_000);
  if (recent.length >= 5) return send(res, 429, { error: 'Please wait before submitting again.' });
  let raw = '';
  try {
    for await (const chunk of req) { raw += chunk; if (raw.length > 16_384) return send(res, 413, { error: 'Submission is too large.' }); }
    const parsed = validate(JSON.parse(raw));
    if (parsed.error) return send(res, 400, { error: parsed.error });
    recent.push(now); rateLimits.set(req.socket.remoteAddress, recent);
    const task = submissionQueue.then(async () => {
      await fsp.mkdir(dataDir, { recursive: true });
      await fsp.appendFile(path.join(dataDir, 'submissions.jsonl'), `${JSON.stringify(parsed.record)}\n`, { encoding: 'utf8', mode: 0o600 });
      await exportWorkbook();
    });
    submissionQueue = task.catch(() => {});
    await task;
    return send(res, 201, { saved: true, id: parsed.record.id });
  } catch (error) {
    console.error('Submission storage failed:', error.message);
    return send(res, 503, { error: 'Could not confirm Excel storage. Please contact the project before trying again.' });
  }
}
function serveStatic(pathname, res) {
  const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  if (!publicFiles.has(relative) && !/^assets\/[a-zA-Z0-9._-]+\.(?:png|jpg|svg)$/.test(relative)) {
    const errorPage = path.join(root, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'X-Content-Type-Options': 'nosniff' });
    return fs.createReadStream(errorPage).pipe(res);
  }
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'Not found.' });
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' });
  fs.createReadStream(file).pipe(res);
}
http.createServer(async (req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { return send(res, 400, { error: 'Invalid URL.' }); }
  if (pathname === '/api/submit' && req.method === 'POST') return void handleSubmission(req, res);
  const requestUrl = new URL(req.url, 'http://localhost');
  if (pathname.startsWith('/api/') && await dispatchApi(req, res, pathname, requestUrl.searchParams)) return;
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, { error: 'Method not allowed.' });
  serveStatic(pathname, res);
}).listen(port, '127.0.0.1', () => console.log(`The HookMedia local site and private Excel storage: http://localhost:${port}`));

