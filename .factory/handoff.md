# Agent Audit Ledger — repair handoff

## Result: repaired and deployed

This repair addresses every release-blocking finding in the independent report
for candidate `c36a3694ef900fd7b4510ecde6b556b053f97db3` (report commit
`cc38acce0ebe6b0a045f1f1cc0b96dd19e2c918e`). The existing CLI artifact and
static-site deployment class are unchanged. The repaired site is deployed at
https://agent-audit-ledger.sociobot.in/.

## Repairs

- RFC 3339 validation now uses Chrono's RFC 3339 parser rather than a shape
  check. Calendar-invalid dates/times and invalid offsets fail before an audit
  is built. The browser workbench applies matching calendar, leap-year, clock,
  and offset checks.
- Event validation now rejects duplicate `files` references in Rust and the
  browser. The open schema constrains test statuses to `passed`/`failed`/
  `skipped`, delegation statuses to `started`/`completed`/`failed`/`cancelled`,
  and documents matching string and `exit_code` bounds. `npm run build:site`
  copies the canonical `schema/event.schema.json` to the published location;
  a Node regression test compares the copies byte-for-byte.
- Replaced the inert `_headers` file with Azure Static Web Apps
  `staticwebapp.config.json`. Production now serves immutable cache policy for
  `/assets/*` and the WebP/video assets, `no-cache, no-store, must-revalidate`
  for `/sw.js`, and restrictive CSP plus least-privilege Permissions-Policy
  headers.

## Verification performed

All commands were run from this checkout on 2026-08-28.

```sh
npm ci
npm audit --audit-level=high             # 0 vulnerabilities
npm run check                            # Rust fmt + Clippy -D warnings + 7 Rust integration tests + 1 doctest + 9 Node tests
npm run build                            # dist/bin/aal and dist/site
npm run pack:cli                         # dist/packages/aal-0.1.0-linux-x86_64.tar.gz
cargo package --allow-dirty              # package and verification passed (45 files, 71.0 KiB compressed)
npm run test:e2e                         # 10/10 desktop + 390x844 mobile Chromium
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e  # 10/10 live desktop + 390x844 mobile
```

The clean-consumer archive exercise unpacked the release tarball into a fresh
temporary directory, ran `aal --help`, built and verified a redacted manifest,
and confirmed the original impossible timestamp exits 1. Exact validation
regressions cover invalid date/time-zone boundaries, leap-day acceptance,
per-type status rules, duplicate file references, browser/schema parity, and
the static response policy configuration.

Browser coverage includes Axe serious/critical checks, keyboard skip-link
focus and overflow checks, empty/error recovery, legal landmarks, normal local
ledger generation, and service-worker-controlled offline reload at desktop and
390px mobile. `verify-url.sh` against production reported no console errors,
one title, `lang=en`, one h1, a main landmark, no missing image alt text, and
no unlabeled buttons.

Live mobile Lighthouse wrote a complete report with Performance 100,
Accessibility 100, Best Practices 100, and SEO 100; LCP was 1,206 ms, CLS 0,
and TBT 34 ms. The Lighthouse CLI reported a post-report Chrome-target crash,
but `/tmp/aal-lighthouse.json` was complete and readable.

## Production evidence

The deployment completed successfully through `/opt/fleet/lib/deploy-static.sh`.
Live SHA-256 values match the fresh `dist/site` for `/`, the emitted
`/assets/home-gX43uUtl.js`, `/evidence-orchard.webp`, `/sw.js`, and
`/schema/event.schema.json`.

- `/assets/home-gX43uUtl.js` and `/evidence-orchard.webp`: `Cache-Control:
  public, max-age=31536000, immutable`
- `/sw.js`: `Cache-Control: no-cache, no-store, must-revalidate`
- `/`, assets, WebP, service worker, and schema: restrictive
  `Content-Security-Policy`, `Permissions-Policy`, `Referrer-Policy`, and
  `X-Content-Type-Options` headers present.

## Known gaps / next steps

No known release blockers remain. The verifier's original report is preserved
at `.factory/verification.md`; a new independent verifier may rerun its formal
process against this deployed repair if required by release policy.
