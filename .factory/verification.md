# Independent verification — FAIL

**Candidate:** `c36a3694ef900fd7b4510ecde6b556b053f97db3`
**Live URL:** https://agent-audit-ledger.sociobot.in/
**Verified:** 2026-08-28 (fresh clean checkout)

## Verdict

**FAIL.** The normal CLI, packaging, website, privacy, accessibility, and
performance paths work, and the live site's bytes match a fresh candidate
build. However, the CLI's timestamp validation accepts an invalid date and
therefore produces an ostensibly valid audit ledger from invalid evidence.
The published event schema also disagrees with the CLI, and the deployment
does not apply the shipped immutable cache policy. These are release blockers
for an evidence-oriented CLI and its production web deployment.

## What passed

- Clean install: `npm ci` completed; `npm audit --audit-level=high` reported
  0 vulnerabilities.
- `npm test`: passed — 5 Rust integration tests, 1 Rust doctest, and 5 Node
  browser-module tests.
- `npm run check`: passed — `cargo fmt --check`, Clippy with warnings denied,
  then the complete test suite.
- `npm run test:e2e`: passed — 6/6 Playwright cases at desktop Chromium and
  390 x 844 mobile, including the local JSONL demo, empty/error recovery,
  legal routes, axe serious/critical assertions, and console checking.
- Exact production workflow passed: `npm run build` produced
  `dist/bin/aal` and `dist/site`; `npm run pack:cli` produced
  `dist/packages/aal-0.1.0-linux-x86_64.tar.gz`; `cargo package --allow-dirty`
  packaged and verified 45 files (70.1 KiB compressed).
- Clean-consumer archive exercise: unpacked the release tarball into a fresh
  `/tmp` directory, ran `aal --help`, built Markdown/JSON from file, command,
  test-artifact, and delegation events, verified the unsigned manifest,
  generated an Ed25519 pair (private key mode `0600`), built/verified a signed
  manifest pinned to its public key, and confirmed `--json-output` results.
  Default output contained opaque file/artifact IDs and
  `cargo [arguments redacted]`; it did not contain the source path, a secret
  command argument, or a rejected `prompt` field. Traversal, unknown-field,
  and ambiguous `--json-output` inputs each exited 1 with useful stderr.
- Live deployment identity: SHA-256 checksums of `/`, the home JS/CSS,
  `evidence-orchard.webp`, `/sw.js`, and the public schema exactly equal the
  fresh `dist/site` copies. `/`, `/privacy/`, `/terms/`, `/sw.js`, and the
  schema return 200.
- Live browser smoke: normal JSONL example builds a 1-file/3-evidence ledger
  on desktop and a real 390 x 844 mobile viewport; no horizontal overflow;
  no console/page errors; no unsolicited cross-origin requests; zero axe
  serious/critical findings. Keyboard Tab initially reaches the skip link
  with a visible 3px focus outline. Reduced motion yields `scroll-behavior:
  auto` and a 0.01ms transition. A service-worker-controlled offline reload
  rendered the home page and offline notice.
- Performance: fresh build has 11,788 B raw JS (4,800 B gzip), 15,651 B CSS
  (4,370 B gzip), no fonts, and a 54,572 B LCP WebP. Lighthouse mobile result
  JSON recorded Performance 99, Accessibility 100, Best Practices 100, SEO
  100; LCP 1,241 ms, CLS 0, TBT 109 ms, transfer 68,842 B. The CLI reported a
  post-audit Chrome target crash after writing the JSON, but the completed
  report was readable and its metrics are recorded here.
- Privacy: static inspection and live request capture found no analytics,
  CDN fonts/scripts, or initial third-party requests. The only coded remote
  API is the explicit Sociobot license verification endpoint; core ledger
  functions remain local.

## Defects

### Medium — invalid RFC 3339 timestamps are accepted and exported

`aal build` accepted this input with exit 0 and wrote a JSON manifest:

```json
{"version":"1","time":"2026-99-99T99:99:99Z","type":"file","path":"src/lib.rs","action":"modified","reason":"invalid timestamp should fail"}
```

The ledger's `generated_at` was the same impossible timestamp. This contradicts
the README/API promise that timestamps are RFC 3339 and means reviewers can
receive temporally invalid evidence. Cause: the timestamp check only checks
the shape, not calendar validity. Fix with a real RFC 3339 parser and add
invalid-date/time-zone boundary tests.

### Medium — published event schema and CLI validation disagree

The public schema permits `{"type":"test","status":"started",...}`
because `started` is in its general status enum and the conditional only
requires a status. The CLI rejects that schema-valid event (exit 1), while it
accepts duplicate entries in `files` (exit 0) although the schema says
`uniqueItems: true`. Tool-neutral producers cannot reliably validate against
the advertised open schema. Make per-event conditions constrain status/action
values and enforce the same constraints in Rust/browser parsing.

### Medium — production cache policy does not meet the shipped/static policy

Every live response tested, including the hashed JS/CSS and WebP, sends
`cache-control: public, must-revalidate, max-age=30`. The committed
`site/public/_headers` asks for `public, max-age=31536000, immutable` for
`/assets/*` and WebP, and `no-cache` for `/sw.js`; the live server instead
serves `_headers` as a 200 public file. This defeats the stated immutable
asset/SW cache policy. Configure the deployment to apply these rules and
verify them after release.

### Low — live response hardening is incomplete

The live response has HSTS, `Referrer-Policy`, and `X-Content-Type-Options`,
but lacks both `Content-Security-Policy` and `Permissions-Policy`. Add a
restrictive static-site CSP (including only self and the explicit license API
as needed) and a least-privilege Permissions-Policy.

## Scope and retest

No product source was modified during this verification. Retest from a clean
checkout after fixing the three medium defects with:

```sh
npm ci
npm run check
npm run test:e2e
npm run build
npm run pack:cli
cargo package
```

Then repeat the invalid timestamp/schema fixtures and inspect live cache and
security headers.
