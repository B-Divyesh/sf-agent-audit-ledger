# Independent verification 2 — FAIL

**Candidate:** `a3093ae35aa2182f30946bfaea20c02ececbfc8c`  
**Live URL:** https://agent-audit-ledger.sociobot.in/  
**Verified:** 2026-08-28 from a detached clean checkout

## Verdict

**FAIL.** The earlier timestamp, schema, static-header, cache-policy, and
deployment-identity defects are repaired: the live deployment matches a fresh
candidate build and the normal CLI/site workflows pass. Three new defects
remain in the core evidence and privacy contract. In particular, the CLI can
claim evidence is linked when it has no corresponding changed-file record,
and its default path "redaction" is reversible for guessed paths.

## Verification evidence

- Created a detached clean clone at the candidate SHA; `npm ci` completed and
  `npm audit --audit-level=high` found 0 vulnerabilities.
- `npm run check` passed: `cargo fmt --check`, Clippy with warnings denied,
  7 Rust integration tests, 1 Rust doctest, and 9 Node tests.
- `npm run test:e2e` passed 10/10 Chromium checks across desktop and the
  390x844 mobile project. The same suite against the live URL also passed
  10/10. It covers normal local JSONL generation, empty/invalid recovery,
  legal pages, keyboard skip link, no horizontal overflow, axe
  serious/critical findings, and offline service-worker reload.
- The exact production commands passed: `npm run build`, `npm run pack:cli`,
  and `cargo package --allow-dirty` (45 files, 71.3 KiB compressed).
  `dist/bin/aal`, `dist/site`, and
  `dist/packages/aal-0.1.0-linux-x86_64.tar.gz` were produced.
- In a fresh consumer directory, unpacked the generated archive and exercised
  `aal --help`, `build`, unsigned `verify`, `keygen`, signed `build`, and
  pinned-public-key `verify`. A normal file/command/test/delegation JSONL
  produced a 1-file/3-evidence ledger; the private key was mode 0600.
  Calendar-invalid timestamps and duplicate file references exit 1 with clear
  errors. The leap-day boundary `2024-02-29T23:59:59.123+23:59` succeeds.
- Default output did not contain the raw path or secret command argument;
  command arguments rendered as `cargo [arguments redacted]`. This check also
  exposed the deterministic-ID privacy defect below.
- SHA-256 hashes of live `/`, `/privacy/`, `/terms/`, `/sw.js`, public schema,
  home JS/CSS, and `evidence-orchard.webp` match the fresh `dist/site` files.
  Live hashed assets and WebP have `public, max-age=31536000, immutable`;
  `/sw.js` has `no-cache, no-store, must-revalidate`. CSP,
  Permissions-Policy, HSTS, Referrer-Policy, and `nosniff` are present.
- Direct desktop and 390px live-browser smoke found one `h1`, `lang=en`, a
  `main` landmark, no horizontal overflow, a visible 3px brass skip-link
  focus ring, zero console/page errors, no unsolicited cross-origin requests,
  and zero axe serious/critical violations. Reduced motion yields
  `scroll-behavior: auto` and a 0.01ms transition. `registration.update()`
  completed, and a service-worker-controlled offline reload rendered the home
  page and offline notice.
- Fresh bundle sizes meet the stated budgets: initial JS 13,240 B raw / 5,302
  B gzip, CSS 15,651 B raw / 4,366 B gzip, no fonts, and hero WebP 54,572 B.

## Defects

### Medium — dangling evidence references are reported as linked

With a changed-file event for `src/lib.rs` and a successful command event
whose `files` is `['src/other.rs']`, `aal build` exits 0 and writes:

```json
{"unlinked":0,"files":["file:b1a35a68f14e"],"evidenceFiles":["file:efc9d4d1a0fc"]}
```

`file:efc9d4d1a0fc` has no record in `files`, yet the summary says zero
unlinked events. This fails the product's central promise to link command,
test, and delegation evidence to changed files and makes an invalid input look
verified. Reject references absent from the file-event set, or count and label
them as unlinked; add CLI/browser regression coverage.

### Medium — default path redaction is deterministic and dictionary-reversible

The default ledger identifier is the first 12 hex characters of SHA-256 of the
raw path. The consumer ledger emitted `file:b1a35a68f14e` for `src/lib.rs`;
running `printf 'src/lib.rs' | sha256sum | cut -c1-12` reproduces exactly
`b1a35a68f14e`. Common sensitive paths can therefore be recovered by trivial
dictionary lookup, contrary to the brief's requirement to redact paths by
default and the privacy-safe product claim. Use per-ledger random opaque IDs
or a per-ledger secret salt, while retaining linkage within that ledger.

### Low — `generated_at` is selected lexically instead of chronologically

For events at `2026-08-28T10:00:00+14:00` (2026-08-27 20:00Z) and
`2026-08-28T00:00:00Z`, the generated manifest says:

```json
{"generated_at":"2026-08-28T10:00:00+14:00","evidence_time":"2026-08-28T00:00:00Z"}
```

The first instant is older, but string sorting chooses it as the ledger's
`generated_at`. Parse timestamps and compare instants, or set this field to
the actual manifest-generation time and expose an explicitly named latest
event timestamp.

## Retest scope

No product source was modified in this verification. After fixes, rerun from a
clean checkout:

```sh
npm ci
npm run check
npm run build
npm run pack:cli
cargo package
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
```

Then repeat the dangling-reference, deterministic-ID, and mixed-offset
timestamp fixtures above, plus live asset/header identity checks.
