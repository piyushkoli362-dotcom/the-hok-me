# API Contract — Proposed REST Routes

## 1. Conventions
- Base path: `/api`
- Content type: JSON, UTF-8 unless upload endpoint states otherwise.
- Use UUIDs for internal resources; use a separate random public inquiry reference.
- All list endpoints use pagination with a default page size (e.g. 25) and a hard maximum (e.g. 100).
- All writes validate the authenticated actor, schema, business rules and access to the target resource.
- All mutation endpoints require CSRF/origin protections appropriate to the cookie/session architecture.
- Consistent error response:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please review the submitted fields.",
    "requestId": "req_...",
    "fieldErrors": {"email": ["Enter a valid email address."]}
  }
}
```

## 2. Public endpoints
### `GET /api/public/services`
Returns published service cards only. Optional category/search/page filters; never returns draft records.

### `GET /api/public/services/:slug`
Returns one published service detail and approved linked portfolio entries.

### `GET /api/public/portfolio`
Returns published portfolio entries only; supports category and pagination.

### `GET /api/public/portfolio/:slug`
Returns a published case study. No internal client data or private assets.

### `GET /api/public/blog` and `GET /api/public/blog/:slug`
Returns published posts only.

### `POST /api/public/inquiries`
Example request:
```json
{
  "fullName": "Example Contact",
  "email": "contact@example.com",
  "phone": "+91...",
  "companyName": "Example Company",
  "websiteUrl": "https://example.com",
  "serviceSlugs": ["video-editing", "social-media-marketing"],
  "industry": "E-commerce",
  "projectDescription": "Describe desired deliverables and outcomes.",
  "budgetBand": "25000_50000",
  "timeline": "within_1_month",
  "preferredContactMethod": "email",
  "referenceUrls": ["https://example.com/reference"],
  "privacyConsent": true,
  "consentVersion": "privacy-v1"
}
```
Success (`201`):
```json
{
  "data": {
    "reference": "HM-...",
    "message": "Your inquiry has been received."
  }
}
```
Rules: server is authoritative for validation; service slugs must refer to allowed current services; cap description length, number of service selections and links; block/limit abusive submissions. Persist lead + outbox event transactionally if external sync is enabled. Do not return internal IDs, notes or private lead fields.

## 3. Authenticated owner routes
All require a valid session and role/permission checks. The exact permission should be documented alongside each handler and covered by negative tests.

| Method + route | Purpose | Permission example |
|---|---|---|
| `GET /api/owner/dashboard` | Counts and deadline summaries | `dashboard.read` |
| `GET /api/owner/leads` | Search/filter/paginate leads | `leads.read` plus scoped access |
| `GET /api/owner/leads/:id` | Lead detail and allowed activities | `leads.read` plus record check |
| `PATCH /api/owner/leads/:id` | Status, assignee, follow-up | `leads.update` plus record check |
| `POST /api/owner/leads/:id/notes` | Add internal note | `leads.notes.write` |
| `POST /api/owner/leads/:id/convert` | Idempotent lead-to-client conversion | `clients.create` and lead access |
| `GET/POST /api/owner/clients` | List/create clients | `clients.read/create` |
| `GET/PATCH /api/owner/clients/:id` | Read/update client | `clients.read/update` plus record check |
| `GET/POST /api/owner/projects` | List/create projects | `projects.read/create` |
| `GET/PATCH /api/owner/projects/:id` | Project detail/update | `projects.read/update` plus scope check |
| `POST /api/owner/projects/:id/members` | Assign team member | `projects.assign` |
| `GET/POST /api/owner/tasks` | List/create tasks | `tasks.read/create` plus scope check |
| `PATCH /api/owner/tasks/:id` | Update task state/assignee/due date | `tasks.update` plus scope check |
| `GET/POST /api/owner/services` | List/create services | `services.read/manage` |
| `PATCH/DELETE /api/owner/services/:id` | Edit/archive service | `services.manage` |
| `GET/POST /api/owner/portfolio` | List/create portfolio entries | `portfolio.manage` |
| `PATCH /api/owner/portfolio/:id` | Update/publish portfolio | `portfolio.manage` |
| `GET/POST /api/owner/blog` | List/create posts | `content.manage` |
| `PATCH /api/owner/blog/:id` | Edit/publish post | `content.manage` |
| `GET/POST /api/owner/quotations` | List/create quotation | `quotations.read/create` |
| `PATCH /api/owner/quotations/:id` | Change quotation details/status | `quotations.update` plus state validation |
| `POST /api/owner/leads/export` | Export filtered lead data | `leads.export` |
| `GET /api/owner/integrations` | View integration health (not secrets) | `integrations.read` |
| `POST /api/owner/integrations/google-sheets/sync/:id` | Retry one record sync | `integrations.sync` |
| `GET /api/owner/audit-logs` | Search safe audit events | `audit.read` |

## 4. Mutation controls
- Use allowlisted patch fields; never spread arbitrary request JSON into database updates.
- Use optimistic concurrency (e.g. `updated_at` or version field) for high-conflict edits where useful.
- Require idempotency for lead conversion, external sync and any action that may be retried.
- Reject invalid status transitions if business state rules say so.
- Avoid destructive `DELETE` for business history; prefer archive/deactivation with retention policy.
- Audit sensitive updates and bulk exports.

## 5. Pagination/filtering
Example query: `/api/owner/leads?status=new&assignedTo=...&limit=25&cursor=...`.
- Validate every filter and cursor.
- Use stable ordering (e.g. `created_at DESC, id DESC`).
- Do not accept arbitrary column names or SQL fragments from query parameters.
- Clamp page size and set reasonable timeouts.

## 6. Status codes
- `200`: successful read/update
- `201`: created
- `400`: malformed payload/query
- `401`: unauthenticated
- `403`: forbidden
- `404`: missing or inaccessible resource as appropriate
- `409`: state/duplicate conflict
- `422`: valid JSON but business-rule failure, if adopted consistently
- `429`: rate limit
- `500`: generic server error and request ID
- `503`: dependency temporarily unavailable

## 7. API documentation practice
Keep schemas close to route handlers; generate OpenAPI only if useful for the selected route architecture. For each route document required role, input schema, response DTO, possible errors, rate limit, audit behaviour and test ID.
