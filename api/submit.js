const { randomUUID } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const { createHmac } = require('node:crypto');
const { supabaseSecretKey } = require('../lib/server/supabase');

const clean = (value, max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const emailOkay = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
const urlOkay = value => {
  if (!value) return true;
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
};

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { error: 'Invalid submission.' };
  if (!['partners','talent'].includes(body.type)) return { error: 'This inquiry form is not supported by the secure intake yet.' };
  if (clean(body.companyWebsite)) return { error: 'Submission rejected.' };
  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const phone = clean(body.phone, 30);
  if (!name || !emailOkay(email) || !/^[+()\d .-]{7,30}$/.test(phone) || body.consent !== true) return { error: 'Enter your name, valid email, phone number and consent.' };
  const record = { id: randomUUID(), submittedAt: new Date().toISOString(), type: body.type, name, email, phone, consent: true };
  if (body.type === 'partners') {
    const area = clean(body.area, 260), message = clean(body.message, 3000);
    if (!area || !message) return { error: 'Choose at least one service and add a project summary.' };
    const website = clean(body.website, 500);
    if (!urlOkay(website)) return { error: 'Website or social profile must use a valid HTTPS URL.' };
    const contactPreference = clean(body.contactPreference, 40);
    if (contactPreference && !['Email', 'Phone', 'WhatsApp'].includes(contactPreference)) return { error: 'Select a valid contact preference.' };
    const organization = clean(body.organization, 160), budget = clean(body.budget, 80);
    Object.assign(record, { organization, area, message, website, budget, contactPreference });
    return { record, payload: { type: 'partners', name, email, phone, consent: true, organization, area, message, website, budget, contactPreference } };
  }
  const role = clean(body.role, 120), motivation = clean(body.motivation, 1200);
  const skills = clean(body.skills, 800), linkedin = clean(body.linkedin, 300), portfolio = clean(body.portfolio, 300);
  const availability = clean(body.availability, 100), engagement = clean(body.engagement, 100);
  if (!role || !motivation || ![linkedin, portfolio].every(urlOkay)) return { error: 'Enter an interest area, motivation and valid HTTPS links.' };
  const area = `Career / collaboration · ${role}`;
  const message = [`Motivation: ${motivation}`, skills && `Skills and experience: ${skills}`, linkedin && `LinkedIn: ${linkedin}`, portfolio && `Portfolio or GitHub: ${portfolio}`, availability && `Availability: ${availability}`, engagement && `Preferred engagement: ${engagement}`].filter(Boolean).join('\n');
  Object.assign(record, { role, motivation, skills, linkedin, portfolio, availability, engagement, area, message });
  return { record, payload: { type: 'partners', name, email, phone, consent: true, area, message, website: portfolio || linkedin, organization: '', budget: '', contactPreference: '' } };
}

module.exports = async function submit(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  const origin = req.headers.origin;
  const host = req.headers.host;
  if (!origin || !host || origin !== `https://${host}`) return res.status(403).json({ error: 'Origin rejected.' });
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) return res.status(415).json({ error: 'JSON is required.' });
  if (Number(req.headers['content-length'] || 0) > 16_384 || JSON.stringify(req.body || '').length > 16_384) return res.status(413).json({ error: 'Submission is too large.' });
  const { record, payload, error } = validate(req.body);
  if (error) return res.status(400).json({ error });
  const url = process.env.SUPABASE_URL;
  const serviceKey = supabaseSecretKey();
  const hashSecret = process.env.RATE_LIMIT_HASH_SECRET;
  if (!url || !serviceKey || !hashSecret || hashSecret.length < 32) return res.status(503).json({ error: 'Online inquiries are not configured yet.' });
  try {
    const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(value => value.trim()).filter(Boolean);
    const address = String(req.headers['x-real-ip'] || forwarded.at(-1) || '').trim();
    if (!address) return res.status(503).json({ error: 'Inquiry protection is temporarily unavailable.' });
    const ipHash = createHmac('sha256', hashSecret).update(address).digest('hex');
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data: reference, error } = await supabase.rpc('submit_public_inquiry', { p_payload: payload, p_ip_hash: ipHash });
    if (error) {
      if (error.code === 'P0001') return res.status(429).json({ error: 'Please wait before submitting another inquiry.' });
      if (error.code === '22023') return res.status(400).json({ error: 'Please review your inquiry details and try again.' });
      throw new Error(`Database inquiry save failed (${error.code || 'unknown'}).`);
    }
    if (typeof reference !== 'string' || !/^HM-[A-F0-9]{24}$/.test(reference)) throw new Error('Database returned an invalid reference.');
    return res.status(201).json({ saved: true, reference });
  } catch (error) {
    console.error('Database inquiry save failed:', error.message);
    return res.status(503).json({ error: 'Could not save your inquiry. Please try again later.' });
  }
};
