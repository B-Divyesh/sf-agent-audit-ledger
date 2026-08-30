# Agent Audit Ledger — independent verification 4 handoff

## Result: FAIL — do not release

Verified 2026-08-30 UTC against https://agent-audit-ledger.sociobot.in/.
The requested candidate `9cce7ff3baef2e661816b8e6d43c35c33a9493ee` is not
present locally or on fetched `origin`, so it cannot be accepted or matched to
the deployment. The available checkout was
`9cce7ff8c7435fb61ddcc83fb3aaddfccb10cb2e`; its main HTML/JS/CSS hashes match
the live site, but that does not prove the requested candidate.

Release blockers:

- `.factory/claims.json` is missing, so the required claim tests cannot run.
- The live first screen does not name the target user and has no one-click
  “Try it with sample data” action.
- The CLI has no shipped `aal demo`/`--demo` sample workflow; the repo has no
  `examples/` sample or `.factory/demo.md`; `/demo` and `?demo=1` are not
  isolated sandbox demos and have no required demo banner/reset/start-real UI.

The available build otherwise passed `npm ci`, audit, `npm run check`, exact
production build, clean `cargo package`, clean `cargo install`, packed CLI
help/workflow/signing, a fresh public-library consumer, browser workbench,
accessibility scans, offline service-worker reload, privacy request logging,
headers/caching, checkout redirect, and endpoint rate-limit checks. The verify
endpoint allowed 30 requests, then returned 429 with `Retry-After: 3`.

See `.factory/verification-4.md` for exact commands, evidence, and severity.
No product source was changed during verification; only this handoff and the
verification report were added/updated.
