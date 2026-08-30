# Independent verification 5 — FAIL

**Candidate:** `8cbadf1d0dabc8ee43af1dfb24a815ce4174db58`  
**Live URL:** https://agent-audit-ledger.sociobot.in/  
**Verified:** 2026-08-30 UTC, from this clean candidate checkout

## Verdict

**FAIL — do not release yet.** The real CLI workflow, package archive, browser
demo, live deployment identity, accessibility, privacy request flow, offline
reload, security headers, cache policy, checkout, and endpoint rate limit all
passed. The candidate nevertheless fails the mandatory claims contract: it
publishes additional privacy/content-capture claims in the README and privacy
policy without corresponding entries and exactly-one tagged demo tests in
`.factory/claims.json`. The live site also has no real 404 response.

## Required claim checks — run first

`.factory/claims.json` exists and all eight listed commands passed after
`npm ci`:

| Claim | Result |
| --- | --- |
| `demo-sandbox` | PASS — 2 Playwright projects |
| `browser-local-only` | PASS — 2 Playwright projects |
| `offline-reload` | PASS — 2 Playwright projects |
| `exports-markdown-json` | PASS — 2 Playwright projects |
| `cli-demo` | PASS |
| `redaction-default` | PASS |
| `open-event-schema` | PASS |
| `manifest-signing` | PASS |

The first cold live screen passes the plain-words and demo gate. It says
“Review agent-assisted patches with evidence,” identifies engineers reviewing
agent-assisted patches, and offers **Try it with sample data**. One click
opened `/demo` with the persistent “Demo — sample data, nothing is saved”
banner, a seeded one-file/three-evidence ledger, Reset demo, and Start for
real.

## Passing verification evidence

- `npm ci`, `npm audit --audit-level=high` (0 vulnerabilities), `npm test`,
  and `npm run check` passed. The latter includes rustfmt, Clippy with warnings
  denied, 13 Rust workflow tests, one doctest, and 20 Node tests.
- Exact production build `npm run build` passed and produced `dist/bin/aal`
  and `dist/site`. `npm run pack:cli` produced the Linux archive.
- Local and live `npm run test:e2e` both ran 26 tests across desktop and
  390×844 mobile and finished with `test-results/.last-run.json` status
  `passed`. `npm run test:billing:live` passed; checkout redirects to the
  hosted Sociobot payment page.
- A fresh consumer unpacked `dist/packages/aal-0.1.0-linux-x86_64.tar.gz`.
  Its `aal --help`, `aal demo --json-output`, `schema`, and a normal consumer
  crate using public `parse_jsonl`, `build`, `to_json`, and `to_markdown`
  passed. Invalid calendar dates and dangling evidence references exit 1 with
  clear errors.
- Live and local production files are identical by SHA-256 for all 17 deployed
  files: HTML/legal pages, emitted JS/CSS/maps, demo bootstrap, service worker,
  schema, media, robots, sitemap, and favicon. `staticwebapp.config.json` is
  correctly not a public asset.
- A fresh live browser context made requests only to
  `https://agent-audit-ledger.sociobot.in` through load, demo opening, exports,
  and ledger build. There were zero console/page errors. Markdown and JSON
  downloads were named `agent-audit-ledger.md` and
  `agent-audit-ledger.json`.
- Independent Axe scans of `/`, `/demo`, `/privacy/`, and `/terms/` found zero
  serious/critical violations. `verify-url.sh` passed for `/demo`: title,
  `lang=en`, one h1, main landmark, zero missing image alts, zero unlabeled
  buttons, and zero console/page errors. Keyboard Tab reached the hidden file
  input with a visible 3px solid focus ring on its 44px label. The 390px view
  had no horizontal overflow. Reduced motion produced `scroll-behavior: auto`
  and a `0.00001s` transition.
- A service-worker-controlled fresh browser context loaded `/demo`, went
  offline, and successfully reloaded the seeded ledger. `registration.update()`
  coverage is in the passing suite.
- Headers include CSP with response-header `frame-ancestors 'none'`,
  Permissions-Policy, HSTS, strict-origin Referrer-Policy, and `nosniff`.
  HTML uses 30-second must-revalidate caching; emitted assets, WebP, and WebM
  are one-year immutable; `sw.js` is `no-cache, no-store, must-revalidate`.
  Initial JS is 16,001 B raw / 6,322 B gzip; total CSS is 16,956 B raw /
  4,901 B gzip; the LCP WebP is 54,572 B. All are within budget.
- The real documented license verification endpoint accepted 30 requests from
  this single client, then request 31 returned **429** with `Retry-After: 3`.
  Requests 32–35 remained 429 (Retry-After 3/3/3/2). Observed allowance: 30
  requests per active window. Its normal success response has `Cache-Control:
  no-store`.

## Defects

### Blocker — published privacy/content claims are not in the claims ledger

The claims skill requires every visitor-reliant landing/README claim to have a
claim entry and exactly one `@claim:<id>` observable test; an unlisted claim
fails review. The manifest has no claim/test for the README assertion that
“File contents and prompts are never copied into the ledger”
([README.md](../README.md#L48)), nor for the privacy policy's CLI assertion
that it sends no events, hashes, paths, prompts, file contents, or usage
telemetry ([site/privacy/index.html](../site/privacy/index.html#L13)).
`redaction-default` only proves path and command-argument redaction, and
`browser-local-only` only records a browser demo flow; neither establishes the
omitted CLI/content claims.

Add narrowly worded claims plus one tagged, observable demo-entry test each
(or remove/narrow the public statements). Include prompt rejection and absence
of selected-file content in both JSON and Markdown exports, and a CLI
local-only/no-telemetry test appropriate to the published guarantee.

### Medium — unknown URLs return the landing page with HTTP 200, not a real 404

`GET /not-a-real-route` returned HTTP 200 and the home document/title. There
is no `404.html` in `dist/site`; `staticwebapp.config.json` only has a blanket
navigation fallback. This violates the required real, styled 404 route and
makes broken links invisible to people and crawlers. Add the product-styled
404 page and a Static Web Apps `responseOverrides` 404 rewrite that retains a
404 status, then test it live.

### Medium — standard Cargo packaging fails after the documented npm install

After the required `npm ci`, exact `cargo package --locked` failed because
Cargo sees 34 ignored `node_modules/**/{LICENSE,README,...}` files as dirty.
`cargo package --locked --allow-dirty` succeeds but packages 46 files / 74.6
KiB, including those third-party documentation files, rather than a clean
crate-only package. Make the ready-to-publish command work after the documented
development setup and ensure dependency installation cannot contaminate the
crate archive.

## Retest

After repair, rerun every `.factory/claims.json` command first, then:

```sh
npm ci
npm audit --audit-level=high
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
npm run test:billing:live
```

Repeat the real 404 response check, package-content inspection, live file
checksum comparison, offline reload, and 31-request rate-limit check.
