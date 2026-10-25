# The HookMedia — Technical Documentation Pack

**Version:** 1.0 (initial product baseline)  
**Date:** 25 October 2026  
**Status:** Proposed specification; implementation and verification are not yet implied.

## Purpose
This pack defines the product requirements, architecture, database, API contracts, identity and access controls, security baseline, testing, deployment, integration and operational practices for The HookMedia website and internal agency operations platform.

## Recommended stack
- Next.js App Router + TypeScript
- Tailwind CSS and accessible reusable components
- Supabase Auth for identity/session management
- Supabase PostgreSQL with version-controlled SQL migrations and Row Level Security (RLS)
- Supabase Storage for approved media assets
- Vercel for application hosting
- Google Sheets API as an optional lead export/synchronisation destination
- Email provider as an optional notification integration

**Architecture note:** Use Supabase SSR-compatible clients and a centralized server-side Data Access Layer (DAL). Normal user operations should run through a user-scoped session and explicit RLS. Any privileged server client must remain server-only, be narrowly scoped, and only be called after independent authorization and validation. Never expose a service-role/secret key to browser code.

## Documents
1. `01_PRODUCT_REQUIREMENTS_PRD.md` — vision, goals, personas, scope, success metrics and acceptance criteria.
2. `02_SOFTWARE_REQUIREMENTS_SRS.md` — functional/non-functional requirements and assumptions.
3. `03_SYSTEM_ARCHITECTURE.md` — components, diagrams, trust boundaries and key workflows.
4. `04_AUTH_RBAC_SECURITY.md` — login/session design, role matrix, threats and security checklist.
5. `05_DATABASE_DESIGN.md` — entity model, data dictionary and schema guidance.
6. `06_API_CONTRACT.md` — proposed API routes, payloads, errors and idempotency.
7. `07_UX_CONTENT_AND_SITEMAP.md` — routes, page behavior, content and accessibility.
8. `08_TEST_STRATEGY.md` — unit, integration, RLS, security and E2E verification.
9. `09_DEPLOYMENT_AND_ENVIRONMENT.md` — environments, env vars, CI/CD and release checklist.
10. `10_INTEGRATIONS_PRIVACY_AND_DATA_GOVERNANCE.md` — Sheets, email, data lifecycle, privacy and consent.
11. `11_DELIVERY_BACKLOG.md` — implementation sequence and user stories.
12. `12_ARCHITECTURE_DECISIONS.md` — key decisions and trade-offs.
13. `13_OPERATIONS_AND_INCIDENT_RUNBOOK.md` — support, backup, incidents and recovery.
14. `14_CODEX_IMPLEMENTATION_GUIDE.md` — how to instruct Codex and define done.

## Product principles
- PostgreSQL is the system of record. A spreadsheet is a secondary destination, never the only copy of a lead.
- Do not fabricate clients, testimonials, portfolio results, awards, stats or revenue.
- The public inquiry flow must work if optional integrations are unconfigured.
- No owner account may be created through public self-registration.
- All protected operations must enforce authorization on the server; hiding UI controls is not security.
- Build a small, testable end-to-end slice before adding secondary modules.
- Store no payment-card data. Quotations and manually recorded payments do not mean payment processing is implemented.

## Baseline references
- Next.js authentication guidance: https://nextjs.org/docs/app/guides/authentication
- Supabase SSR guide: https://supabase.com/docs/guides/auth/server-side
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- OWASP ASVS 5.0.0: https://asvs.owasp.org/
- Google Sheets API concepts: https://developers.google.com/workspace/sheets/api/guides/concepts

## How to use this pack
1. Put this directory at `docs/` in the code repository.
2. Ask Codex to inspect the existing repository and identify gaps against these requirements.
3. Implement in the sequence in `11_DELIVERY_BACKLOG.md`.
4. Update these documents whenever implementation choices differ from the specification.
5. Do not declare production-ready until all launch gates and critical security tests pass.

## Status and caveat
This is a proposed specification, not proof that an application has been built, tested, audited, deployed or made compliant with every applicable law. Production launch requires actual implementation, configuration, tests, security review and suitable legal/privacy review.
