# Software Requirements Specification (SRS)

## 1. Purpose
Define observable requirements for the public website, CMS and internal operations portal. Each requirement uses an ID for issue tracking and test traceability.

## 2. Functional requirements
### Public website
- `PUB-001`: The system shall display responsive home, about, services, portfolio, blog, contact, privacy and terms pages.
- `PUB-002`: The system shall show only published services, portfolio entries, blog posts, FAQs and testimonials.
- `PUB-003`: Each service/portfolio/blog item shall have a stable, unique slug and editable SEO metadata.
- `PUB-004`: Public content shall not expose internal notes, drafts, user records or private asset URLs.
- `PUB-005`: Navigation, CTA and contact links shall have real actions and valid destinations.

### Inquiry capture
- `LEAD-001`: A visitor shall be able to submit an inquiry without creating an account.
- `LEAD-002`: The server shall validate all submitted fields and enforce size and URL constraints.
- `LEAD-003`: A valid inquiry shall be persisted before optional integrations execute.
- `LEAD-004`: The API shall return a reference identifier without disclosing internal database IDs where not needed.
- `LEAD-005`: The system shall record consent text/version and timestamp where required by the approved consent design.
- `LEAD-006`: The system shall support statuses New, Contacted, Qualified, Proposal Sent, Negotiation, Won and Lost.
- `LEAD-007`: Authorised users shall search/filter inquiries and add private notes and follow-up dates.
- `LEAD-008`: CSV export shall be permission-controlled and auditable.

### Identity and access
- `IAM-001`: No public self-signup shall grant an internal role.
- `IAM-002`: Every protected server operation shall verify an authenticated session and required permission.
- `IAM-003`: Role changes shall be restricted to designated administrative users and audited.
- `IAM-004`: Access to sensitive records shall be denied by default.
- `IAM-005`: Password recovery shall use the identity provider's secure flow and not disclose account existence unnecessarily.
- `IAM-006`: Owner and admin accounts shall use MFA where supported by the selected authentication configuration; it is a launch requirement for production.

### Clients and projects
- `OPS-001`: Authorised users shall create/update client records.
- `OPS-002`: Converting a lead shall not create duplicate clients on retry.
- `OPS-003`: Projects shall support client, title, scope, status, priority, start/due dates and team membership.
- `OPS-004`: Tasks shall support assignee, status, priority, due date and project relationship.
- `OPS-005`: Server logic shall reject invalid state transitions where a workflow rule is configured.
- `OPS-006`: Users shall see only records permitted by their roles and assignments.

### CMS and quotations
- `CMS-001`: Authorised content managers shall create/edit drafts and publish/unpublish content.
- `CMS-002`: Public APIs shall not return unpublished content to anonymous users.
- `QUOTE-001`: Quotation totals shall be calculated server-side using decimal-safe arithmetic.
- `QUOTE-002`: Quotation status changes and total-affecting edits shall be audited.
- `QUOTE-003`: A quotation must be distinguishable from an invoice or payment receipt.

### Integrations
- `INT-001`: Google Sheets sync shall be optional and disabled until configured.
- `INT-002`: PostgreSQL shall remain the source of truth.
- `INT-003`: Integration failures shall be persisted with retryable status and no loss of the originating lead.
- `INT-004`: Retry shall be idempotent using a stable record ID or sync key.
- `INT-005`: Email shall be marked sent only after provider acceptance/confirmation consistent with the provider API; missing configuration shall be reported honestly.

## 3. Non-functional requirements
- `NFR-001 Availability`: Target a defined service objective after observing production traffic; do not promise an SLA before hosting and monitoring are selected.
- `NFR-002 Performance`: Use pagination, indexes and bounded queries; set and measure page/API budgets before launch.
- `NFR-003 Security`: Follow OWASP ASVS 5.0.0 as a verification baseline and prioritise all critical/high findings before launch.
- `NFR-004 Accessibility`: Aim for WCAG 2.2 AA; conduct automated and manual checks.
- `NFR-005 Maintainability`: Strict TypeScript, linting, formatting, reviewed migrations, modular services and documented configuration.
- `NFR-006 Observability`: Structured server logs, error monitoring and health checks without logging secrets or unnecessary personal data.
- `NFR-007 Recovery`: Document backup schedule, restore point expectations (RPO) and recovery time target (RTO) once the selected database plan is known.
- `NFR-008 Privacy`: Minimise data collection, restrict access, define retention and publish reviewed notices.
- `NFR-009 Compatibility`: Current supported stable desktop/mobile browsers as agreed before launch.
- `NFR-010 Integrations`: Core inquiry flow shall operate if email, Google Sheets or analytics integrations are unavailable.

## 4. Business rules
- `BR-001`: Lead status changes and conversion must preserve activity history.
- `BR-002`: A won/lost lead remains available for reporting but access is role-restricted.
- `BR-003`: Internal notes are never included in public DTOs or email notifications to visitors.
- `BR-004`: Only explicitly authorised users can export bulk personal data.
- `BR-005`: A deleted or disabled team account must not erase project/audit history.
- `BR-006`: Prices, tax values and totals shall use decimal/numeric columns and currency metadata.
- `BR-007`: Do not store passwords, payment card data, provider secrets or authentication tokens in ordinary application tables.

## 5. Error-handling standard
All API errors shall use a consistent shape such as `{ "error": { "code": "VALIDATION_ERROR", "message": "Please review the submitted fields.", "requestId": "...", "fieldErrors": {} } }`.

- `400`: malformed request
- `401`: missing/invalid session on protected route
- `403`: authenticated but not authorised
- `404`: resource absent or not accessible; avoid existence leaks where appropriate
- `409`: conflict/duplicate/state conflict
- `422`: well-formed request failing business validation, if used consistently
- `429`: rate limited
- `500`: generic server failure with request ID, no stack trace or secret
- `503`: temporary dependency outage where appropriate

## 6. Traceability
Every requirement ID should link to one or more automated/manual test cases and, where implemented, a route/component/database migration. Use the traceability table in the test plan.
