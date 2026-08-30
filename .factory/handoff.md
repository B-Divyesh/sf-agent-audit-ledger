# Agent Audit Ledger — repair 6 handoff

## Result: PASS

Work order `agent-audit-ledger-repair-6` repaired every finding in
`.factory/verification-5.md` for candidate
`8cbadf1d0dabc8ee43af1dfb24a815ce4174db58`. The implementation commits are
`fb0a73f`, `e807fc9`, and `3703a4f`; this handoff and the rebuilt archive are
recorded in the following handoff commit. All commits were pushed to
`origin/main`.

The Rust CLI/library artifact and Azure Static Web Apps deployment class are
unchanged. The researched brief and Evidence Orchard visual thesis are
preserved.

## Repairs and exact regression coverage

1. **Privacy/content claims:** `.factory/claims.json` now lists ten claims.
   `@claim:content-exclusion` builds Markdown and JSON from a file containing a
   unique private marker, proves neither export contains it, and proves a
   `prompt` field is rejected without writing output. `@claim:cli-local-only`
   runs the compiled demo under an `LD_PRELOAD` network guard that blocks and
   records IPv4, IPv6, and DNS calls; the complete demo succeeds without a
   recorded call. The manifest regression still requires exactly one tagged
   test per claim.
2. **Real 404:** the site now ships a responsive, keyboard-accessible
   `404.html`. Static Web Apps rewrites only the real `/demo` route and uses a
   `responseOverrides.404` rewrite for missing paths, preserving HTTP 404. The
   service worker precaches the 404 document and returns status 404 for unknown
   offline navigations. Unit coverage asserts the deployment rule, normalized
   route uniqueness, cache update, document structure, and status-preserving
   offline code; Playwright covers its title, heading, home link, mobile
   overflow, and Axe result.
3. **Cargo package contamination:** all `package.include` patterns are rooted
   with `/`. After `npm ci`, `cargo package --locked` now packages and verifies
   12 project-owned files only. No `node_modules` file enters the crate.
4. **Deployment validator:** Azure normalizes `/demo` and `/demo/` to the same
   route. The first repair upload was rejected before publication because both
   were listed. The redundant rule was removed and a normalized-route
   uniqueness regression was added. The next deployment succeeded.
5. **Update coverage:** the dedicated offline claim now calls
   `registration.update()`, checks the active `/sw.js`, then reloads the seeded
   demo offline in its own browser context.

## Verification evidence

### Clean install, claims, CLI, crate, and package

- `npm ci` passed from the final pushed tree; `npm audit --audit-level=high`
  reported 0 vulnerabilities.
- Every command in `.factory/claims.json` passed first. The four browser claim
  commands each passed in Desktop Chrome and the 390 by 844 mobile project.
  The six CLI claim commands passed independently.
- `npm run check` passed: rustfmt, Clippy with warnings denied, 13 Rust workflow
  tests, one doctest, and 22 Node tests.
- `npm run build` passed and produced `dist/bin/aal` plus `dist/site`.
  `npm run pack:cli` produced
  `dist/packages/aal-0.1.0-linux-x86_64.tar.gz`.
- `cargo package --locked` passed after `npm ci`: 12 files, 78.7 KiB unpacked,
  21.4 KiB compressed, followed by a successful crate verification build.
  `cargo package --locked --list` contains only Cargo metadata plus the root
  README, license, changelog, source, tests, example, and schema.
- A fresh consumer used the packaged crate's public `parse_jsonl`, `build`,
  `to_json`, and `to_markdown` API. A separately unpacked release archive
  passed `aal --help`, `aal demo --json-output`, and `aal schema`; the demo
  reported one file and three evidence records.

### Browser, accessibility, privacy, offline, and update

- Final local production Playwright: 30/30 passed across desktop and 390 px
  mobile. Final live Playwright: 30/30 passed; the final service-worker update
  and offline claim was then rerun live and passed 2/2.
- Coverage includes empty/error states, dangling evidence, redaction, file
  hashing, license caching, both downloads, demo reset/exit isolation, browser
  request capture, skip-link order, visible 3 px file-picker focus, 44 px
  targets, reduced-motion CSS, no horizontal overflow, offline reload, and all
  routes.
- Playwright Axe found zero serious or critical issues on the populated home
  workbench, `/demo`, `/privacy/`, `/terms/`, and `/404.html` in both browser
  projects. Every page has `lang=en`, one `h1`, a `main` landmark, labelled
  controls, and image alternatives.
- `/opt/fleet/lib/verify-url.sh` passed on live `/demo`: HTTP 200,
  `Demo — Agent Audit Ledger`, `lang=en`, one `h1`, a main landmark, no missing
  image alt text, no unlabelled buttons, and zero console/page errors.
- The browser-local claim observed only the product origin during the complete
  seeded demo flow. The CLI network guard observed no internet socket or DNS
  call. The dedicated browser context updated the active worker, switched
  offline, and reloaded the one-file seeded ledger successfully.

### Deployment, response policy, identity, and performance

- Deployed the exact `dist/site` directory with the work-order static deployer
  to Azure deployment `66836bca-e5ca-4c7b-8517-93de6cb85b63`. The default host
  is `ambitious-plant-082cc7a0f.7.azurestaticapps.net`; the production URL is
  https://agent-audit-ledger.sociobot.in.
- `GET /not-a-real-route` now returns **HTTP 404** with the shipped
  `Page not found — Agent Audit Ledger` document. `/demo` and `/demo/` both
  return 200. `/staticwebapp.config.json` is not public and returns 404.
- All 20 public production files matched `dist/site` byte-for-byte by SHA-256,
  excluding only the intentionally non-public Static Web Apps config.
- Live HTML uses `public, must-revalidate, max-age=30`; hashed JS/CSS and the
  hero image use one-year immutable caching; `sw.js` uses
  `no-cache, no-store, must-revalidate`. CSP includes response-header
  `frame-ancestors 'none'`; HSTS, Permissions-Policy, strict-origin
  Referrer-Policy, and `nosniff` are present.
- The license verification endpoint's normal response is JSON with
  `Cache-Control: no-store`. One client received 200 for requests 1–30 and 429
  with `Retry-After: 3` on request 31. The live checkout test passed and
  redirected to Sociobot's hosted Dodo checkout.
- Initial application JavaScript is 16,001 bytes raw / 6,324 bytes gzip. Total
  shared/home CSS is 16,956 bytes raw / 4,915 bytes gzip. The LCP WebP is
  54,572 bytes.
- Live mobile Lighthouse on `/demo`: Performance 99, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.02 s, LCP 1.29 s, TBT 93.5 ms, CLS 0.

## Commands

~~~sh
npm ci
npm audit --audit-level=high
# Run each command in .factory/claims.json.
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
npm run test:billing:live
~~~

## Known gaps and next steps

No release-blocking finding remains. Registry publication remains an owner
operation; the Cargo crate and Linux release archive are ready to publish. No
runtime model feature was added because this product's core job is
deterministic, local evidence generation and does not benefit from a model.
