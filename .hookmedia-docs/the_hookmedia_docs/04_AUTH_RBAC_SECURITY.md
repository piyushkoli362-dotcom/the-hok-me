# Authentication, RBAC and Security Baseline

## 1. Security objectives
Confidentiality of client/lead data, integrity of quotations and project records, availability of the inquiry route, traceability of sensitive operations, and safe separation between public and staff capabilities.

Use OWASP ASVS 5.0.0 as a verification reference, not as a claim of certification. Conduct a threat review and tests before release.

## 2. Identity model
- Supabase Auth is the identity provider.
- Staff accounts are invitation-only; no public registration grants access.
- The first owner is bootstrapped through a documented operator procedure using a trusted admin interface/CLI or provider console, then assigned the owner role in a protected migration/administrative operation.
- Never ship a fixed default password or shared owner credential.
- Use MFA for owner and admin accounts where supported; require a recovery method and test recovery procedures.
- Use secure, HttpOnly, SameSite cookies through the supported SSR integration. Enforce HTTPS in production.
- Password resets and invitations should use provider-supported single-use/expiring flows.
- Session expiry and sign-out behaviour must be tested on both server-rendered pages and APIs.

## 3. Role model
| Role | Default permissions | Must not do by default |
|---|---|---|
| Owner | Full business access, invite/disable staff, role management, settings, integrations, audit access | Share credentials; bypass audit controls |
| Admin | Leads, clients, projects, tasks, CMS, quotations within policy | Grant owner role or view secrets unless explicitly authorised |
| Project Manager | Assigned projects/clients, milestones, tasks, team assignments within scope | Manage authentication, integration secrets, global roles |
| Editor | Assigned projects/tasks and allowed assets/notes | Read unrelated leads, quotations, user roles or financial summaries |
| Designer | Assigned projects/tasks and approved design assets | Access unrelated CRM/finance/private notes |
| Developer | Assigned technical projects/tasks and permitted technical documentation | Access unrelated lead/financial/private data |
| Marketing Specialist | Assigned campaigns/projects and approved marketing records | Manage owner/admin permissions or read unrelated sensitive records |

Roles are a starting point. Add permission-level checks for special operations such as export, role changes, quotations, integrations and bulk actions.

## 4. Authorisation matrix
Legend: `A` = all records; `S` = assigned/allowed scope; `M` = manage; `R` = read; `—` = denied by default.

| Capability | Owner | Admin | PM | Editor/Designer/Developer | Marketing |
|---|---:|---:|---:|---:|---:|
| View dashboard | A | A | S | S | S |
| Read all leads | A | M | S only if assigned | — | S only if assigned |
| Export leads | A | M if granted | — | — | — |
| Change lead status/notes | A | M | S | — | S if assigned |
| Manage clients | A | M | S | — | S if assigned |
| Manage projects/tasks | A | M | M within scope | S | S within scope |
| Manage public services/portfolio/blog | A | M | — | — | content role only if granted |
| Create quotations | A | M if granted | S if granted | — | — |
| Manage user roles | A | — by default | — | — | — |
| Manage secrets/integrations | A | — by default | — | — | — |
| View audit logs | A | limited if granted | — | — | — |

Every “S” must be enforced by record-level assignment/organisation rules, not just a filtered UI query.

## 5. Authorisation implementation rules
1. Centralise checks in a server-side DAL, e.g. `requireSession()`, `requireRole()`, `requirePermission()`, `assertCanAccessProject(projectId)`.
2. Each mutation must independently validate actor, action and target resource.
3. Use database constraints and RLS as a defence-in-depth boundary.
4. Do not trust roles from query strings, request bodies, localStorage or editable user metadata.
5. Revalidate role state for sensitive actions; avoid depending on stale claims alone.
6. Check ownership/assignment for every object ID to prevent IDOR/BOLA.
7. Do not return secrets, private notes, internal audit metadata or excessive database rows in DTOs.
8. Use separate permissions for export, role management, settings and integration actions.

## 6. Supabase/RLS policy design
- Enable RLS for all tables exposed to the API schema.
- Apply least-privilege grants; anonymous users should only access explicitly public published-content data and the intended inquiry submission path.
- Create separate policies for `SELECT`, `INSERT`, `UPDATE` and `DELETE`; avoid a broad `FOR ALL` policy hiding the actual permission model.
- Prefer default-deny behaviour and explicit role/record predicates.
- If using a `SECURITY DEFINER` helper, set a safe fixed `search_path`, qualify object names, restrict `EXECUTE` grants, avoid dynamic SQL and review recursion risks.
- Keep `service_role`/secret keys only in server-only code. Any use must occur after explicit authorization and validation and be logged where appropriate.
- Add negative tests proving anonymous/staff users cannot read another role's restricted data.
- Never assume a route is secure because navigation hides the link.

## 7. Threat model
| Threat | Example | Primary controls | Verification |
|---|---|---|---|
| Broken access control / IDOR | Editor changes `/leads/123` to view another lead | DAL object checks, RLS, opaque IDs as defence-in-depth, DTO minimisation | Cross-role and cross-record tests |
| Privilege escalation | User submits `role: owner` in profile payload | Server-controlled role assignment, deny mass assignment, audit | Attempt role mutation as every non-owner role |
| Credential/session theft | Stolen session cookie | HTTPS, HttpOnly, SameSite, secure expiry, MFA for privileged accounts, XSS prevention | Session/logout/security tests |
| Injection | Malicious input in inquiry/search | Parameterised DB operations, schema validation, contextual output escaping | Injection payload tests |
| Spam/DoS | Automated inquiry flood | Edge/server rate limiting, CAPTCHA if needed, body-size cap, request timeouts | Load/rate-limit tests |
| Secret exposure | Service key included in client JS | Server-only env vars, build inspection, secret scanning | CI secret scan and bundle scan |
| Stored XSS | Blog body contains script | Safe rich-text allowlist/sanitisation, output escaping, CSP as defence-in-depth | Stored-XSS test cases |
| CSRF | Cross-site privileged mutation | SameSite cookies, origin/CSRF protections appropriate to auth design, no state-changing GET | CSRF tests |
| Malicious upload | File masquerades as an image | Size/MIME/magic-byte checks, safe storage rules, random object names, malware scanning if required | Upload test matrix |
| Sheets data leak | Wrong sheet sharing settings | Private sheet, least-privilege service account, no public write access, secrets protected | Permission and sync tests |
| Data loss | Sheets/email fails after lead save | DB-first transaction, durable outbox, retries, reconciliation | Simulate provider outage |
| Audit log tampering | Staff edits own actions | Append-only policy for application roles, restricted audit read/write, DB/service protections | Permission tests |

## 8. Input and output safety
- Validate all untrusted input on the server using Zod or equivalent.
- Define maximum request body, text length, array size and URL count.
- Use parameterised queries/ORM APIs.
- Avoid rendering user-controlled HTML. If rich text is required, use a proven sanitizer with a tight allowlist.
- Add safe response headers, including a considered Content Security Policy; test any inline scripts required by analytics before enforcing.
- Never reflect raw exception messages or stack traces to clients.
- Avoid unrestricted URL fetching from user-supplied links; if link previews are added later, design explicit SSRF protections.

## 9. Privacy and data minimisation
- Collect only what is needed to qualify and serve the lead.
- Make phone/company/budget fields optional unless the business case requires them.
- Document purpose, access, retention and deletion approach.
- Treat inquiry data, employee data, client records and financial records as restricted.
- Do not send internal notes to email providers or analytics.
- Restrict bulk exports; log exporter, time, filters and row count without duplicating the whole export into logs.
- Have a suitable reviewer approve privacy/terms/consent language for the applicable jurisdictions before production.

## 10. Security launch checklist
- [ ] MFA enforced for owner/admin where supported and recovery tested.
- [ ] No public owner creation or fixed credentials.
- [ ] All protected routes and mutations tested for 401/403.
- [ ] RLS enabled and covered by negative tests for every sensitive table.
- [ ] Secrets absent from Git, client bundles and logs.
- [ ] Rate limits and request-size limits configured.
- [ ] CSRF/CORS/CSP/security headers reviewed.
- [ ] Upload validation and private bucket policies tested.
- [ ] Dependency and secret scans pass.
- [ ] Audit events cover role and high-impact changes.
- [ ] Backups and restore procedure verified.
- [ ] High/critical security issues fixed or formally accepted before launch.
