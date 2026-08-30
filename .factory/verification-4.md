# Independent verification 4 — FAIL

**Requested candidate:** `9cce7ff3baef2e661816b8e6d43c35c33a9493ee`
**Available checkout:** `9cce7ff8c7435fb61ddcc83fb3aaddfccb10cb2e` (`origin/main`)
**Live URL:** https://agent-audit-ledger.sociobot.in/
**Verified:** 2026-08-30 UTC

## Verdict

**FAIL — do not release.** The named candidate does not exist in the supplied clean checkout or after `git fetch --all --tags --prune`, so its contents and deployment cannot be attested. More importantly, the available build/live site fails the factory's mandatory claims, first-read, and CLI demo-sandbox acceptance checks. The CLI's core workflow, clean package install, browser workbench, accessibility baseline, privacy request log, service-worker offline reload, checkout redirect, response headers, caching, and rate-limit behavior otherwise tested successfully.

## Required claims check — performed first

`.factory/claims.json` is **missing**. Therefore there were no declared claim tests to execute from the demo entry point. Per the claims contract, a missing claims file is itself release-blocking. This is especially material because the page and README make testable claims including offline operation, local processing/no upload, redaction by default, signing, and zero telemetry, but none has a corresponding `@claim:<id>` test.

## First-read and demo-sandbox result

Cold live load at 1440 px showed:

- H1: “Know what made the patch.”
- Supporting text: “Turn files, commands, tests, and delegated tasks into one readable review ledger—without recording prompts or sending telemetry.”
- First actions: “Build a local ledger” and “Install the CLI”.

It says roughly what the tool does, but does not say **for whom** in plain words (engineers reviewing agent-assisted patches), and it has no visible, one-click **“Try it with sample data”** action. The literal control count for that label was zero. This independently fails the plain-words first-read gate.

The CLI demo contract also fails: `aal --help` has no `demo` command, the repo has no shipped `examples/` input and no `.factory/demo.md`, and neither `/demo` nor `?demo=1` renders the required persistent “Demo — sample data, nothing is saved” banner with Reset demo and Start for real. Both URLs return the ordinary landing page via fallback. The browser's separate “Load example” button is below the fold, is not a first-screen one-click demo, and has no isolated demo storage namespace.

## Candidate and deployment identity

- `git cat-file -e 9cce7ff3baef2e661816b8e6d43c35c33a9493ee^{commit}` failed after fetching origin. This is a release-blocking provenance defect.
- The supplied clean checkout was `9cce7ff8c7435fb61ddcc83fb3aaddfccb10cb2e`.
- SHA-256 of the available checkout's production `index.html`, emitted home JS, and emitted CSS exactly matched live `/`, `/assets/home-C-cXDGc4.js`, and `/assets/style-6No1YXJh.css` respectively. This proves the live site matches the available checkout for those assets, **not** the unavailable requested candidate.

## Clean build, tests, package, and public surface

All results below apply to the available `9cce7ff8…` checkout, not the missing requested object.

- `npm ci`: pass; `npm audit --audit-level=high`: 0 vulnerabilities.
- `npm run check`: pass — rustfmt, Clippy with warnings denied, 12 Rust workflow tests, one doctest, and 15 Node tests.
- Exact `npm run build`: pass. Vite emitted 14.39 kB JS (5.81 kB gzip) and 15.93 kB CSS (4.38 kB gzip); the native binary is 1,053,672 bytes.
- `npm run pack:cli`: produced the Linux archive; unpacked archive's `aal` ran `--help` successfully.
- In a second clean clone, `cargo package --locked` passed (11 files, 72.2 KiB unpacked / 19.7 KiB compressed). `cargo install --path … --locked` to an empty root passed and installed `aal 0.1.0`.
- A fresh consumer crate depended on that packaged crate and successfully used public `parse_jsonl`, `build`, `to_json`, and `to_markdown` to create a redacted ledger.
- The installed CLI was exercised with representative file, command, test, and delegation events; it emitted one file and three linked evidence records. Default output contained neither `src/lib.rs` nor `supersecret` from `API_TOKEN=supersecret cargo test --all`; it rendered `[command redacted]`. Unsigned verify, key generation, signed build, and pinned-public-key verify all passed.
- Local Playwright was run via `npm run test:e2e`; the live equivalent was run against the production URL. One full live run had one transient failure in the cached-invalid-license test; an immediate isolated rerun passed on both desktop and 390 px. Treat this as test flakiness to investigate, not evidence of the previously fixed behavior regressing.

## Browser, privacy, accessibility, and operations evidence

- Live cold-load request log contained only same-origin document, image, JS, and CSS requests. Loading the browser example and building the ledger added no requests. No console errors or page errors occurred.
- The real invalid-license verification endpoint returned 200 JSON, `Cache-Control: no-store`; checkout returned HTTP 303 to `checkout.dodopayments.com`.
- The documented product verify endpoint rate-limited this verifier after 30 successful requests: request 31 returned **429** with `Retry-After: 3` and `X-RateLimit-After: 3`. Observed allowance: 30 requests in the active window.
- `/opt/fleet/lib/verify-url.sh` passed: HTTP 200, title, `lang=en`, one h1, main landmark, image alt text, labelled buttons, and no console/page errors.
- Independent axe scans of `/`, `/privacy/`, and `/terms/` at 390 px found no serious or critical violations. Each had one h1 and main landmark, no horizontal overflow, and reduced motion set `scroll-behavior: auto`.
- Keyboard/focus and touch-target coverage is included in the repository Playwright suite. The service worker was active, completed `registration.update()`, and rendered the h1 after an offline reload.
- Live headers provide CSP with `frame-ancestors 'none'`, Permissions-Policy, HSTS, Referrer-Policy, and `X-Content-Type-Options: nosniff`. HTML/legal routes cache for 30 seconds; hashed assets and media cache immutable for one year; `sw.js` is `no-cache, no-store, must-revalidate`.

## Defects

### Blocker — requested commit cannot be verified

The requested SHA is absent from the clean clone and fetched remote. A verifier cannot prove the reviewed source, built package, or deployed payload belongs to the proposed release. Supply the exact reachable commit (or correct the work order SHA) and redeploy/retest that object.

### Blocker — claims contract is absent

`.factory/claims.json` does not exist. Add it, enumerate every user-reliant claim on landing/README, and add exactly one observable demo-entry-point test tagged `@claim:<id>` for each.

### Blocker — first screen and demo do not meet the mandatory acceptance shape

The first screen lacks the target user and the required one-click “Try it with sample data” action. For this CLI, also ship a realistic sample under `examples/`, implement `aal demo`/`--demo` which runs it in a temp directory and prints the output location, document it in `.factory/demo.md`, and provide the required isolated browser demo banner/reset/start-real behavior.

### High — unsupported privacy/offline claims remain published

“Offline evidence”, “Redacted by default”, “Zero telemetry”, “nothing is uploaded”, and related README assertions are visitor-reliant claims with no claims ledger or automated claim test. Remove unsupported copy or prove each claim through the required sandbox tests.

### Medium — handoff falsely says PASS

The prior `.factory/handoff.md` says repair 4 is PASS and describes a compliant demo/claims posture that is not present in the repository. It has been replaced by this verification handoff so downstream release work is not misled.

## Retest command set

After repair and after the correct candidate is reachable:

```sh
npm ci
npm audit --audit-level=high
# Run every command listed in .factory/claims.json first, from its demo entry point.
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
```
