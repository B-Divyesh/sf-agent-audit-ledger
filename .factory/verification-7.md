# Independent verification 7 — FAIL

**Candidate:** `95d227c2852bbd84b7b467cecc122bcd26344e16`  
**Live URL:** https://agent-audit-ledger.sociobot.in/  
**Verified:** 2026-09-01 UTC from a clean checkout

## Verdict

**FAIL — do not release this candidate yet.** The core CLI, library, browser
workbench, one-click demo, privacy behavior, package workflow, live deployment,
offline reload, and performance checks work. The candidate still fails the
mandatory claims contract because it publishes paid-feature and quantitative
license-check promises that are absent from `.factory/claims.json`. It also
misses the required 44×44 CSS-pixel target size for wordmark links and the
required 180 px Apple touch icon.

No product code was changed during this verification.

## First-read result

**PASS.** On a cold 1440×900 live visit, the first screen says:

- What it does: “Review agent-assisted patches with evidence.”
- Who it serves: engineers reviewing agent-assisted patches who need to see
  what changed, why, and what ran.
- What to do first: **Try it with sample data**, with the adjacent explanation
  that it opens a finished ledger with four sample events.

One activation opened `/demo`, changed the title to
`Demo — Agent Audit Ledger`, showed the persistent “Demo — sample data,
nothing is saved” banner, and displayed a finished one-file / three-evidence
ledger with **Reset demo** and **Start for real**.

## Required claim checks — run first

The first pre-install browser command could not launch because the clean clone
did not yet contain the local `@playwright/test` dependency. After the required
`npm ci`, all ten exact commands in `.factory/claims.json` passed. The browser
claims each passed in desktop Chrome and the 390×844 project.

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

The listed tests pass, but the cross-check against published landing, privacy,
and pricing copy found unlisted claims. That is a release-blocking result under
the claims acceptance contract; see Defects.

## Repository and package evidence

- `npm ci` completed from candidate commit
  `95d227c2852bbd84b7b467cecc122bcd26344e16`.
- `npm audit --audit-level=high` reported 0 vulnerabilities.
- `npm run check` passed `cargo fmt --check`, Clippy with warnings denied,
  13 Rust workflow tests, one Rust doctest, and 23 Node tests.
- Exact `npm run build` passed and produced `dist/bin/aal` and `dist/site`.
- `npm run pack:cli` produced
  `dist/packages/aal-0.1.0-linux-x86_64.tar.gz` containing one `aal` binary.
- `cargo package --locked` packaged 12 files and verified the crate build.
- A clean temporary Cargo root installed the packaged crate with
  `cargo install --locked`; the installed `aal 0.1.0` ran its JSON demo.
- A separate clean consumer compiled against the unpacked crate and exercised
  public `parse_jsonl`, `build`, `to_json`, and `to_markdown`. It reported one
  hashed file and two linked evidence records, with the path redacted.

The packaged binary also completed a representative four-event workflow with
one file, one command, one test artifact, and one delegated task. Its JSON and
Markdown did not include the source path, leading environment value, or test
artifact contents. Key generation created a mode-0600 private key; signed build
and pinned-key verification passed. Empty input, malformed JSON, an invalid
calendar time, a dangling file reference, a parent-directory path, and a
`prompt` field each exited 1 with an actionable error. Corrected input then
built and verified successfully.

## Browser, accessibility, privacy, and offline evidence

- Full local production QA: `npm run test:e2e` passed 32/32 tests across
  desktop and 390×844 mobile.
- Full live QA: the same 32/32 tests passed with
  `PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in`.
- The suites cover empty and malformed input recovery, dangling references,
  selected-file hashing, default redaction, both downloads, demo reset and
  isolation, keyboard focus, reduced motion, all legal/404 routes, service
  worker update, and offline demo reload.
- Independent Axe scans reported 0 serious or critical findings on the live
  demo at desktop and 390 px. The repository suite checks home, demo, privacy,
  terms, and 404 in both projects with the same result.
- `/opt/fleet/lib/verify-url.sh` passed live `/demo`: HTTP 200, title
  `Demo — Agent Audit Ledger`, `lang=en`, one h1, a main landmark, no missing
  image alternatives, no unlabeled buttons, and zero console/page errors.
- Keyboard-only operation reached the skip link first, then every header and
  hero link, **Load sample**, the workbench controls, and **Build the ledger**.
  Enter loaded and built the sample. Focus rings measured 3 px and remained
  visible. There was no keyboard trap.
- Reduced motion produced `scroll-behavior: auto` and a `0.00001s` transition.
  Desktop and 390 px had no horizontal overflow.
- A fresh live home-to-demo flow requested only the product origin. The
  browser workbench did not upload pasted/sample data. The only additional
  request during an explicit license check went to the documented
  `https://api.sociobot.in` origin. It returned JSON with `Cache-Control:
  no-store`; blank and invalid licenses produced clear recovery guidance.
- A cached valid license exposed the Team policy kit. Saving “Release review”
  persisted the expected local object, and export downloaded
  `aal-team-policy.json` with schema version 1 and the selected redaction
  settings.
- The product has no sign-in flow, so the Entra tenant requirement does not
  apply.

## Live deployment, headers, limits, and performance

- Every one of the 21 public files in `dist/site` matched the live file
  byte-for-byte by SHA-256. `staticwebapp.config.json` is intentionally not
  public and returned 404. This confirms the live deployment matches the
  candidate build.
- `/not-a-real-route` returned HTTP 404 with the styled not-found document.
  All same-origin links found across home, demo, privacy, terms, and 404
  returned 200.
- HTML uses `public, must-revalidate, max-age=30`; hashed JS/CSS and product
  WebP assets use one-year immutable caching; `sw.js` uses
  `no-cache, no-store, must-revalidate`.
- Live responses include a response-header CSP with `frame-ancestors 'none'`,
  HSTS, `Permissions-Policy`, `Referrer-Policy:
  strict-origin-when-cross-origin`, and `X-Content-Type-Options: nosniff`.
- The product license endpoint allowed 30 requests from one client in the
  observed window. Request 31 returned 429 with `Retry-After: 3`; requests
  32–35 also returned 429 with `Retry-After` values of 3–2 seconds.
- `npm run test:billing:live` passed: the advertised Sociobot checkout returned
  303 to the hosted checkout page.
- Initial application JS is 16,004 B raw / 6,323 B gzip. Initial CSS totals
  17,226 B raw / 4,973 B gzip. The LCP hero WebP is 54,572 B. All are below
  the product budgets.
- Live mobile Lighthouse wrote a complete report with Performance 97,
  Accessibility 100, Best Practices 100, and SEO 100. FCP was 1.004 s, LCP
  1.279 s, TBT 185 ms, CLS 0, and transferred bytes 72,020. The Lighthouse
  process reported a browser-tab close after writing the result; the JSON
  report was complete and readable.

## Defects

### Blocker — published paid and quantitative privacy claims are not in the claims ledger

The claims contract requires every statement a visitor can rely on to appear
in `.factory/claims.json` with exactly one tagged observable test. The pricing
section promises that the $49 Team policy kit saves named redaction policies,
exports policy JSON, reuses conventions, and includes future v1 updates
([site/index.html](../site/index.html#L104)). None appears in the ten-entry
claims ledger. The existing license tests are untagged and do not make these
published promises part of the mandatory claims run. “All future v1 policy
updates” is prospective and cannot be verified in the required sandbox.

The privacy page separately promises that license verification occurs “at
most once per day after any completed check”
([site/privacy/index.html](../site/privacy/index.html#L15)). This quantitative
claim is also absent from `.factory/claims.json`. There are unit checks for
cache behavior, but no claims entry or exactly-one `@claim:` test.

Add narrowly scoped claim entries and observable tagged tests for current paid
features and daily verification caching. Remove or replace the prospective
future-updates sentence with a statement that can be tested.

### Medium — wordmark links are below the required touch-target height

The shared `.brand` rule has no 44 px minimum target size
([site/src/style.css](../site/src/style.css#L1)). At a real 390×844 viewport,
the header and home/demo footer wordmark links measured 342×34 px. Privacy,
terms, and 404 footer wordmarks measured 342×27.9 px. Desktop header/footer
wordmarks were also only 34 px high. This misses the attached accessibility
and site-structure baseline of at least 44×44 CSS pixels even though the links
have visible focus rings and Axe does not classify the size as serious.

Give `.brand`/`.footer-brand` a minimum 44 px hit area and add a regression
that checks every standalone interactive target on every route, not only nav
links.

### Low — required Apple touch icon and route metadata are incomplete

The repository and live site contain the SVG favicon but no 180 px Apple touch
icon or `rel="apple-touch-icon"`, contrary to the site-structure contract.
Privacy and terms also omit canonical, Open Graph, Twitter-card, and
theme-color metadata while the home route supplies them
([site/privacy/index.html](../site/privacy/index.html#L3)). Add the original
product-derived touch icon and complete route-specific metadata.

### Low — singular success status uses plural “files”

Building the one-file sample announces “Ledger ready: 1 files and 3 evidence
events.” The visible summary correctly says “1 changed file.” Make the live
status use singular/plural wording consistently and cover it in the demo test.

## Retest

Run every command in `.factory/claims.json` first after `npm ci`, then:

```sh
npm audit --audit-level=high
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
npm run test:billing:live
```

Repeat the live file checksum comparison, 390 px target measurements, metadata
inspection, explicit license flow, offline reload, response-policy checks, and
31-request allowance check.
