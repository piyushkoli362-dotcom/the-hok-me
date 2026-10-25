# Codex Implementation Guide — The HookMedia

## Objective
Implement this specification in the existing repository without destroying working features. Treat the docs as requirements; verify repository reality before coding.

## First prompt to Codex
```text
Read every file in docs/ before making code changes. First inspect the existing repository, package manager, routes, auth, schema, tests and deployment config. Do not rewrite the project wholesale.

Create a requirements traceability checklist from PRD/SRS to current code. Identify conflicts, missing information, risks and features that already work. Report the current architecture and propose a phased plan using docs/11_DELIVERY_BACKLOG.md.

Use the stack and security boundaries in docs/03_SYSTEM_ARCHITECTURE.md and docs/04_AUTH_RBAC_SECURITY.md. If a change is needed, document it in docs/12_ARCHITECTURE_DECISIONS.md and update related contracts. Never put secrets in source code or client bundles. Never create public owner signup or fabricated portfolio/testimonial data.

Implement only Phase 0 first. Run available checks and report exact changed files, commands run, test results, unresolved blockers and next phase. Do not claim unrun tests passed.
```

## Prompts for later phases
### Phase 1 — Public website
```text
Implement Phase 1 of docs/11_DELIVERY_BACKLOG.md: responsive public pages and central design tokens for The HookMedia. Follow docs/07_UX_CONTENT_AND_SITEMAP.md. Use real navigation/actions, accessible loading/error/empty states and published content only. Do not invent clients, testimonials, awards or project metrics. Add relevant tests and run lint/type/build checks. Report results accurately.
```

### Phase 2 — Auth and RLS
```text
Implement Phase 2 only. Use the selected Supabase SSR-supported approach and the current official docs. Create migrations for roles and required policies, central server-side DAL helpers and a safe owner bootstrap procedure. Public signup must not grant staff or owner roles. Test anonymous, owner, admin, project manager and specialist access including IDOR and privilege-escalation attempts. Never use service-role credentials in browser code. Do not continue until RLS and permission tests pass.
```

### Phase 3 — Inquiry and lead management
```text
Implement the project inquiry flow and owner lead workflow from docs/01_PRODUCT_REQUIREMENTS_PRD.md and docs/06_API_CONTRACT.md. Validate every request on the server, save to PostgreSQL first, generate a public reference, enforce rate limits and record the required consent version. Keep internal notes private. Add negative permission tests and an end-to-end test from visitor submission to owner review. Optional integrations must not break lead persistence.
```

### Later modules
Use the feature's relevant document and one phase at a time: clients/projects/tasks; CMS; Sheets/email integrations; quotations; production hardening.

## Required response after every phase
1. Summary of implemented requirements/IDs.
2. Files added/modified.
3. Database migrations and environment variables added.
4. Tests actually run with exact pass/fail results.
5. Manual checks performed.
6. Known limitations and remaining issues.
7. Security implications.
8. Recommended next phase.

## Do not accept these shortcuts
- Static dashboard with hard-coded metrics instead of real database queries.
- Frontend-only validation or permission checks.
- Client-provided role as authority.
- Public signup that can set owner/admin role.
- Service-role key in browser code.
- Spreadsheet used as the only database.
- Fire-and-forget API calls without failure state for critical sync.
- Dummy “success” notifications when provider credentials are missing.
- Fake client logos, reviews, project results or analytics numbers.
- Claiming deployment, security audit, compliance or tests without evidence.
