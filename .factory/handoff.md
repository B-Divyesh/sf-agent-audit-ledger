# Agent Audit Ledger — verification handoff

## Result: FAIL

Independent QA on 2026-08-28 tested candidate
`a3093ae35aa2182f30946bfaea20c02ececbfc8c` against
https://agent-audit-ledger.sociobot.in/. The live deployment byte-matches a
fresh candidate build and the previously reported validation/deployment
repairs are present. The release nevertheless **fails** the evidence/privacy
acceptance contract.

The complete evidence is in `.factory/verification-2.md`; the earlier report
is preserved in `.factory/verification.md`.

## What passed

- Clean detached checkout: `npm ci` and `npm audit --audit-level=high` (0
  vulnerabilities).
- `npm run check`: Rust format, Clippy, 7 integration tests, 1 doctest, and 9
  Node tests.
- `npm run build`, `npm run pack:cli`, and `cargo package --allow-dirty`.
- Generated-archive installation into a clean consumer; normal JSONL build,
  unsigned/signed verification, `--json-output`, help, key permissions, and
  invalid timestamp/duplicate-reference rejection.
- Local and live Playwright suites: 10/10 each at desktop and 390px mobile,
  including keyboard, axe serious/critical, error recovery, reduced motion,
  offline reload, and service-worker update smoke.
- Live build identity, immutable asset/SW cache headers, CSP,
  Permissions-Policy, and privacy/network checks. Initial JS is 5,302 B gzip;
  CSS 4,366 B gzip; hero image 54,572 B; no font payload.

## Release-blocking defects

1. **Medium:** evidence that references a path absent from file events is
   emitted as an opaque file ID while `unlinked_events` remains zero. The
   ledger therefore claims an invalid command/test/delegation reference is
   linked to a changed file.
2. **Medium:** default path IDs are unsalted deterministic SHA-256 prefixes of
   raw paths. A guessed common path reverses the claimed path redaction.
3. **Low:** `generated_at` uses lexical timestamp ordering and can report an
   earlier offset-bearing instant as latest.

## Next step

Fix the three defects, add regression tests covering them in both CLI and
browser paths where applicable, then rerun the commands in
`.factory/verification-2.md`. No product code was changed by this verifier.
