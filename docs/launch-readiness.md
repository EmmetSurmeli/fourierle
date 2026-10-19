# Fourierle launch review

Reviewed October 19, 2026 for the current personal, non-commercial static game at `fourierle.onrender.com`. This is a practical launch inventory, not a determination that every law in every visitor's jurisdiction applies.

## What is implemented

- A public [privacy notice](https://fourierle.onrender.com/privacy.html) describes browser-local progress, Render hosting requests, email contact, and the absence of accounts, ads and analytics. The notice is linked from the game footer.
- An [accessibility page](https://fourierle.onrender.com/accessibility.html) describes supported controls and the known visual-only puzzle limitation. It gives a public feedback address. The game has keyboard controls, reduced-motion support, a pause control, and labeled inputs, but **does not claim full accessibility**.
- A [credits page](https://fourierle.onrender.com/credits.html) links Natural Earth and includes the bundled runtime font, icon and React licenses. Natural Earth places its map data in the [public domain](https://www.naturalearthdata.com/about/terms-of-use/); attribution is voluntary.
- `404.html` and `500.html` are branded static files for hosts that support custom error assets. A client-side error boundary gives a reload path if React crashes. A missing Render URL currently returns a real 404 with Render's plain body; keep the correct status rather than rewrite missing URLs to a page that returns 200. [Google explains why a 200 error page is a soft 404](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors). [Cloudflare Pages](https://developers.cloudflare.com/pages/configuration/serving-pages/) and [Vercel](https://vercel.com/kb/guide/custom-404-page) can use the bundled `404.html` automatically.
- `robots.txt`, a one-page sitemap, canonical URL and social description are included. Update the canonical and sitemap if the primary domain changes.
- GitHub Actions builds and tests on push and pull request, audits dependencies at high severity, runs browser flows, and checks all 189 countries. Render deploys pushes to `main` after GitHub checks pass. The repository can stay private while the site is public.
- Render's dashboard has response headers for the live service. The equivalent Vercel and Cloudflare Pages header rules are in `vercel.json` and `public/_headers`. Render does **not** read the latter file; its [dashboard controls](https://render.com/docs/static-site-headers) must be maintained separately.

## Why the notice and access review matter

- The [European Commission](https://commission.europa.eu/law/law-topic/data-protection/information-business-and-organisations/application-gdpr_en) lists IP addresses as personal data. Even though guesses stay in the browser, the hosting provider handles ordinary web requests. Applicable privacy duties depend on the operator, activity and audience; do not promise that no data of any kind is processed.
- The [UK ICO](https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guide-to-pecr/cookies-and-similar-technologies/) says non-essential cookies and similar storage can require consent. Fourierle currently has no advertising or analytics storage. Reassess before adding any such service; do not add a decorative consent banner without an actual choice to manage.
- The [FTC COPPA guidance](https://www.ftc.gov/business-guidance/resources/childrens-online-privacy-protection-rule-not-just-kids-sites) calls for a separate review if a service is directed to children under 13 and collects personal information, or has actual knowledge it is collecting from a child. A geography game is not exempt merely because it is educational.
- [California's privacy rules](https://oag.ca.gov/privacy/ccpa) apply to qualifying businesses, not automatically to every personal site. Reassess if the project becomes commercial or starts collecting visitor information.
- The [US Department of Justice](https://www.ada.gov/resources/web-guidance/) identifies keyboard use, labels, contrast and text alternatives as accessibility considerations for covered public-facing sites. The visual puzzle remains a material limitation; a future text-based equivalent would require separate game design and testing.

## Before expanding the site

1. If adding accounts, payments, ads, analytics, emails or an age-targeted audience, map the new data flows and revise the notice **before** launch. Check whether consent, opt-out or other rights mechanisms become necessary.
2. If changing to a custom domain, verify DNS/TLS, update canonical and sitemap URLs, and check every policy and share link on the new origin.
3. Have a qualified accessibility reviewer test keyboard, screen readers, zoom and contrast; prioritize an equivalent nonvisual way to play before claiming WCAG conformance.
4. For jurisdiction-specific privacy or consumer-law obligations as the project grows, get legal advice based on the actual operator and audience. A custom error page and boilerplate Terms of Service are not substitutes for accurate data practices.
