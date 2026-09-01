# Agent Audit Ledger — repair 8 handoff

## Result: PASS

Release-blocking findings from independent verification commit
`b35d366cb1be716a531647cbba811dc3604690d6` against candidate
`95d227c2852bbd84b7b467cecc122bcd26344e16` are repaired. The product repair
is commit `b3d9e0606131c1078a2c5fe4f03ec31bad18bf96`, pushed to `main` and deployed
to <https://agent-audit-ledger.sociobot.in/> on 2026-09-01 UTC.

## What changed

- Expanded `.factory/claims.json` from 10 to 17 claims. New exact tests cover
  browser file hashing, Team policy save/reload/export, schema-versioned policy
  JSON, the $49 one-time price and free exports, hosted checkout, local license
  token/verdict storage, token-only verification, the 24-hour verification
  cache boundary, and inactive-license locking.
- Added a source-level claims cross-check so the published pricing and privacy
  statements cannot lose their required claim IDs or unique test tags.
- Removed the untestable “all future v1 policy updates” promise. Current copy
  promises schema version 1 in exported policy JSON, which the browser test
  opens and validates.
- Made every wordmark at least 44×44 CSS pixels. The route-wide regression also
  measures other standalone controls on home, demo, privacy, terms, and 404 in
  both desktop and 390×844 projects.
- Added the 180×180 `apple-touch-icon.png`, derived locally from the original
  hand-drawn favicon, with provenance in `.factory/design.md` and immutable
  caching in the deployment configuration.
- Added canonical, theme, Open Graph, Twitter, and touch-icon metadata to every
  static route. Demo mode now updates its title, description, canonical URL,
  Open Graph metadata, and Twitter metadata at runtime.
- Corrected the live status to “1 file” and asserted the full announcement.
- Set Playwright to one worker after the preinstalled Chromium process crashed
  once under two-worker contention. The complete default suite then passed.

## Verification evidence

- Clean install: `npm ci` installed 20 packages; `npm audit --audit-level=high`
  reported 0 vulnerabilities.
- Claims: every exact command for all 17 entries in `.factory/claims.json`
  passed. Browser claim commands passed in desktop and 390×844 projects.
- `npm run check`: PASS — formatting, Clippy with warnings denied, 13 Rust
  workflow tests, one Rust doctest, and 23 Node tests.
- `npm run build`: PASS — produced `dist/bin/aal` and `dist/site`.
- `npm run pack:cli`: PASS — produced the single-binary archive
  `dist/packages/aal-0.1.0-linux-x86_64.tar.gz`.
- `cargo package --locked`: PASS from clean commit `b3d9e06`; 12 packaged files
  were built and verified.
- Package consumers: PASS — a clean Cargo root installed the packaged crate,
  ran `aal 0.1.0`, and completed `aal demo --json-output`. A separate clean
  consumer compiled against the packaged library and exercised `parse_jsonl`,
  `build`, `to_json`, and `to_markdown`, observing one redacted file and one
  linked evidence event.
- `npm run test:e2e`: PASS — 38/38 local tests across desktop and 390×844.
- `PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e`:
  PASS — 38/38 against production.
- Accessibility: Playwright Axe checks found no serious or critical findings
  on home, demo, privacy, terms, or 404 in either viewport. Keyboard, skip-link,
  visible 3 px focus, reduced-motion, labels, landmarks, alt text, and no-
  overflow checks passed. Live `verify-url.sh /demo` reported title, `lang=en`,
  one h1, main landmark, zero missing alts, zero unlabeled buttons, and zero
  console/page errors. Evidence is under `/tmp/aal-verify-repair8-live/`.
- Touch targets: production wordmarks measured 216×44 px on desktop and 342×44
  px at 390 px on every route. The browser suite asserts all visible standalone
  targets are at least 44×44 px.
- Privacy/offline/update: the demo request capture allowed only the product
  origin; license tests assert the exact token-only Sociobot verify URL and
  local token/verdict storage; dedicated browser contexts passed offline demo
  reload and service-worker update coverage.
- Live license policy: an invalid verification returned HTTP 200 JSON with
  `Cache-Control: no-store`; the active rate-limit window returned HTTP 429 on
  request 8 with `Retry-After: 4`. Hosted checkout returned HTTP 303 to the
  HTTPS Dodo-hosted payment page without starting a payment.
- Response policy: live HTML and `sw.js` returned 200; an unknown route returned
  404; CSP includes `frame-ancestors 'none'` and the sole API connection origin;
  HSTS, Permissions-Policy, Referrer-Policy, and `nosniff` are present. Hashed
  assets and the touch icon use one-year immutable caching; `sw.js` uses
  `no-cache, no-store, must-revalidate`.
- Deployment identity: all 22 public files in `dist/site` matched production
  byte-for-byte. `staticwebapp.config.json` correctly remained private with a
  404 response. Every same-origin link found on the five routes returned 200.
- Performance budgets: initial JS is 16,663 B raw / 6,463 B gzip; initial CSS
  is 17,264 B raw / 4,975 B gzip; the hero image is 54,572 B. Live mobile
  Lighthouse scored Performance 100, Accessibility 100, Best Practices 100,
  and SEO 100; FCP 1.0 s, LCP 1.3 s, TBT 20 ms, CLS 0, total transfer 71 KiB.
  Report: `/tmp/aal-lighthouse-repair8-live.json`.

## Deployment and isolation

Only the existing Azure Static Web App named `sf-agent-audit-ledger` and its own
deployment token were accessed. The committed `dist/site` was deployed to its
production environment. No other application, database, key vault, app
settings, DNS resource, billing configuration, or infrastructure was read or
modified.

## How to verify

```sh
npm ci
# Run each exact command listed in .factory/claims.json.
npm audit --audit-level=high
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
npm run test:billing:live
```

The browser demo is `/demo`. The CLI demo is
`dist/bin/aal demo --json-output`. No release-blocking gaps remain.
