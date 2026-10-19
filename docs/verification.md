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
