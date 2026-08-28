# Agent Audit Ledger — build handoff

## What shipped

- Rust 0.1.0 library and `aal` single binary with strict JSONL parsing for file,
  command, test, and delegation events.
- SHA-256 hashes for touched files and test artifacts; evidence-to-file links;
  deterministic Markdown and JSON exports; stable opaque path IDs and command
  argument redaction by default.
- Optional Ed25519 key generation, embedded signatures, signer pinning, and
  tamper verification. Hash/signature limitations are stated in every ledger.
- Published draft 2020-12 event schema at `/schema/event.schema.json` and in
  the crate/CLI (`aal schema`). Unknown fields, invalid event shapes, root
  traversal, symlink escape for read targets, and missing hash inputs fail.
- Vite landing/documentation site with a fully local browser workbench, file
  hashing, Markdown/JSON downloads, explicit empty/error/offline states, and a
  silent recorded workflow. The browser preview is explicitly unsigned; the
  CLI is the authoritative signer.
- One-time $49 Team policy kit: Sociobot checkout, return-token capture,
  localStorage key `sb_license:agent-audit-ledger`, daily verification cache,
  offline cached unlock, paste-to-restore, saved policies, and policy JSON
  export. Core export, redaction, hashing, signing, safety, and accessibility
  remain free.
- `/privacy/` and `/terms/`, offline service worker, immutable asset headers,
  robots/sitemap, MIT license, changelog, README, and release archive.
- Product-specific “Evidence Orchard” visual system and original generated
  WebP hero are documented in `.factory/design.md`.

## Run and verify

```sh
npm ci
npm run check       # fmt + clippy + Rust/browser unit suites
npm run test:e2e    # desktop + 390px Playwright and axe
npm run build       # dist/bin/aal and dist/site/index.html
npm run pack:cli    # dist/packages/aal-0.1.0-linux-x86_64.tar.gz
cargo package       # crates.io-ready .crate; do not publish from worker
```

An end-to-end signed CLI smoke test was also run: `keygen` → stdin JSONL →
signed Markdown/JSON build → verification pinned to the generated public key.
All commands returned success, and default output contained opaque file IDs and
redacted command arguments.

## Verification results

- `npm run check`: pass — 5 Rust integration tests, 1 compiled doctest, 5
  browser unit tests; clippy with warnings denied.
- `npm run test:e2e`: pass — 6/6 across desktop Chromium and 390×844 mobile;
  local demo, empty/error states, legal routes, console, and axe serious/
  critical checks.
- Factory `verify-url.sh`: HTTP 200; title, `lang`, one `h1`, `main`, alt text,
  and labelled buttons all present; zero console/page errors.
- Lighthouse 13 mobile: **Performance 100, Accessibility 100, Best Practices
  100, SEO 100**. LCP 1.4 s, CLS 0, total blocking time 30 ms.
- Initial bundles: JS 11.79 KB raw / 4.80 KB gzip; CSS 15.65 KB raw / 4.37 KB
  gzip; fonts 0 KB; hero WebP 54.6 KB. The 672 KB workflow video uses
  `preload="none"` and is fetched only on request.
- `npm audit --audit-level=high`: 0 vulnerabilities.
- `cargo package`: verified from the packaged source; 45 files, about 70 KB
  compressed.

## Known gaps and release notes

- The factory must register `agent-audit-ledger` with Sociobot billing before
  the live checkout/verify routes succeed; no product ID or secret is embedded.
- The included release archive targets this worker’s Linux x86_64 host. The
  factory should build macOS, Windows, and other Linux artifacts in release CI.
- Browser file inputs do not expose a repository root reliably, so the live
  preview hashes only files the user explicitly selects and marks unmatched
  paths “not supplied.” The CLI performs authoritative rooted hashing.
- No registry or deployment was performed. Deploy `dist/site/`; publish the
  crate and multi-platform archives with factory-owned credentials.
