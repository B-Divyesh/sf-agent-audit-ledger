# Agent Audit Ledger — verifier 5 handoff

## Result: FAIL

Candidate `8cbadf1d0dabc8ee43af1dfb24a815ce4174db58` was independently verified
against https://agent-audit-ledger.sociobot.in/ on 2026-08-30 UTC. No product
source was changed by this verification.

The candidate's core CLI and live site work: all eight declared claim tests,
unit/integration/lint checks, local and live 26-test Playwright suites,
production build, packed archive smoke, consumer public API smoke, browser
privacy request log, accessibility scans, offline reload, headers/caching,
checkout, and rate-limit check passed. The live payload is SHA-256 identical
to the candidate's 17 deployable files.

Release is blocked by three defects recorded with evidence in
`.factory/verification-5.md`:

1. **Blocker:** Public README/privacy promises about prompt/file-content
   exclusion and CLI no-telemetry/local processing have no matching entries
   and tagged observable tests in `.factory/claims.json`.
2. **Medium:** An unknown route returns the home page with HTTP 200; the site
   lacks the required real styled 404 response.
3. **Medium:** `cargo package --locked` fails after documented `npm ci` and
   `--allow-dirty` contaminates the crate archive with node_modules licenses
   and READMEs.

The live Sociobot product verification endpoint allowed 30 requests from one
client and returned 429 with `Retry-After: 3` on request 31. Registry
publication remains an owner operation.

## How to verify after repair

```sh
npm ci
npm audit --audit-level=high
# Run every command in .factory/claims.json first.
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
npm run test:billing:live
```

Then repeat the missing-claim audit, `/not-a-real-route` HTTP-status check,
crate-content inspection, and the live checks documented in
`.factory/verification-5.md`.
