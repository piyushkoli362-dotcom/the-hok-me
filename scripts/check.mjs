import fs from 'node:fs';
const pages = ['index.html','careers.html','privacy.html','updates.html','404.html','owner.html'];
for (const page of pages) {
  const html = fs.readFileSync(page,'utf8');
  for (const marker of ['<title>','name="description"','<h1','</main>','</html>']) if (!html.includes(marker)) throw new Error(`${page} missing ${marker}`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]+)"/g)) {
    const target = match[1].split(/[?#]/)[0];
    if (target && !fs.existsSync(`.${target}`)) throw new Error(`${page} broken local link: ${target}`);
  }
  const currentRoute = page === 'index.html' ? '/' : `/${page}`;
  for (const match of html.matchAll(/href="([^"]*#[^"]+)"/g)) {
    const url = new URL(match[1], `https://hookmedia.local${currentRoute}`);
    if (url.origin !== 'https://hookmedia.local') continue;
    const targetFile = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    if (!fs.existsSync(targetFile)) throw new Error(`${page} links to missing route: ${url.pathname}`);
    const targetHtml = fs.readFileSync(targetFile, 'utf8');
    const ids = new Set([...targetHtml.matchAll(/\bid="([^"]+)"/g)].map(id => id[1]));
    if (!ids.has(decodeURIComponent(url.hash.slice(1)))) throw new Error(`${page} links to missing anchor: ${match[1]}`);
  }
}
for (const file of ['brand-tokens.css','styles.css','showcase.css','script.js','owner.css','owner.js','robots.txt','assets/favicon.svg','assets/hookmedia-mark.svg','assets/hookmedia-social.svg','api/submit.js','api/status.js','api/owner/login.js','api/owner/session.js','api/owner/logout.js','api/owner/dashboard.js','api/owner/leads.js','api/owner/leads/[id].js','api/owner/leads/[id]/notes.js','api/owner/leads/export.js','api/owner/mfa.js','api/owner/integrations.js','api/owner/sheets-sync.js','api/cron/sheets-sync.js','lib/server/supabase.js','lib/server/sheets-sync.js','supabase/migrations/202610250001_owner_leads.sql','supabase/bootstrap-owner.sql.example','docs/owner-workspace-setup.md','google-sheets/Code.gs']) if (!fs.existsSync(file)) throw new Error(`Missing ${file}`);
const brand = fs.readFileSync('index.html', 'utf8');
for (const text of ['The HookMedia | Creative, Marketing &amp; AI Solutions', 'Hook Attention.', 'Build What’s Next.', 'id="services"', 'id="ai-intelligence"', 'id="inquiry"', 'threejs-container']) if (!brand.includes(text)) throw new Error(`Homepage missing Stitch/brand requirement: ${text}`);
if (/Croptera|croptera/.test(pages.map(page => fs.readFileSync(page, 'utf8')).join('\n'))) throw new Error('Legacy brand remains in public pages.');
const tokens = fs.readFileSync('brand-tokens.css', 'utf8');
for (const token of ['#0b0d0f','#15181b','#fff','#a5abb2','#c6ff4d','#30353a','Space Grotesk','Plus Jakarta Sans']) if (!tokens.toLowerCase().includes(token.toLowerCase())) throw new Error(`Missing HookMedia design token ${token}`);
const migration = fs.readFileSync('supabase/migrations/202610250001_owner_leads.sql', 'utf8');
for (const marker of ['enable row level security','submit_public_inquiry','claim_google_sheets_outbox','service_role','log_owner_lead_export']) if (!migration.toLowerCase().includes(marker.toLowerCase())) throw new Error(`Owner data migration missing security/lead capability: ${marker}`);
const careers = fs.readFileSync('script.js', 'utf8');
if (!careers.includes("form.dataset.form!=='partners'")) throw new Error('Unsupported career submissions must remain disabled.');
console.log('Public and owner pages, HookMedia metadata, central design tokens, local links, and lead security migration verified.');

