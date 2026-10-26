# The HookMedia SEO audit

Audit baseline: 26 October 2026. Production checked at `https://the-hok-me.vercel.app/`; repository checked at commit `c43759b` before this SEO implementation. HTTP checks were unauthenticated, so no private dashboard data was accessed.

## Findings and evidence

| Area | Evidence at baseline | Impact | Action |
| --- | --- | --- | --- |
| Homepage metadata | HTML title and description existed; build generated canonical, Open Graph and Twitter tags when `SITE_URL` was set. | Search/social snippets had a foundation, but production URL depended on deployment configuration. | Keep unique metadata and use a documented production fallback, with `SITE_URL` override. |
| Google verification | User supplied file was available; its SHA-256 matched the repository copy (`5EFA0244F358A466EEE2D2EE0185A585E37EE3047E605B68D91E77611B68C8C1`). The build did not copy it to `dist`. | Google could not fetch the required root-level token on future deployment. | Include the unchanged file in every build and verify the deployed response. |
| Crawl/index files | `robots.txt` allowed the site but disallowed `/owner.html`; sitemap was build-generated only when `SITE_URL` existed. | Private owner route was excluded from crawler access, preventing it from reading its `noindex`; absent environment configuration could omit sitemap generation. | Allow the page to be crawled so its `noindex,nofollow` can be read, disallow internal APIs, always generate sitemap. |
| Public routes | Homepage, Careers, Privacy, Journal and custom 404 existed. Live `/services/video-editing` returned 404. | Major service intents had no dedicated crawlable landing pages. | Add 14 distinct, linked service pages with unique content and canonical URLs. |
| Page content and headings | Homepage had one main H1 and service sections; career/privacy/journal pages had their own H1. | Homepage introduced services but did not resolve each service intent in a separate URL. | Preserve the designed homepage and add a service directory plus individual pages. |
| Structured data | Production build generated Organization and WebSite JSON-LD on the homepage. No address, phone, reviews, or ratings were represented. | Basic entity context was present; service pages lacked service-level structured data. | Retain verified Organization/WebSite schema and add Service schema only on relevant service pages. |
| Portfolio claims | The existing portfolio labels its visuals as concept studies, not client work; the page says the gallery is being prepared. | Clear anti-fabrication disclosure. | Preserve the disclosure; do not add invented clients, outcomes or testimonials. |
| Owner privacy | `/owner.html` contains a `noindex,nofollow` directive and requires authentication for API data. It is not in the sitemap. | Keep internal dashboard out of search results and sitemap while retaining application access. | Preserve route privacy and sitemap exclusion. |
| Forms and conversions | Existing inquiry endpoints validate and store leads; no analytics provider or conversion events were configured in the repository. | No verified analytics data is available for conversion reporting. | Leave analytics unconfigured; add a provider only with real credentials and appropriate privacy/consent handling. |
| Mobile, accessibility, motion | Existing site includes responsive styles, skip links, accessible menu state, focus styling and reduced-motion CSS. | Baseline supports mobile/accessibility behavior, but no device lab or field metrics were available during this audit. | Preserve the Stitch design and existing motion; service pages reuse responsive styles. Run device/field checks after release. |
| Images and performance | Homepage contains CSS-built visual scenes and an interactive Three.js hero loaded from a CDN; SVG brand assets are used. | Actual Core Web Vitals are not inferable from source alone; third-party Three.js/font loading can affect performance. | Preserve the artwork and avoid unsupported performance claims; measure with PageSpeed/Search Console after deployment. |
| Redirects and errors | Baseline service URL returned 404; standard pages and robots/sitemap returned 200. | Missing service URLs blocked crawling. | Add real static routes, and verify production status/redirect behavior after deploy. |

## Scope and limitations

- No Google Search Console account was connected; verification and indexing were not claimed.
- No analytics or keyword platform credentials were present. Search volume, difficulty, CPC, rankings and traffic are not estimated.
- No field Core Web Vitals or Lighthouse score is claimed. A Lighthouse/device run and Search Console field data remain follow-up measurements.
- The website is a static HTML application with Vercel Functions, not a Next.js app. SEO is implemented in its existing build pipeline without a framework migration.
