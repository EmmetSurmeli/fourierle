# Release verification

Verified October 18, 2026 (America/New_York; October 19 UTC).

- 189 eligible countries generated from pinned Natural Earth 5.1.2 data.
- 5 Python mathematical/full-dataset tests passed.
- 13 Vitest engine/React tests passed.
- 21 Playwright tests passed **against the production build**: seven flows on desktop Chromium, mobile Chromium and mobile WebKit.
- TypeScript check and Vite production build passed.
- Schedule validated across 36,525 days. The fixed 189-day permutation cycle guarantees the no-repeat rule indefinitely.
- Dependency installation audit: zero known vulnerabilities.
- Visual inspection covered desktop, 375px mobile and 20 diverse countries at all six reconstruction stages. Browser checks additionally cover 320px and 768px widths.
- Sixth-stage exact reference fallback is used for all countries under the strict source-boundary threshold. Explorer curves remain genuine Fourier partial sums.

The application and documentation are pushed to GitHub. The separate private Sites publication could not complete: `git.chatgpt-team.site:443` timed out during source synchronization. No hosted deployment URL has been verified. The static build is ready for Vercel or Cloudflare Pages using the README instructions.

The GitHub Actions workflow is committed, but its remote run status was not independently verified from this environment. Local production-browser tests passed. Human difficulty studies and physical low-end mobile frame-rate testing remain future validation work.

## Exhaustive country audit

Follow-up verification on October 18, 2026 covered all 189 eligible countries:

- The pinned Natural Earth file matches its recorded SHA-256. Every eligible ID has exactly one index entry, one geometry asset, and one calibration report.
- Every serialized exterior ring matches the processed source to within 0.00000051 normalized units. Every serialized Fourier coefficient matches a fresh DFT to within 0.000000005 per component.
- All polygons are nonempty, valid, and inside the drawing bounds. The minimum retained exterior area is **99.505%** of the chosen source region. Canada, Greece, Indonesia and the Philippines gained additional independent island chains to meet this threshold.
- The six reported stage errors were recomputed from the serialized assets and agree within 0.000001. All 189 sixth-stage displays use the exact source outline under the strict fallback rule; the earlier stages remain genuine Fourier partial sums.
- A browser drew every country at each of the six stages: **1,134 visible canvases**, with no blank stages or geometry request errors. The smallest first-stage drawing, Vanuatu, covered 141 painted pixels in the calibration preview.
- The production build returned valid geometry payloads for all 189 countries.

The mathematical suite now has six passing tests. The exhaustive browser checks and production asset check are repeatable with `npm run test:all-countries` and are included in GitHub Actions. These tests establish consistency with the pinned 1:50m Natural Earth reference; they cannot establish player recognizability or settle disputed borders.
