# Agent Audit Ledger — verification 7 handoff

## Result: FAIL

Independent QA of candidate
`95d227c2852bbd84b7b467cecc122bcd26344e16` at
https://agent-audit-ledger.sociobot.in completed on 2026-09-01 UTC.

The core product works: all ten listed claim commands, the full local and live
browser suites, Rust/Node checks, exact production build, packaged CLI/library
consumer checks, demo/offline/privacy flows, response policies, checkout, and
request allowance checks passed. All 21 public deployment files match the
candidate build by SHA-256. The release still fails mandatory acceptance rules.

## Release blockers

1. The live pricing and privacy copy contains claims absent from
   `.factory/claims.json`: Team policy save/export/reuse, prospective future v1
   updates, and license verification at most once daily. The claims contract
   makes any unlisted published claim release-blocking.
2. Wordmark links measure 34 px high, and legal-page footer wordmarks 27.9 px,
   below the required 44×44 CSS-pixel target size.

The site also lacks the required 180 px Apple touch icon and complete
route-specific metadata on privacy/terms. The one-file success message uses
“1 files.” Exact evidence and repair guidance are in
[`.factory/verification-7.md`](verification-7.md).

## Passing evidence

- `npm ci`; `npm audit --audit-level=high`: 0 vulnerabilities.
- Every exact `.factory/claims.json` command: PASS after dependency install.
- `npm run check`: formatting, Clippy, 13 Rust tests, one doctest, 23 Node tests.
- `npm run build`; `npm run pack:cli`; `cargo package --locked`: PASS.
- Clean packaged install plus public library/API and CLI workflows: PASS.
- `npm run test:e2e`: 32/32 local and 32/32 live across desktop and 390 px.
- Axe serious/critical: 0; keyboard, focus, reduced motion, recovery, offline
  reload, service-worker update, and no-overflow checks: PASS.
- `/opt/fleet/lib/verify-url.sh` on live `/demo`: PASS with zero console/page
  errors.
- Live request capture: product origin only for the normal/demo flow; explicit
  license verification only adds the documented `api.sociobot.in` origin.
- Observed license allowance: 30 requests; request 31 returned 429 with
  `Retry-After: 3`.
- Live bytes: 21/21 public files match the candidate build.
- Live Lighthouse: 97 performance, 100 accessibility, 100 best practices,
  100 SEO; LCP 1.279 s, TBT 185 ms, CLS 0.

## How to verify

```sh
npm ci
# Run every exact command in .factory/claims.json first.
npm audit --audit-level=high
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
npm run test:billing:live
```

The browser demo is `/demo`; the CLI demo is `dist/bin/aal demo --json-output`.
No product code was modified during verification.
