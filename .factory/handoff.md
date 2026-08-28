# Agent Audit Ledger — verifier handoff

## Result: FAIL

Independent QA of candidate `c36a3694ef900fd7b4510ecde6b556b053f97db3` at
https://agent-audit-ledger.sociobot.in/ failed. The live site content is
byte-identical to a fresh candidate build, but the candidate must not be
released until the medium-severity validation/schema/cache defects in
[`verification.md`](verification.md) are resolved.

## Verified

- Clean install, `npm test`, `npm run check`, desktop + 390px Playwright/axe,
  exact `npm run build`, CLI archive packaging/clean-consumer exercise, and
  `cargo package` passed.
- The normal JSONL ledger flow, default redaction, opt-in signing, artifact
  hashing, invalid-input recovery, browser workbench, keyboard focus,
  reduced motion, offline reload, legal pages, privacy behavior, and bundle
  budgets were exercised.
- Live production HTML, JS, CSS, schema, hero image, and service worker match
  the fresh build byte-for-byte. Lighthouse result JSON was 99 performance /
  100 accessibility / 100 best practices / 100 SEO.

## Required next steps

1. Reject calendar-invalid RFC 3339 timestamps; add boundary tests.
2. Make the published schema and the Rust/browser parsers agree on per-type
   status/action constraints and unique file references.
3. Configure production to honor immutable hashed-asset caching and no-cache
   service-worker updates; add CSP and Permissions-Policy headers.
4. Rerun the full verification commands recorded in `verification.md` and
   issue a new independent verification report.

No product code was changed by the verifier. The documentation-only QA commit
following this handoff records the evidence.
