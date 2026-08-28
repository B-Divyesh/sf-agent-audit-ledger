# Independent verification 3 — FAIL

**Candidate:** `2eb412723469d4d0d8c0dd3331d19d1fcc0f13f7`  
**Live URL:** https://agent-audit-ledger.sociobot.in/  
**Verified:** 2026-08-28 UTC from fresh detached clones

## Verdict

**FAIL.** The candidate builds, packages, installs, and completes its normal CLI
workflow. The live static deployment is byte-for-byte consistent with the
candidate site build and passes its automated browser, accessibility, offline,
header, caching, and performance gates. It is not release-ready because two
high-severity acceptance defects remain: the default redaction can expose a
secret in a common shell command form, and the advertised purchase action
returns HTTP 404. Additional integrity, browser hashing, keyboard-focus, touch
target, and license-cache defects are detailed below.

## Clean-checkout and build evidence

- Cloned the GitHub repository independently and detached at the exact
  candidate. The starting checkout had no changes.
- Toolchain: Node `v22.23.2`, npm `10.9.8`, rustc `1.98.0`, Cargo `1.98.0`.
- `npm ci` passed. `npm audit --audit-level=high` reported 0 vulnerabilities.
- `npm run check` passed: `cargo fmt --check`, Clippy over all targets with
  warnings denied, 11 Rust integration tests, 1 Rust doctest, and 12 Node tests.
- The exact `npm run build` production command passed and produced
  `dist/bin/aal` plus `dist/site`. The release binary was 1,052,376 bytes.
- `npm run pack:cli` passed and produced the Linux x86-64 archive. In a second
  untouched detached clone, `cargo package --locked` passed and verified a
  package containing 11 files (69.6 KiB / 19.1 KiB compressed).
- `cargo install --path <clean packaged crate> --locked --root <empty dir>`
  passed, and the installed executable reported `aal 0.1.0`.
- A separate clean consumer crate imported the packaged public library and
  exercised `parse_jsonl`, `build`, `to_json`, and `to_markdown`; its test
  passed. The API produced a redacted, hashed one-file manifest.

## CLI and library workflow evidence

- The packed standalone binary completed `--help`, per-command help, schema
  output, stdin/file builds, Markdown and JSON export, `--json-output`, unsigned
  verification, Ed25519 key generation, signed build, embedded-key
  verification, and pinned-public-key verification.
- A representative file + command + test artifact + delegation input produced
  1 hashed file, 3 linked evidence records, 1 passed test, 1 delegated task,
  and 0 unlinked events. Default output contained neither `src/lib.rs` nor the
  test command's `supersecret` argument. Opting into paths and arguments exposed
  both as documented. Private-key permissions were `0600`.
- Two identical default builds used different 128-bit opaque file IDs while
  preserving bidirectional evidence linkage. Hashes matched the source and
  artifact bytes.
- Expected exit 1 and actionable stderr were confirmed for empty input,
  malformed JSON, null/unknown fields (including `prompt`), a 501-character
  reason, calendar-invalid time, duplicate references, dangling evidence,
  root traversal, symlink escape, a missing present file, output-stream
  ambiguity, key overwrite, an unsigned manifest with a supplied public key,
  the wrong public key, and changed signed payload data. Invalid commands wrote
  no stdout. A missing deleted file was accepted and represented as deleted.
- Boundary coverage included a leap-day timestamp with a fractional second and
  `+23:59` offset, mixed-offset chronological ordering, leap-second ordering,
  failed-command summaries, and deleted-file handling.

## Live deployment and browser evidence

- SHA-256 matched between the fresh `dist/site` build and live `/`, `/privacy/`,
  `/terms/`, `/sw.js`, schema, favicon, robots, sitemap, hero WebP, recorded
  WebM, all emitted JS/CSS, and all emitted source maps. This establishes that
  the tested live static payload matches the candidate build.
- The repository's Playwright suite passed 12/12 locally and 12/12 against the
  live URL across desktop Chromium and a 390×844 mobile profile. Coverage
  includes normal build, empty/error recovery, dangling-link rejection,
  keyboard skip navigation, no horizontal overflow, legal pages, axe, and
  service-worker offline reload.
- `/opt/fleet/lib/verify-url.sh` returned HTTP 200 and measured 775 ms. It found
  the expected title, `lang=en`, one `h1`, one `main`, no missing image alt,
  no unlabeled buttons, and zero console/page errors. Desktop and mobile
  screenshots were inspected; content remained legible and did not overlap.
- Independent axe runs on home, privacy, and terms found zero serious or
  critical violations. The 390 px and 1440 px layouts had no horizontal
  overflow. Reduced-motion emulation produced `scroll-behavior: auto` and
  `0.01ms` button transitions.
- Keyboard-only operation loaded the sample, changed both privacy controls,
  and built the ledger. The service worker was active, controlled the page,
  completed `registration.update()`, and served a successful offline reload.
- A fresh context made no cross-origin request on initial load. There are no
  third-party fonts, scripts, analytics, or tracking requests. An explicit
  invalid-license check sent only the supplied token to the documented
  Sociobot verification endpoint; it returned HTTP 200 JSON with
  `valid:false`, origin-specific CORS, and `Cache-Control: no-store`.
- Live HTML uses `public, must-revalidate, max-age=30`; hashed JS/CSS, the hero,
  and recorded video use `public, max-age=31536000, immutable`; `/sw.js` uses
  `no-cache, no-store, must-revalidate`. CSP, Permissions-Policy, HSTS,
  Referrer-Policy, and `nosniff` are present.
- Initial bundle budgets pass: JS 13,921 B raw / 5.60 kB gzip, CSS 15,651 B raw
  / 4.37 kB gzip, no font payload, and hero WebP 54,572 B. The 672,229-byte
  video uses `preload="none"`.
- Fresh Lighthouse mobile results: Performance 98, Accessibility 100, Best
  Practices 100, SEO 100; FCP 1.2 s, LCP 1.3 s, TBT 140 ms, CLS 0, Speed Index
  1.2 s, and 69 KiB transferred.

## Defects

### High — default command redaction exposes leading environment secrets

Both the packed CLI and the live browser demo treat the first whitespace token
as the executable name. This common command event:

```json
{"version":"1","time":"2026-08-28T00:01:00Z","type":"command","command":"API_TOKEN=supersecret cargo test","exit_code":0,"files":["src/lib.rs"]}
```

is exported by default as:

```text
API_TOKEN=supersecret [arguments redacted]
```

The manifest simultaneously claims that command arguments are redacted. This
can put a credential into the review artifact without the explicit
`--include-arguments` opt-in, violating the brief's privacy-by-default
contract. Recognize shell assignment prefixes and wrappers safely, or redact
the whole command unless a non-sensitive executable can be identified.

### High — the advertised one-time purchase cannot be started

The live “Buy the team kit” link points to the required Sociobot route, but a
fresh GET to
`https://api.sociobot.in/api/v1/products/agent-audit-ledger/checkout` returned
HTTP 404 with:

```json
{"error":"enabled factory product","status":404}
```

The page advertises a $49 one-time unlock, so this is a failed primary product
action. Register/enable the product in the factory billing service and confirm
the link redirects to hosted checkout before release.

### Medium — signed fingerprint metadata is not validated

After a valid signed build, changing only
`signature.public_key_fingerprint` to 64 zeroes still made `aal verify` exit 0
and state “the manifest is unchanged.” Verification uses the embedded public
key but never recomputes and compares its displayed SHA-256 fingerprint. The
Markdown integrity section therefore can show altered signer-identification
metadata as verified. Recompute the fingerprint during verification and reject
a mismatch; cover embedded and pinned-key paths.

### Medium — browser file hashing fails for ordinary directory-qualified paths

The live demo's example uses `src/review.rs`, but its standard multi-file input
does not enable directory selection. Selecting an actual
`/tmp/.../src/lib.rs` supplies browser metadata `name: "lib.rs"` and an empty
`webkitRelativePath`. For an event path `src/lib.rs`, the exported browser
manifest reported `state: "not supplied"` and an empty SHA-256, even though the
matching file was selected. Support an explicit event-path mapping, directory
selection, or documented basename matching so the sample workflow can hash its
own representative paths.

### Medium — the file chooser has no visible keyboard focus indicator

Keyboard focus reaches `#files`, and Chromium reports it as `:focus-visible`,
but the input is 1×1 px with `opacity: 0`; its 56 px visual label receives no
outline. A keyboard user cannot see that focus moved to “Choose files.” Apply a
focus style to the visible label (for example with `:has(input:focus-visible)`)
and retain keyboard activation.

### Low — many standalone touch targets are below the required 44 px

At 390 px, primary/header navigation links measured 20–36 px high and footer
links measured 19 px high; the purchase legal links measured 13 px high.
Inline prose links may use the WCAG exception, but the standalone navigation
targets do not meet the repository's 44×44 px baseline. Increase the clickable
padding without changing the visual density.

### Low — invalid license verdicts are requested again on every reload

After capturing an invalid token, two successive page reloads produced two
more `/verify?license=` requests. The verdict and timestamp are written to
localStorage, but the cache short-circuit only accepts a cached valid verdict.
This conflicts with the at-most-once-per-day policy and needlessly resends an
invalid token. Honor fresh cached negative verdicts as well as positive ones.

## Retest scope

No product source was modified. After repairs, repeat the clean commands:

```sh
npm ci
npm audit --audit-level=high
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
```

Also repeat the environment-assignment redaction fixture in both CLI and live
demo, fingerprint-only mutation, directory-qualified browser file selection,
file-picker keyboard focus, touch-target measurements, repeated invalid-license
reload, checkout redirect, live hash identity, headers, service-worker update,
offline reload, axe, and Lighthouse.
