# UX, Sitemap and Content Specification

## 1. Brand system
- Name: The HookMedia
- Tagline: “Hook Attention. Build What's Next.”
- Positioning: creative production + growth marketing + software + AI automation
- Palette: background `#0B0D0F`, surface `#15181B`, text `#FFFFFF`, secondary `#A5ABB2`, lime `#C6FF4D`, border `#30353A`.
- Logo: minimalist wordmark and optional hook/H monogram. Do not reuse unlicensed brand artwork.
- Typography: modern sans-serif; use locally hosted or properly licensed fonts and good fallbacks.

## 2. Public sitemap
```text
/
├── /services
│   └── /services/[slug]
├── /work
│   └── /work/[slug]
├── /about
├── /blog
│   └── /blog/[slug]
├── /contact
├── /privacy
├── /terms
├── /thank-you/[reference]  (or a confirmation view without sensitive reference leakage)
└── /not-found

/owner
├── /login
├── /dashboard
├── /leads
│   └── /leads/[id]
├── /clients
│   └── /clients/[id]
├── /projects
│   └── /projects/[id]
├── /tasks
├── /services
├── /portfolio
├── /blog
├── /quotations
│   └── /quotations/[id]
├── /team
├── /settings
│   └── /integrations
└── /audit-logs
```

## 3. Homepage structure
1. Header with wordmark, Services, Work, About, Blog and Start a Project CTA.
2. Hero headline: “Your Vision. Our Creative & Technology Engine.”
3. Subhead about content, growth marketing, development and AI automation.
4. Primary CTA “Start a Project”; secondary CTA “Explore Our Work”.
5. Service category grid.
6. Selected work section only with genuine published projects; otherwise a transparent capability preview.
7. Working process (Discover → Plan → Create/Build → Review → Launch/Optimise).
8. Industries served only where the agency can support them.
9. Genuine testimonials only with permission.
10. FAQ.
11. Final CTA and contact details.
12. Footer with policies, social links and contact channels.

## 4. Services categories
- Video & Content: video editing, reels/shorts, content repurposing, content marketing
- Creative & Production: graphic design, brand identity, model/product/brand photoshoots, motion graphics, 3D animation
- Growth Marketing: social media management, Meta Ads, Google Ads, SEO, lead generation, CRO
- Digital Products: websites, landing pages, e-commerce, apps, SaaS
- AI & Automation: AI agents, chatbots, business automation, CRM/workflow integrations

Every service detail page needs: purpose, deliverables, process, optional timeframe/starting price, related genuine work, FAQs and a relevant CTA. Do not guarantee rankings, leads or financial results.

## 5. Inquiry form UX
- Multi-step progressive form, with clear step indicator and ability to go back.
- Keep required fields minimal; mark optional fields clearly.
- Explain why budget/timeline helps prepare an appropriate proposal.
- Client-side validation for usability and server validation for security.
- Consent checkbox references the current privacy notice and is not pre-checked.
- Success state shows confirmation reference, expected response wording only if the agency can honour it, and an alternate contact option.
- Error state preserves safe form values where appropriate; do not expose backend exception text.

## 6. Owner portal UX
- Clear sidebar/top navigation and role-aware menus.
- Dashboard cards must come from real queries, with labels and date filters.
- Lists include filters, pagination, loading, empty and error states.
- Lead detail: contact information, requested services, description, status, owner, follow-up, private notes and timeline.
- Project detail: milestones, tasks, members, due dates, priority and allowed project activity.
- Settings distinguish editable business settings from secret configuration. Show integration connected/error/missing-configuration status, never the raw key.
- Destructive/high-impact changes require confirmation and server-side policy check.

## 7. Accessibility and responsive requirements
- Semantic landmarks and heading hierarchy.
- Keyboard operability and visible focus.
- Labels and error associations for all controls.
- Colour contrast checked against WCAG 2.2 AA targets.
- Do not convey status only by colour; use text/icon labels too.
- Respect reduced motion; avoid scroll hijacking.
- Touch targets and mobile layouts suitable for phones.
- Test zoom/reflow, forms, modals, menus and tables with keyboard and a screen reader where possible.

## 8. SEO/content integrity
- Unique title/description/canonical metadata per public page.
- Sitemap and robots policy that excludes owner/internal routes.
- Structured data only where content genuinely qualifies.
- Publish only approved content; provide draft preview behind authentication.
- Do not fabricate clients, campaign metrics, star ratings, logos, testimonials or awards.
- Ensure all imagery has meaningful alt text where informative and empty alt text where decorative.
