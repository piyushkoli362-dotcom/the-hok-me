# The HookMedia website and owner workspace

This is the existing static HTML/CSS/vanilla JavaScript site with Vercel serverless APIs. The homepage follows the supplied Stitch screen under `design-reference/stitch-export/`. The first protected owner slice manages project inquiries; it is not yet a full client/project/task/CMS platform.

## Run locally

Run `npm run dev` and open `http://localhost:3000`. The local server binds to `127.0.0.1`. A valid public inquiry in the local preview is written to the ignored `outputs/` directory as a private JSONL record and Excel workbook. Do not use real customer data in development. Local-only inquiry storage is separate from the production Postgres flow.

To exercise the protected workspace against a non-production Supabase project, copy `.env.example` to `.env.local`, add that project's values, and apply the migrations. Never use production records or add `.env.local` to Git. The owner page is `/owner.html`; without valid setup it fails closed and shows a configuration/authentication error.

Three.js and Google Fonts load from public CDNs. The hero keeps its CSS fallback if WebGL or the Three.js CDN is unavailable.

## Checks and build

Run `npm run check` and `npm run build`; build output is `dist/`. Set `SITE_URL` to the verified production HTTPS origin before release to generate canonical metadata and a sitemap. Vercel functions remain under `api/`.

## Supabase setup: PostgreSQL, Auth and RLS

The migration `supabase/migrations/202610250001_owner_leads.sql` creates owner/admin roles, private leads/notes/activity/audit tables, an atomic lead-plus-Sheets-outbox insert, privacy-minimised rate-limit hashes, and RLS policies. PostgreSQL is the authoritative lead store. The public visitor cannot read lead rows or call the write RPC directly; the server validates the form and calls the narrowly scoped RPC using a server-only service key. Owner APIs use the signed-in user's cookie session and RLS.

Follow `docs/owner-workspace-setup.md` to apply the migration, create the first Auth user without public signup, grant the owner role, configure environment values and test TOTP sign-in. No real Supabase project credentials are stored here. Do not claim the dashboard is live until its migration and authenticated positive/negative RLS tests have passed in that project.

## Owner workspace scope

The current first slice has owner/admin login, required TOTP verification, database-backed inquiry counts and paginated search/filter, lead detail, status/follow-up updates, private notes, audited CSV export and Sheets queue health/manual retry. Every data route requires a valid Supabase session and owner/admin role, with RLS as a second boundary. No owner credentials or public role creation are included. Client/project/task management, invitations, CMS and quotations remain separate backlog phases.

## Google Sheets (optional copy)

Sheets is a secondary, idempotent mirror. A lead is saved in PostgreSQL with an outbox event first; provider failure does not lose or hide the inquiry. `google-sheets/Code.gs` updates an existing row by lead ID, so a timeout/retry does not append duplicates. The private Apps Script deployment, spreadsheet, script property and Vercel secrets must be configured separately. See the setup guide. The scheduled Vercel sync runs once daily to remain compatible with Hobby plans; an authorised owner may trigger a manual batch from the dashboard. Vercel Cron jobs run on production deployments only and use `CRON_SECRET` for request authentication.

## Content and brand

Design tokens for backgrounds, surfaces, typography, lime accent, borders, radii and motion are centralized in `brand-tokens.css`. Portfolio tiles are labelled concept studies rather than client work. No unverified clients, testimonials, awards or results are asserted. Privacy copy, actual business entity and retention contact still require owner/legal review before a public launch.
# SEO deployment URL

`SITE_URL` is the canonical HTTPS origin used by the production build, service-page metadata, and XML sitemap. It defaults to `https://the-hok-me.vercel.app`; set it to the verified production origin when deploying under a different domain. Do not set it to localhost, a preview URL, or a path. The Google Search Console verification file `google0a9687274ca52e4f.html` is copied into every build and must remain in the repository.
