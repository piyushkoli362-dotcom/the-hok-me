# Architecture Decision Records — The HookMedia

## ADR-009 — Phase 0 brand and public-site transition
**Status:** Implemented for this delivery
**Decision:** Rebrand the existing static HTML/CSS/vanilla JavaScript project in place, preserving its current build, Vercel functions, local-only lead collector, Excel export and optional private Google Sheets delivery. Centralize the new identity in CSS custom properties and replace Croptera-specific public-facing brand, copy, metadata and icons.
**Reason:** The checked-out repository is not the proposed Next.js/Supabase system in the technical documentation. A wholesale rewrite would discard working features and require provider credentials and schema decisions not present in the repository.
**Trade-off:** This delivers the Phase 0 public identity foundation and a substantial capability-led public homepage, but it does not implement Phase 1 service detail routes/CMS or Phases 2–7 secure owner operations, PostgreSQL, Supabase Auth/RLS, durable rate limiting, or mail delivery. Do not advertise an owner dashboard as functional.

## ADR-010 — No unverified operating details
**Status:** Implemented for this delivery
**Decision:** Keep contact, business address, verified portfolio, clients, testimonials and performance figures absent until supplied and approved. Display a truthful empty portfolio state and make lead form delivery status depend on the existing server configuration.
**Reason:** No authentic agency proof or verified public contact channel was included in the provided files.
