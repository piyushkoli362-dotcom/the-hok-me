# Deployment, Environment and Release Runbook

## 1. Environments
Recommended:
- Local development: local app + local/test database project or isolated schema.
- Preview/staging: separate Supabase project and non-production integrations.
- Production: separate project, restricted keys, controlled migrations and monitoring.

Do not point a preview deployment at the production database by default. Restrict who can access preview deployments containing real data.

## 2. Environment variable inventory
Use `.env.example` with placeholders only. Validate required variables and never commit real `.env` files.

Example names to adapt to the chosen SDK/version:
```dotenv
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
GOOGLE_SHEETS_SPREADSHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=
EMAIL_PROVIDER_API_KEY=
EMAIL_FROM_ADDRESS=
RATE_LIMIT_PROVIDER_URL=
RATE_LIMIT_PROVIDER_TOKEN=
CAPTCHA_SECRET_KEY=
NEXT_PUBLIC_CAPTCHA_SITE_KEY=
ANALYTICS_ID=
ERROR_MONITORING_DSN=
```
Only define variables actually used. Prefer the current provider's supported publishable/secret key naming. A server-only key must never use a `NEXT_PUBLIC_` prefix. Avoid persisting OAuth tokens in plain text; use the provider/hosting secret store or a reviewed encrypted token design.

## 3. Local setup
1. Install the supported Node.js LTS version and package manager specified by the repository.
2. Install dependencies using the lockfile-aware command.
3. Copy `.env.example` to `.env.local` and supply non-production credentials.
4. Apply database migrations to development.
5. Create a local-only seed dataset labelled as demo data.
6. Bootstrap an owner account through the documented trusted process.
7. Run lint, type checks, unit/integration tests and app locally.
8. Verify that no missing optional integration prevents core inquiry capture.

## 4. CI/CD
Suggested pipeline:
1. Install dependencies reproducibly.
2. Run formatting/lint, TypeScript and unit tests.
3. Scan dependencies and repository for secrets.
4. Validate migration files and execute database/RLS tests in a disposable database.
5. Build production bundle and scan public assets for accidental secrets.
6. Deploy preview and run smoke/E2E tests.
7. Require approval for production deployment and production migration.
8. Run post-deployment smoke tests and monitor error rate.

## 5. Production release checklist
- [ ] Correct production project and domain configured.
- [ ] DNS and HTTPS confirmed.
- [ ] Production secret variables configured in hosting secret store.
- [ ] No demo seed data accidentally loaded.
- [ ] Owner account bootstrapped securely and MFA enabled/configured.
- [ ] RLS and authorization tests pass against production-like schema.
- [ ] Database backup completed before risky migration.
- [ ] Migration reviewed, tested and recorded.
- [ ] Public inquiry, owner login, lead list and core APIs smoke-tested.
- [ ] Optional integration status is truthful and documented.
- [ ] Privacy and terms reviewed for actual business/jurisdiction.
- [ ] Monitoring, error alerting and support contact configured.
- [ ] Rollback/recovery owner assigned.

## 6. Migration and rollback
- Prefer backward-compatible changes: add nullable column/table first, deploy code that supports it, backfill, then tighten constraint in a later release.
- Do not assume an application rollback reverses a database migration safely.
- Before destructive changes, take a provider-supported backup and test restoration when practical.
- Record migration ID, commit, approver, start/end time and post-check results.
- Roll back application code if needed; use a deliberate forward-fix or tested database restoration strategy for schema/data issues.

## 7. Monitoring
Track:
- Request rate, latency and 4xx/5xx by route.
- Inquiry insert failures and rate-limit hits.
- Auth failures and anomalous role-change events.
- Outbox pending age, retry count and permanent failures.
- Storage upload failures.
- Database connection/usage/backup status according to provider plan.

Logs should not include credentials, session tokens, full message bodies or unnecessary personal data.

## 8. Cost and scale hygiene
- Start with minimal managed plans appropriate for expected traffic, and monitor usage/limits.
- Set budget/usage alerts where provider supports them.
- Use pagination and indexes before introducing additional infrastructure.
- Do not buy extra services until measurement demonstrates the need.
