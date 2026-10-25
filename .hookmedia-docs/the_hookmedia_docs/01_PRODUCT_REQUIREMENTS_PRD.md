# Product Requirements Document (PRD) — The HookMedia

## 1. Document control
- Product: The HookMedia digital agency website and operations portal
- Version: 1.0
- Owner: Agency owner (to be assigned)
- Status: Proposed baseline
- Primary currency: INR (configurable)
- Initial business timezone: Asia/Kolkata (configurable)

## 2. Product vision
Create one professional digital presence for The HookMedia and one secure internal workspace for capturing leads, managing client delivery, coordinating team workload, preparing quotations and keeping basic business content up to date.

**Brand positioning:** A creative, marketing, software development and AI automation agency for businesses, startups, creators and brands.

**Proposed tagline:** “Hook Attention. Build What's Next.”

**Visual direction:** Dark luxury with restrained futuristic details. Background `#0B0D0F`, surface `#15181B`, primary text `#FFFFFF`, secondary text `#A5ABB2`, accent `#C6FF4D`, border `#30353A`. Colours must be centrally tokenised and accessible contrast must be tested.

## 3. Problem statement
Agency leads can be lost when inquiry forms, email, WhatsApp messages, project tasks, portfolio updates and spreadsheets are disconnected. The website must help prospective clients understand services and submit structured requirements; the internal portal must make follow-up and delivery work visible and auditable.

## 4. Goals
1. Present The HookMedia's services credibly and professionally.
2. Convert visitors into structured project inquiries.
3. Store every valid inquiry reliably in PostgreSQL.
4. Give authorised staff a role-appropriate view of leads, clients, projects and tasks.
5. Make website services, portfolio, FAQs, testimonials and blog editable without code changes.
6. Provide a reliable, optional Google Sheets sync and CSV export.
7. Make the project maintainable, testable, responsive and secure.

## 5. Non-goals for the initial release
- Full accounting, invoicing ledger or tax filing.
- Online payment processing or storing card information.
- Full customer self-service portal with file approvals and billing.
- Automated campaign execution inside Meta/Google Ads accounts.
- Automatic AI lead scoring or AI-generated customer decisions.
- Full HR, payroll, attendance or salary management.
- Guaranteed search rankings, advertising results or business growth.
- Publicly exposing internal records, employee notes or financial records.

These may become later product phases following separate requirements and privacy/security review.

## 6. Personas
### Visitor / prospective client
Wants to understand service capability, see genuine work, understand the inquiry process and contact the agency with minimal friction.

### Owner
Needs business visibility, control over users/roles, lead follow-up, project status, team workload, content and settings.

### Admin / operations manager
Handles day-to-day leads, clients, project coordination and content within assigned permissions.

### Project Manager
Needs project timelines, milestones, tasks, assignments and overdue-work visibility.

### Specialist (editor, designer, developer, marketing specialist)
Needs assigned projects and tasks, due dates, requirements and allowed notes without seeing unrelated sensitive business information.

## 7. Service catalogue
- Video editing, reels, shorts, long-form editing, content repurposing
- Content marketing and social media management
- Model, product, brand and commercial photoshoots
- Graphic design, thumbnails, brand identity and motion graphics
- Meta Ads, Google Ads, paid campaigns and lead generation
- Technical, on-page and local SEO
- Website, landing-page and e-commerce development
- Android/iOS and cross-platform application development
- SaaS platform and dashboard development
- AI agents, chatbots, business and workflow automation
- 3D animation, product visualisation and explainer videos

Only claim services the team can actually deliver. Do not present sample/placeholder records as real customers or achieved results.

## 8. Scope and priority
### P0 — launch blocker
- Responsive public site and navigation
- Services listing and service detail pages
- Portfolio CMS with honest empty state
- Contact/project inquiry form
- Backend validation and persistence to PostgreSQL
- Inquiry confirmation/reference ID
- Owner login and secure session handling
- Role/permission checks and first owner bootstrap process
- Leads list/detail/status/notes/follow-up
- Database migrations, RLS, error handling, logs, backups plan
- Critical tests and deployment runbook

### P1 — core operations
- Client record and lead-to-client conversion
- Project, milestone, task and team assignment
- Service/portfolio/blog/FAQ CMS
- CSV export
- Email notifications if provider is configured
- Optional Google Sheets sync with retry and sync status
- Audit log for sensitive changes

### P2 — enhancements
- Quotations and print/PDF export
- Kanban board and advanced filters
- Analytics/consent configuration
- richer project media and structured case studies
- Optional client portal, approval flows and integration expansion after separate review

## 9. Main user journeys
### Visitor inquiry
Landing page → browse service → complete project inquiry wizard → server validation → database save → reference number shown → owner sees lead → follow-up recorded.

### Lead qualification
Owner opens new lead → reviews requirements → adds private note → contacts lead → sets status/follow-up → optionally converts qualified lead to client → creates project.

### Delivery workflow
Project created → manager assigns milestones/tasks → specialist updates task status → manager reviews → client feedback recorded internally → project completed.

### Content publishing
Author creates draft → editor/owner reviews → authorised person publishes → public page shows published version only.

## 10. Inquiry requirements
Required fields: name, email, selected service(s), project description, privacy-policy consent. Optional/configurable fields: company, phone, website/social profile, industry, budget band, timeline, reference links, preferred contact method.

Budget options are examples and must be configurable: under ₹10,000; ₹10,000–₹25,000; ₹25,000–₹50,000; ₹50,000–₹1,00,000; ₹1,00,000+; custom; prefer not to say.

Requirements:
- Validate with shared schema on client and server, but server validation is authoritative.
- Limit field length and reference URLs.
- Rate-limit and use appropriate anti-spam protection.
- Save valid data before attempting external sync or notification.
- Generate unpredictable or non-enumerable inquiry reference IDs.
- Return generic public errors that do not disclose database/internal details.
- Do not include private notes or other leads in the response.

## 11. Success metrics
Instrument only after analytics and consent configuration is correct.
- Inquiry form completion rate = successful inquiries / inquiry form starts.
- Valid inquiry rate = non-spam valid inquiries / all inquiry attempts.
- First-response SLA adherence = leads contacted within configured target / leads requiring contact.
- Lead-to-client conversion = won leads / qualified leads (define reporting window).
- On-time task completion = tasks completed by due date / tasks with due dates completed in period.
- Integration reliability = successful sync jobs / eligible sync jobs.

Do not set fabricated baseline values. Establish the baseline after real usage.

## 12. Acceptance criteria
- Public pages are responsive and accessible through keyboard navigation.
- Valid inquiry saves once and returns a reference number.
- Invalid or abusive submissions are rejected safely.
- An unauthenticated visitor cannot read or mutate owner records.
- A specialist cannot perform owner-only operations by calling the API directly.
- Role permissions are tested at API and data-layer level.
- Public CMS pages expose only published items.
- Sheet/email failure cannot erase a saved lead.
- Optional integrations can be disabled without breaking core functions.
- No production secret exists in Git history or client bundles.
- Release checks and rollback instructions are documented.

## 13. Assumptions and open business decisions
- Agency legal entity details, real email/phone/address and logo will be supplied by owner.
- The owner will nominate at least one recovery method for account access.
- Staff users will be invited, not publicly self-registered.
- Service prices are optional and are not contractual until accepted quotation terms exist.
- A legal/privacy reviewer should approve the final privacy notice, terms, retention schedule and consent language for actual operating jurisdictions.
