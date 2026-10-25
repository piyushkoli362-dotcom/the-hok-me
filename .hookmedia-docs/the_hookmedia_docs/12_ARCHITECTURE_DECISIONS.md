# Architecture Decision Records (ADR)

## ADR-001 — Next.js full-stack application
**Status:** Proposed / accepted baseline  
**Decision:** Use one Next.js App Router application for public pages and owner portal, with route handlers/server actions and modular domain services.  
**Reason:** Lower operational complexity for an early-stage agency than separate frontend/backend services.  
**Trade-off:** Enforce strict server/client boundaries and avoid putting all business logic into components. Split services only if actual scale/team requirements justify it.

## ADR-002 — Supabase Auth and PostgreSQL
**Status:** Proposed / accepted baseline  
**Decision:** Supabase Auth for identity and Supabase PostgreSQL for domain records.  
**Reason:** Managed authentication and database with RLS and migrations.  
**Trade-off:** RLS must be designed/tested carefully; provider configuration and backup capabilities depend on chosen plan.

## ADR-003 — PostgreSQL as source of truth
**Status:** Proposed / accepted baseline  
**Decision:** Store leads, clients, projects, tasks, quotations and CMS records in PostgreSQL; Google Sheets is a secondary optional sync target.  
**Reason:** A spreadsheet cannot provide the same transaction, permissions, relational integrity and audit guarantees for an operations system.  
**Trade-off:** Requires database backup/monitoring and integration retry mechanisms.

## ADR-004 — RLS + server-side DAL
**Status:** Proposed / accepted baseline  
**Decision:** Centralise trusted permission checks in a server-side DAL and enforce RLS/least-privilege at database boundary. Keep any privileged service key server-only.  
**Reason:** Defence in depth against direct API access and object-level authorisation failures.  
**Trade-off:** More upfront policy tests; do not depend only on UI hiding or proxy/middleware checks.

## ADR-005 — No public staff registration
**Status:** Proposed / accepted baseline  
**Decision:** Staff users are invited/created by a trusted admin; owner role is bootstrapped through a controlled procedure.  
**Reason:** Public sign-up must not create privileged identities.  
**Trade-off:** Owner/admin needs a safe account recovery and onboarding workflow.

## ADR-006 — Integration outbox for reliable delivery
**Status:** Proposed / accepted for Sheets/email events  
**Decision:** Persist the lead and an outbox event in one database transaction; process external effects separately with idempotency and retries.  
**Reason:** External APIs can fail after the lead is safely saved.  
**Trade-off:** Requires worker/scheduled job or explicit retry workflow and observability.

## ADR-007 — No payment processing in initial scope
**Status:** Proposed / accepted baseline  
**Decision:** Quotations and manually recorded financial status only; no card data or charging flow.  
**Reason:** Keeps initial security/compliance surface smaller.  
**Trade-off:** Online collection requires a separate design with a supported payment provider and legal/accounting review.

## ADR-008 — Honest public proof
**Status:** Accepted product principle  
**Decision:** Do not fabricate clients, testimonials, awards, project outcomes, view counts or revenue metrics.  
**Reason:** Trust and factual integrity.  
**Trade-off:** Empty states and capability-led content may be used until genuine portfolio material is ready.
