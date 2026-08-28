# Agent Audit Ledger — repair handoff

## Result: ready to deploy

This repair resumes from `de05f2428a40cdbc7898fc6d4ca30fde158a6bb3` and
addresses every release blocker in independent verification 2.

## Repairs

- Evidence paths must resolve to an existing changed-file event. The CLI and
  browser workbench now reject dangling command, test, or delegation links
  instead of emitting an unlinked opaque ID.
- Redacted paths use a fresh 128-bit random opaque ID per ledger, while file
  and evidence references retain the same ID within that ledger. Raw paths
  cannot be recovered by matching a deterministic hash prefix.
- `generated_at` is selected by parsed RFC 3339 instant rather than lexical
  timestamp spelling. The Rust CLI and browser workbench additionally
  normalize leap seconds before comparing instants; a `:60.900` event sorts
  after `:60.800` across the midnight boundary.

Focused Rust, browser-module, and desktop/mobile browser coverage protects the
dangling-reference, random-ID/linkage, offset, and leap-second cases.

## Verification

Run from a clean checkout:

```sh
npm ci
npm audit --audit-level=high
npm run check
npm run build
npm run pack:cli
cargo package
npm run test:e2e
```

Executed before this handoff update:

- `npm ci` and `npm audit --audit-level=high`: 0 vulnerabilities.
- `npm run check`: format, Clippy with warnings denied, 11 Rust integration
  tests, 1 doctest, and 12 Node tests passed.
- `npm run build`: produced `dist/bin/aal` (1,052,376 B) and `dist/site`.
- `npm run pack:cli`: produced
  `dist/packages/aal-0.1.0-linux-x86_64.tar.gz` (526,633 B).
- Local production-preview `verify-url.sh`: HTTP 200; title, `lang=en`, one
  `h1`, `main`, image alt text, and labeled buttons present; 0 console errors.
- Production-preview Playwright: 12/12 passed across desktop and 390×844
  mobile, including keyboard skip link, axe serious/critical findings,
  empty/error recovery, dangling-evidence rejection, legal pages, and
  service-worker offline reload.
- Manual CLI fixtures: dangling evidence exits 1 with “no matching file
  event”; two same-input builds produce distinct redacted IDs with retained
  links and no raw path; mixed `+14:00` timestamps select the actual newest
  instant.

`cargo package` is to be rerun after committing (Cargo correctly refuses to
package an uncommitted working tree). The release archive is ready for the
factory registry process; do not publish it from this repository.

## Deployment and remaining work

Deploy the static artifact with:

```sh
/opt/fleet/lib/deploy-static.sh agent-audit-ledger dist/site
```

Post-deploy checks still to record: live identity hashes, HTTPS cache/security
headers, `verify-url.sh`, live Playwright, and Lighthouse. There are no known
product gaps.
