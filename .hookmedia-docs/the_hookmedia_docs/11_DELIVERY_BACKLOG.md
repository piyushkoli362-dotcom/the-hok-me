# Delivery Backlog and Implementation Plan

## Delivery approach
Build vertical slices that can be exercised end-to-end. A feature is not done when the UI exists; it is done when UI, validation, server logic, data access, permissions, tests and documentation are integrated.

## Phase 0 — Repository discovery and decisions
**Tasks:** inspect existing code; record stack; detect current routes/data/auth; confirm branding; create docs and environment templates; make an architecture decision log.  
**Acceptance:** no working code overwritten without reason; gaps mapped to requirements; dev setup documented.

## Phase 1 — Public site and design system (P0)
**Stories:**
- As a visitor, I can understand the agency's main capabilities.
- As a visitor, I can browse services and published portfolio content.
- As a mobile visitor, I can navigate and submit an inquiry comfortably.
- As an owner, I do not want fabricated metrics or portfolio data shown.

**Tasks:** design tokens, shared shell, page components, service detail template, portfolio/blog data models or temporary static adapter, SEO metadata, accessibility.

**Acceptance:** responsive pages, real nav links, accessible form controls, CMS/DB data shown only when published.

## Phase 2 — Database, auth and access control (P0)
**Stories:**
- Owner can sign in securely.
- Staff access depends on assigned role.
- Anonymous visitors cannot read internal records.

**Tasks:** Supabase SSR setup, session utilities, owner bootstrap procedure, roles table, DAL, RLS, migrations, MFA configuration, protected layouts and route middleware/proxy for convenience only.

**Acceptance:** unauthenticated and non-owner API tests pass; no public role creation; RLS tests pass; no secret in browser bundle.

## Phase 3 — Lead capture and CRM (P0)
**Stories:**
- Visitor submits requirements without account creation.
- Owner can review, search, assign, status-update and schedule follow-up.
- Owner can add internal notes unseen by clients.

**Tasks:** Zod schemas, form, rate limits, lead transaction, unique public reference, lead list/detail, status history, notes, CSV export permissions.

**Acceptance:** valid end-to-end inquiry passes; invalid/spam cases are rejected; data persists; integration outages do not affect lead persistence.

## Phase 4 — Clients and delivery operations (P1)
**Stories:**
- Owner converts a lead to a client exactly once.
- PM creates project and assigns members/tasks.
- Staff sees assigned work and updates task state.

**Tasks:** client schema, transactional/idempotent conversion, projects, milestones, tasks, membership, assignment-aware DAL/RLS, Kanban/list views, workload aggregates.

**Acceptance:** no duplicate conversion on retries; cross-project access controls tested; due dates/statuses appear consistently.

## Phase 5 — CMS (P1)
**Stories:** owner/admin updates service copy without a deployment; content editors publish approved case studies/blog posts.

**Tasks:** services CRUD, categories, portfolio/media, blog, FAQ, testimonials with permission/status fields, secure upload, SEO fields, public cache invalidation/revalidation.

**Acceptance:** draft content never appears in anonymous API; no unapproved testimonial; uploads enforce policies.

## Phase 6 — Integrations and quotations (P1/P2)
**Tasks:** durable outbox, Google Sheets mapping/upsert, retry UI, email notifications, quotations/items, server arithmetic, PDF/print view.

**Acceptance:** fake provider outage simulated; retries idempotent; missing credentials produce clear status; quotation totals tested.

## Phase 7 — Hardening and production (P0 release gate)
**Tasks:** error monitoring, logging redaction, dependency/secret scans, ASVS-based checklist, accessibility checks, load/performance checks, backup/restore test, privacy/terms review, release/rollback runbook.

**Acceptance:** all critical paths pass; no unresolved critical/high issues without written acceptance and mitigation; production keys separated from preview.

## Definition of done (all phases)
- Requirement and acceptance criteria implemented.
- UI loading/empty/error/success states present.
- Validation on server; permissions checked for every mutation.
- Unit/integration/E2E tests added where applicable.
- RLS and database constraints updated and tested.
- Logs/analytics do not leak secrets or unnecessary personal data.
- Docs and `.env.example` updated.
- Tests actually run and results truthfully reported.
