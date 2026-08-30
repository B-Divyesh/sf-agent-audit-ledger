# Independent verification 6 — FAIL

**Candidate:** `ac5cc2135f11c42ef6b68e5b25746b6d023205e2`  
**Live URL:** https://agent-audit-ledger.sociobot.in/  
**Verified:** 2026-08-30 UTC from a clean checkout

## Verdict

**FAIL — do not release as-is.** The real CLI, browser workbench, demo,
deployment, privacy behavior, accessibility, offline reload, rate limiting,
and performance all work. The candidate nevertheless misses mandatory
plain-words and site-skeleton requirements: it publishes metaphorical/
non-informative copy and omits the required Param Factory attribution and
version/build identity from every footer.

## First-read result

Cold live landing page: this is a tool for engineers reviewing
agent-assisted patches; it creates evidence of what changed, why, and what
ran. The first action is **Try it with sample data**, which says it opens a
finished ledger with four sample events. One click opened `/demo` with the
persistent **Demo — sample data, nothing is saved** banner, seeded one-file /
three-evidence ledger, **Reset demo**, and **Start for real**. This mandatory
first-screen and demo gate passes.

## Required claim checks — run first

After `npm ci`, every exact command in `.factory/claims.json` passed from the
shipped demo entry point:

| Claim | Result |
| --- | --- |
| `demo-sandbox` | PASS — 2 Playwright projects |
| `browser-local-only` | PASS — 2 Playwright projects |
| `offline-reload` | PASS — 2 Playwright projects |
| `exports-markdown-json` | PASS — 2 Playwright projects |
| `cli-demo` | PASS |
| `redaction-default` | PASS |
| `content-exclusion` | PASS |
| `cli-local-only` | PASS |
| `open-event-schema` | PASS |
| `manifest-signing` | PASS |

The published privacy/content-capture assertions are covered by the latter
claims; no unlisted functional claim was identified in the landing page or
README during this review.

## Passing evidence

- `npm ci` completed with 0 audit vulnerabilities. `npm test` passed 13 Rust
  workflow tests, one doctest, and 22 Node tests. `npm run check` passed
  rustfmt, Clippy with warnings denied, and the full test suite.
- `npm run test:e2e` completed 30 browser tests across desktop and 390 px
  mobile (`test-results/.last-run.json`: `passed`). `npm run build` produced
  `dist/bin/aal` and `dist/site`; `npm run pack:cli` produced the Linux
  archive. `cargo package --locked` packaged 12 files and verified its build.
- A fresh consumer unpacked the archive and successfully ran `aal --help`,
  `aal schema`, `aal demo --json-output`, `aal build`, and `aal verify`.
  A deliberately incomplete consumer input first failed clearly for its
  missing file, then a corrected one produced and verified a one-file,
  three-evidence ledger.
- Live functional QA on desktop and 390×844 mobile built the seeded demo,
  downloaded `agent-audit-ledger.md` and `agent-audit-ledger.json`, rejected
  malformed JSON with `Line 1 is not valid JSON.`, and reset back to the
  seeded ledger. No horizontal overflow, page errors, or console errors were
  observed. Keyboard Tab begins at the skip link; the file picker focus is
  visible. Reduced motion yields `scroll-behavior: auto` and a `0.00001s`
  transition.
- Independent Axe scans of `/`, `/demo`, `/privacy/`, `/terms/`, and
  `/404.html` found zero serious or critical violations. Each checked page has
  one h1 and a main landmark.
- `/opt/fleet/lib/verify-url.sh` passed on live `/demo`: HTTP 200, title
  `Demo — Agent Audit Ledger`, `lang=en`, one h1, a main landmark, no missing
  image alternatives or unlabeled buttons, and zero console/page errors.
- A fresh live demo context made only same-origin requests through load,
  ledger build, and export. A separate service-worker-controlled context
  reloaded the seeded `/demo` ledger offline. No analytics, font CDN, or other
  third-party request occurred in this flow.
- `npm run test:billing:live` passed: checkout returns a 303 to hosted Dodo.
  The explicit invalid-license verification response was JSON with
  `Cache-Control: no-store`. A single client received 200 for requests 1–30;
  request 31 and requests 32–35 returned **429** with `Retry-After: 3/3/2/2`.
  Observed allowance: 30 requests per active window. There is no product
  sign-in flow.
- Live `/not-a-real-route` returns HTTP 404 with the styled not-found page;
  `/staticwebapp.config.json` also returns 404. Response headers include a
  response-header CSP with `frame-ancestors 'none'`, HSTS,
  Permissions-Policy, `nosniff`, and strict-origin referrer policy. HTML is
  30-second must-revalidate; hashed assets are one-year immutable; `sw.js` is
  no-store.
- All 20 public deployed files, excluding the intentionally private Static
  Web Apps config, match `dist/site` byte-for-byte by SHA-256/cmp. Initial JS
  is 16,001 B raw; CSS is 16,956 B raw, both comfortably within budget. Live
  mobile Lighthouse: Performance 98, Accessibility 100, Best Practices 100,
  SEO 100; FCP 1.0 s, LCP 1.3 s, CLS 0, TBT 170 ms.

## Defects

### Medium — release-blocking plain-words violations

The mandatory plain-words skill disallows metaphor/brand-lore copy and
requires section headings to name their information. The landing page instead
uses lines such as “A patch is a destination. The ledger preserves the path.”
and labels such as “Review field note”, “The real instrument”, and “Own the
workflow” ([site/index.html](../site/index.html)). These do not state what the
section contains and several would make sense on an unrelated product. Replace
them with concrete headings and sentences, then refresh `.factory/copy-audit.md`.

### Medium — release-blocking footer is missing required factory/build identity

The required site skeleton calls for every footer to include **Built by Param
Factory** and a version/build ID. The live footer instead ends at “© 2026
Sociobot · MIT licensed”; legal routes end at “© 2026 Sociobot”
([site/index.html](../site/index.html), [site/privacy/index.html](../site/privacy/index.html),
[site/terms/index.html](../site/terms/index.html)). Add the required
attribution and a candidate build identifier consistently to all routes.

### Low — social preview is not the required 1200×630 asset

The only Open Graph/Twitter image is `evidence-orchard.webp`, declared and
shipped as 1200×800 ([site/index.html](../site/index.html)); the mandatory site
metadata contract requires a real 1200×630 product-derived social image. Add
a correctly sized original export and point both OG and Twitter metadata at it.

## Retest

Run every command in `.factory/claims.json` first, then `npm run check`,
`npm run test:e2e`, `npm run build`, `npm run pack:cli`, and
`cargo package --locked`. Recheck the cold first screen, all footer routes,
the copy audit, and the deployed social metadata after publishing.
