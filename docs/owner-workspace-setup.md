# Owner workspace setup

The owner area is built on the existing static/Vercel architecture. Supabase supplies Auth and PostgreSQL; server-side APIs use cookie sessions, verified users, owner/admin roles and RLS. No account may self-register for internal access.

## 1. Supabase development project

**What you need to do once:** Sign in to [Supabase](https://supabase.com/), create a project, and keep its database password in your password manager. In **Project Settings → API Keys**, copy the Project URL, publishable key, and secret key into a local `.env.local` based on `.env.example` as `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SECRET_KEY`. The secret key must remain server-only; do not prefix it with `NEXT_PUBLIC_`, place it in HTML/JavaScript, or paste it into chat/issues. This repository currently has no Supabase project URL or keys configured.

In Supabase **SQL Editor → New query**, open `supabase/migrations/202610250001_owner_leads.sql`, paste its contents and click **Run**. Keep the migration file as the source of truth. The migration creates only the first leads/auth/outbox slice; it does not create clients, projects, tasks, CMS or quotation tables.

Create a random `RATE_LIMIT_HASH_SECRET` of at least 32 bytes. The API HMACs the edge-provided client address; the raw address is not stored. Hashed entries expire after 24 hours. The public RPC is executable only by the server-only `service_role`, so a browser holding the public key cannot forge its own rate-limit identity or bypass the API validation.

## 2. Bootstrap the first owner

In Supabase **Authentication → Users → Add user**, create `bagulyapiyush@gmail.com` and set a new password directly in Supabase. Public signup is not implemented. Then in **SQL Editor → New query**, run `supabase/bootstrap-owner.sql.example` to assign that confirmed account the owner role. The script is already set to this email. The login form pre-fills this email only; passwords are never stored in the repository. Verify the one active `owner` role row.

Enable TOTP MFA in the Supabase Auth project. Owner/admin login in this app requires AAL2 by default. The first valid owner sign-in can enroll an authenticator, but that account receives access only after verifying the TOTP code. Keep recovery codes in the owner's approved password manager. Do not disable MFA for production.

## 3. Run the non-production app

Copy `.env.example` to `.env.local`, fill the development project values, and generate `RATE_LIMIT_HASH_SECRET` with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Then restart `npm run dev` and open `/owner.html`. Set a strong new password there matching the Auth user you created. Verify:

- No session shows only the login state; `/api/owner/leads` responds 401.
- An authenticated account without an active owner/admin role is denied.
- The owner can see real test inquiries, add a note, change status/follow-up, and export a CSV.
- The same user cannot directly insert role grants; the public role table is read-only for a user and only self-readable.
- Owner/admin APIs return no data after sign-out. Anonymous clients cannot read lead or note tables.
- A changed lead status/note and CSV export create private audit/activity records.

Use fake data in this isolated development project. This repository does not have a configured Supabase project or live database here, so migration application and RLS tests remain a required operator step before enabling the production form/dashboard.

## 4. Production hosting environment

Add server-side environment variables in Vercel separately for Preview and Production, then deploy the migration and code to a non-production project first:

- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (secret; server only)
- `RATE_LIMIT_HASH_SECRET` (random 32+ byte value)
- `OWNER_REQUIRE_AAL2=true`
- `CRON_SECRET` (random 16+ byte value for Vercel Cron)

The production inquiry form is enabled only when the service key, Supabase health RPC and rate-limit key are configured. Before migration/configuration it remains disabled and reports that secure storage is unavailable. Google Sheets is optional and is not required to accept/save a lead.

## 5. Optional private Google Sheets mirror

1. Create a private spreadsheet controlled by the agency; do not enable public sheet sharing.
2. Open its bound Apps Script project and deploy the updated `google-sheets/Code.gs` as a web app executing as the spreadsheet owner.
3. Run `setupSheets()` once. Add a long random `SHEET_WRITE_SECRET` in Apps Script **Script Properties**.
4. Configure Vercel `GOOGLE_SHEETS_WEB_APP_URL` with the deployed `/exec` URL and `GOOGLE_SHEETS_SECRET` with the matching value. Also configure `SUPABASE_SECRET_KEY` and `CRON_SECRET` for the outbox worker.
5. Use an isolated non-production spreadsheet and a fake inquiry first. Check that a duplicate retry updates the row with the same lead ID rather than appending another row.
6. Verify the spreadsheet stays private. The owner page reports missing configuration and sync failure counts without showing any secret.

Vercel Cron in this repository runs daily at 02:00 UTC (07:30 India time); an owner can request an immediate batch from the private dashboard. Vercel invokes configured Cron jobs for production deployments and sends the `CRON_SECRET` bearer header. Plans that support more frequent Cron schedules may use a shorter interval after that plan's limits are confirmed.

## Scope and release gate

This first slice is lead capture and owner lead management only. It is not a fully built multi-role agency ERP. Do not call it production-ready until the SQL migration is applied, the project's Auth/MFA settings are verified, anonymous and non-owner RLS-denial tests and authorized owner-flow tests pass, and production secrets are set in the hosting secret manager. The owner must still approve the privacy contact/retention details and the spreadsheet's actual sharing policy.
