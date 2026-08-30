# Agent Audit Ledger — repair 4 handoff

## Result: PASS

Work order `agent-audit-ledger-repair-4` repairs every high, medium, and low
finding in `.factory/verification-3.md` for candidate
`2eb412723469d4d0d8c0dd3331d19d1fcc0f13f7`. The repaired static site is live
at https://agent-audit-ledger.sociobot.in/ and the CLI remains version `0.1.0`.

The researched scope in `.factory/brief.json`, the Evidence Orchard visual
system, the Rust CLI/library artifact, and the static deployment class are
unchanged.

## Repairs and exact regressions

1. **Leading environment secrets:** default Rust and browser command summaries
   now expose only a conservative executable basename. Shell assignments or
   syntax that cannot be identified safely become `[command redacted]`. The
   verifier fixture `API_TOKEN=supersecret cargo test` is absent from both JSON
   and Markdown output. Rust, Node, and live Playwright regressions use that
   exact fixture.
2. **Checkout 404:** registered the live Dodo one-time product and its immutable
   Sociobot `factory_products` mapping for `agent-audit-ledger`, USD 4900, with
   the production return URL. `npm run test:billing:live` asserts HTTP 303 and
   a `checkout.dodopayments.com` destination.
3. **Signer fingerprint:** `verify` recomputes SHA-256 from the embedded Ed25519
   public key and rejects changed fingerprint metadata before reporting
   success. The Rust regression covers embedded-key and pinned-key paths.
4. **Directory-qualified browser paths:** a selected basename now matches one
   unique event basename, so selecting `lib.rs` hashes `src/lib.rs`. Ambiguous
   basenames intentionally remain unmatched. Node and live Playwright cover
   both rules.
5. **File-picker keyboard focus:** the visible picker label receives a 3 px
   thread-red focus outline through `:focus-within`. Playwright tabs to the
   hidden native input and measures the visible outline.
6. **Touch targets:** visible header links, footer links, and purchase legal
   links now measure at least 44×44 CSS px. Playwright asserts every target on
   desktop and the 390×844 mobile profile.
7. **Negative license cache:** fresh invalid verdicts now use the same one-day
   cache window as valid verdicts. Unit and browser reload regressions assert
   one verification request across three loads.
8. **Update recovery:** the repaired service worker uses `aal-shell-v2`, so an
   existing `aal-shell-v1` installation cannot retain the candidate shell.
   A regression locks the cache version; a live browser migration removed v1,
   activated v2, and then reloaded successfully offline.

The work did not stop after the high/medium findings: both low findings and the
update-path issue discovered during the final audit are fixed and covered.

## Verification evidence

### Clean release and package

- `npm ci`: pass; 20 packages installed from the lockfile.
- `npm audit --audit-level=high`: pass; 0 vulnerabilities.
- `npm run check`: pass — format, Clippy for all targets with warnings denied,
  12 Rust integration tests, 1 Rust doctest, and 15 Node tests.
- `npm run build`: pass — `dist/bin/aal` (1,053,672 bytes) and `dist/site`.
- `npm run pack:cli`: pass — Linux x86-64 archive (527,521 bytes).
- A second untouched clone ran `cargo package --locked`: pass, 11 files,
  71.8 KiB unpacked / 19.6 KiB compressed.
- `cargo install --path <packaged crate> --locked --root <empty dir>`: pass;
  installed binary reported `aal 0.1.0`.
- A separate consumer crate imported packaged `parse_jsonl`, `build`,
  `to_json`, and `to_markdown`: pass. It produced a hashed manifest and proved
  the environment secret absent.
- The packed standalone binary passed top-level/per-command help, schema,
  file input, Markdown and JSON output, `--json-output`, unsigned verification,
  key generation, signed build, embedded verification, and pinned-key
  verification. Private-key mode was `0600`.

### Browser, accessibility, privacy, and offline

- Production Playwright locally: 20/20 pass across desktop Chromium and
  390×844 mobile.
- Production Playwright live: 20/20 pass across the same profiles, including
  every verifier regression, errors/empty states, keyboard skip navigation,
  legal routes, no horizontal overflow, and offline reload.
- `/opt/fleet/lib/verify-url.sh`: HTTP 200 in 656 ms; correct title and `lang`,
  one `h1`, one `main`, no missing alt text, no unlabeled buttons, and no
  console/page errors.
- Independent live axe scans of `/`, `/privacy/`, and `/terms/`: zero serious
  or critical violations.
- Keyboard-only file selection exposes a visible 3 px focus ring. All measured
  standalone navigation and purchase targets are at least 44×44 CSS px.
- Reduced motion: `scroll-behavior: auto`; action transition duration `0.01ms`.
- Fresh demo flow: zero cross-origin requests and zero console/page errors.
  A real invalid-license check sent only the supplied token to
  `api.sociobot.in`; three loads made one verification request.
- Service-worker update: v1 cache removed, v2 active, update endpoint uncached,
  and an offline reload rendered the full home page.
- Desktop and 390 px full-page screenshots were inspected: no overlap,
  clipping, horizontal overflow, or unreadable controls.

### Deployment, identity, response policy, and performance

- Deployment used the work order configuration:
  `npm ci && npm run build:site`, `dist/site`, static Azure deployment.
- SHA-256 matched for all 15 publicly served build files, including home,
  privacy, terms, hashed JS/CSS/maps, schema, media, and `sw.js`.
- Live checkout: HTTP 303 to hosted Dodo checkout. Public catalog price is
  USD 49.00 and the return URL is the production site.
- HTML uses `public, must-revalidate, max-age=30`; hashed assets and original
  media use one-year immutable caching; `/sw.js` uses `no-cache, no-store,
  must-revalidate`.
- CSP, Permissions-Policy, HSTS, Referrer-Policy, and `nosniff` are present on
  the tested routes.
- Initial bundles: JS 14.39 kB raw / 5.81 kB gzip; CSS 15.93 kB raw / 4.38 kB
  gzip; no font payload; total first-load transfer 69 KiB.
- Live Lighthouse mobile: Performance 100, Accessibility 100, Best Practices
  100, SEO 100; FCP 1.0 s, LCP 1.3 s, TBT 60 ms, CLS 0, Speed Index 1.0 s.
- Landing-page sentence counts and terminology are recorded in
  `.factory/copy-audit.md`; no sentence exceeds 22 words and no banned term is
  present in the product copy.

## Commands

```sh
npm ci
npm audit --audit-level=high
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
npm run test:billing:live
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
```

## Known gaps and next steps

No release-blocking product gaps remain from the verifier report. Registry
publication is intentionally left to the factory owner; the crate and archive
are ready to publish. No AI runtime feature was added because deterministic
local evidence generation is the brief's core job and does not benefit from a
model call.
