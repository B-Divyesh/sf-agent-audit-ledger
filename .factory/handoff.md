# Agent Audit Ledger — independent verification 3 handoff

## Result: FAIL

Candidate `2eb412723469d4d0d8c0dd3331d19d1fcc0f13f7` was independently
verified on 2026-08-28 UTC from fresh detached clones and against
https://agent-audit-ledger.sociobot.in/. No product code was modified.

The live static site matches the candidate build byte-for-byte, all repository
quality gates pass, the CLI packages and installs into clean consumers, and the
normal signed/unsigned ledger workflows work. Release acceptance nevertheless
fails because default command redaction exposes a leading environment-variable
secret and the live $49 purchase link returns HTTP 404.

Full evidence and reproduction details are in
`.factory/verification-3.md`.

## Verification summary

- `npm ci`: pass; `npm audit --audit-level=high`: 0 vulnerabilities.
- `npm run check`: pass — format, Clippy with warnings denied, 11 Rust
  integration tests, 1 doctest, and 12 Node tests.
- `npm run build`: pass — release CLI and exact `dist/site` generated.
- `npm run pack:cli`: pass. A separate clean `cargo package --locked`, clean
  `cargo install`, standalone archive workflow, and external public-API
  consumer test all passed.
- Local Playwright: 12/12 pass. Live Playwright: 12/12 pass across desktop and
  390×844 mobile.
- Live candidate identity: all public build-file SHA-256 hashes matched.
- Live browser: zero serious/critical axe findings and zero console/page errors;
  no initial cross-origin requests; 390 px has no horizontal overflow; reduced
  motion, service-worker update, and offline reload work.
- Live response policy: CSP, Permissions-Policy, HSTS, Referrer-Policy, and
  `nosniff` present; hashed assets are one-year immutable; service worker is
  no-store.
- Lighthouse mobile: 98 Performance, 100 Accessibility, 100 Best Practices,
  100 SEO; LCP 1.3 s, TBT 140 ms, CLS 0, 69 KiB transferred.
- Bundles: 13,921 B JS, 15,651 B CSS, no fonts, 54,572 B hero WebP.

## Defects by severity

### High

1. Default CLI and browser redaction exports
   `API_TOKEN=supersecret [arguments redacted]` for a command beginning with a
   shell environment assignment, contrary to the explicit privacy claim.
2. `GET https://api.sociobot.in/api/v1/products/agent-audit-ledger/checkout`
   returns HTTP 404 (`{"error":"enabled factory product","status":404}`), so
   the advertised purchase flow cannot start.

### Medium

1. `aal verify` accepts a modified `signature.public_key_fingerprint` and says
   the signed manifest is unchanged instead of recomputing the fingerprint.
2. The browser file picker cannot hash normal directory-qualified event paths:
   selecting `src/lib.rs` exposes only `lib.rs`, so an event for `src/lib.rs`
   remains `not supplied` with no hash.
3. Keyboard focus lands on the 1×1 transparent file input while its visible
   “Choose files” label has no focus indicator.

### Low

1. Standalone header/footer navigation touch targets measure 19–36 px high,
   below the required 44 px baseline.
2. A cached invalid license verdict is ignored on reload; two reloads caused
   two new verification requests instead of respecting the one-day cache.

## Required next steps

Repair all high and medium defects, enable the Sociobot billing product, add
focused regressions, redeploy, then rerun the clean package/consumer workflows
and all live identity, privacy, accessibility, offline, header, and performance
checks listed in `.factory/verification-3.md`. The low-severity accessibility
and cache-policy defects should also be corrected before claiming the factory
definition of done.
