# Integrations, Privacy and Data Governance

## 1. Source of truth
PostgreSQL is authoritative for leads, clients, tasks, projects, quotations and CMS records. Google Sheets is an optional operational copy/export destination. Email is a notification channel, not the official record.

## 2. Google Sheets integration
### Setup steps
1. Create a private Google spreadsheet owned/controlled by the agency.
2. Configure Google Cloud API access and a service account or OAuth flow appropriate for the deployment.
3. Share only the target spreadsheet with the integration identity at the minimum required access level.
4. Store credentials in the hosting secret manager; never commit them to Git.
5. Configure spreadsheet ID and column mapping per environment.
6. Test with fake data in a separate test spreadsheet.
7. Verify access is not public and that unrelated Drive files are inaccessible.

### Suggested columns
`Lead Reference`, `Created At`, `Name`, `Email`, `Phone`, `Company`, `Website`, `Services`, `Budget Band`, `Timeline`, `Description Summary`, `Source`, `Status`, `Assigned To`, `Follow-up At`, `Sync Status`.

Only transfer columns with a defined business purpose. Consider omitting full description from Sheets if a reference link into the protected dashboard is sufficient.

### Reliability design
- Insert lead in PostgreSQL first.
- Create a durable outbox event in the same DB transaction when sync is enabled.
- Process event asynchronously/scheduled or via explicit owner retry action.
- Use the stable lead reference/idempotency key to find/update the existing row; do not append blindly on every retry.
- Record `pending`, `processing`, `succeeded`, `retryable_failure` or `permanent_failure`.
- Retry transient errors with bounded exponential backoff and jitter; make permanent permission/config errors visible.
- Provide a manual retry/reconciliation screen.
- Do not claim sync succeeded until API acknowledgement confirms success.

### Data protection
- Keep sheet private and limit collaborators.
- Avoid placing highly sensitive internal notes in Sheets.
- Use field masks/allowlisted columns.
- Handle provider quota responses and retries according to current API limits/documentation.
- Define deletion/update propagation if personal data must be corrected or deleted in the sheet.

## 3. Email notifications
- Use a verified sender/domain and environment-specific credentials.
- Store templates separately from business logic.
- Avoid including lead descriptions, private notes, quotation values or sensitive data unless necessary.
- Use generic alerts with a secure dashboard link when possible.
- Log provider message IDs/outcomes, not full secrets or tokens.
- When email credentials are absent, show “not configured” status; do not simulate successful delivery.

## 4. WhatsApp and Meta-related channels
- A `wa.me` link is only a click-to-chat link; it is not an automated messaging integration.
- Automated WhatsApp messages require supported official platform/API configuration and applicable consent/template rules.
- Meta Pixel/Analytics should be configurable, consent-aware where applicable, and must not be injected with secret data.
- Never promise that an ad account or campaign is connected merely because a settings toggle exists.

## 5. Data classification
| Class | Examples | Controls |
|---|---|---|
| Public | Published services, public portfolio, approved blog | Public read only; publishing workflow |
| Internal | Project plans, task assignments, non-public drafts | Authenticated role-limited access |
| Confidential | Lead details, client contact records, quotations, internal notes | Least privilege, audit, limited exports |
| Secret | API keys, service-role credentials, OAuth client secrets | Secret manager/env, never public DB or browser |
| Sensitive operational | Audit logs, account role changes, integration errors | Restricted read; minimise personal data; retention policy |

## 6. Data lifecycle and retention
The owner must approve a retention schedule before production. Suggested design questions:
- How long should unqualified inquiries remain active?
- What retention period applies to contracts/quotations/financial records?
- Which user requests trigger correction, export or deletion review?
- How are backups expired after deletion?
- When should ex-staff access be revoked and profile data archived?
- Which audit events must be retained for operational/security reasons?

Do not invent a universal retention period without checking business needs and applicable law. Deletion must account for related tables, integrations and backup limitations, and should be logged without unnecessarily preserving the data being deleted.

## 7. Consent and privacy notice
- Use a non-prechecked consent control where consent is the chosen lawful basis for the relevant activity.
- Record the applicable notice/consent version and timestamp as designed.
- Explain purpose, contact channel, who can access data, external processors/integrations, retention approach and request channel in the privacy notice.
- Have qualified counsel/privacy support review final notice, terms, marketing consent and actual operating jurisdictions.
- Avoid adding newsletter/marketing opt-in to project inquiry without clear separate purpose and choice.

## 8. Incident response
If an integration credential leaks:
1. Revoke/rotate it immediately.
2. Disable the integration path if necessary.
3. Review logs/access history for misuse.
4. Assess affected data and exposure scope.
5. Restore least-privilege access and test with non-production data.
6. Document timeline, remediation and required notifications according to applicable obligations.

## 9. Sources to verify during implementation
- Sheets API guide: https://developers.google.com/workspace/sheets/api/guides/concepts
- Sheets API usage limits: https://developers.google.com/workspace/sheets/api/limits
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
