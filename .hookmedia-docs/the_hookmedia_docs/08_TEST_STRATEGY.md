# Test Strategy and Release Acceptance

## 1. Testing layers
- Static checks: TypeScript, ESLint, formatting, dependency audit, secret scan.
- Unit tests: schemas, business rules, quotation arithmetic, status transition helpers, role/permission functions.
- Integration tests: route handlers against a disposable/staging database, Auth session states, storage policies, outbox transitions.
- Database tests: constraints, migrations, RLS positive and negative cases.
- End-to-end tests: public visitor journey and realistic owner/staff workflows.
- Manual checks: responsive layout, keyboard accessibility, content accuracy, production configuration and recovery runbook.

## 2. Minimum critical test suite
### Public inquiry (`PUB/LEAD`)
- Valid form creates exactly one lead and returns reference.
- Missing required field, invalid email, excessive description, invalid service slug and invalid URL are rejected.
- Consent missing/false is rejected when consent is required.
- Rate limit returns 429 after configured threshold.
- Repeated request with same idempotency key does not create duplicate if that contract is enabled.
- Database write succeeds while Sheets/email provider is unavailable.
- Public response does not contain UUIDs not intended for disclosure, internal notes, owner email or service secrets.

### Identity and permissions (`IAM`)
- Anonymous request to every protected route returns 401/redirect without revealing private data.
- Authenticated non-staff user is denied from owner pages.
- Editor cannot access unrelated lead or client by changing an ID.
- Project Manager can access assigned projects only, according to configured policy.
- Non-owner cannot grant owner role or view/change integration secrets.
- User cannot mutate fields not in the endpoint allowlist.
- Disabled staff access is denied after revocation/session invalidation strategy is applied.
- MFA policy is verified for owner/admin in production configuration.

### Database/RLS
- Anonymous role cannot query sensitive tables.
- Every sensitive table has RLS enabled and correct grants.
- Staff roles can only read/update the permitted rows/columns.
- Audit records cannot be edited/deleted by ordinary application roles.
- Tests assert a denied update affected zero rows and did not mutate the target; do not merely assert that no exception was thrown.
- Migrations run against a clean database and an upgrade database.

### Operations
- Lead conversion is transactional and idempotent.
- A lost/outbox retry does not create duplicate Sheets rows.
- Invalid task/project state transitions are rejected.
- Quotation totals match server-side decimal arithmetic, with rounding rules documented.
- CSV export is permission-checked, filtered, properly escaped and audited.
- Uploaded invalid, oversized, renamed or unauthorized files are rejected.
- Published public CMS API never returns drafts.

## 3. Example RLS test matrix
| Actor | Operation | Expected |
|---|---|---|
| Anonymous | Read all leads | Denied |
| Anonymous | Read published service | Allowed |
| Anonymous | Read draft service | Denied/not found |
| Editor A | Read assigned task | Allowed |
| Editor A | Read unassigned confidential lead | Denied |
| Project Manager A | Update assigned project | Allowed within editable fields |
| Project Manager A | Grant owner role | Denied |
| Admin | Manage integration secret values | Denied by default |
| Owner | Change permitted business settings | Allowed + audit event |

## 4. Requirement traceability starter
| Requirement ID | Test coverage expected |
|---|---|
| `PUB-001`–`PUB-005` | Public page and published-content E2E tests |
| `LEAD-001`–`LEAD-008` | Form validation, persistence, permission and export tests |
| `IAM-001`–`IAM-006` | Auth, MFA configuration, role escalation and access tests |
| `OPS-001`–`OPS-006` | Client conversion, project/task, assignment and object access tests |
| `CMS-001`–`CMS-002` | Draft/publish boundary tests |
| `INT-001`–`INT-005` | Disabled integration, retries, idempotency and provider failure tests |
| `NFR-003` | Threat-based security tests and ASVS checklist review |

## 5. CI release gate
A pull request cannot be merged unless:
- TypeScript and lint pass.
- Unit/integration tests pass.
- Database migrations validate and RLS tests pass.
- Build succeeds.
- Secret/dependency scanning passes or findings are reviewed and resolved.
- Changed API contract and documentation are updated.
- No critical/high security issue remains without documented risk acceptance and mitigation.

## 6. Performance and accessibility testing
- Establish realistic thresholds and measure them; do not claim performance before profiling.
- Test indexed list views with realistic volumes.
- Check web vitals on deployed pages.
- Run automated accessibility checks and manual keyboard/focus/error-state tests.
- Test mobile viewport layouts and large text/zoom.

## 7. Evidence requirement
A test result must represent a test actually run in the target commit/environment. Never state “100% passed” unless the exact suite and results support the claim. Attach run logs or CI links to release notes.
