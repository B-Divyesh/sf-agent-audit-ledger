# Agent Audit Ledger — repair 7 handoff

## Result: PASS

Work order `agent-audit-ledger-repair-7` repaired every release blocker from
`.factory/verification-6.md` for candidate
`ac5cc2135f11c42ef6b68e5b25746b6d023205e2`. Product changes are committed as
`1175e206ebfdcf099bff94642a66ad25f27cf206`
(`fix: repair release QA copy and footer identity`) and were pushed to
`origin/main` before deployment.

The artifact remains a Rust CLI/library plus its Azure Static Web Apps landing
site. The researched brief, local-first behavior, demo sandbox, and Evidence
Orchard visual thesis are unchanged.

## Repairs and exact regression coverage

1. **Plain-words landing copy:** Replaced the verifier-cited metaphorical and
   non-informative labels with concrete, product-specific section copy. The
   hero caption now describes linked files, commands, tests, and delegated
   work; sections are named *Review evidence*, *How it works*, *CLI usage*,
   and *Pricing*. The final call to action now states what the sample contains.
   `.factory/copy-audit.md` lists all visible landing copy and verifies every
   entry is 22 words or fewer.
2. **Factory/build footer identity:** Every shipped HTML route (`/`, `/demo`,
   `/privacy/`, `/terms/`, and `/404.html`) now includes **Built by Param
   Factory · v0.1.0 · build agent-audit-ledger-repair-7** plus the same
   product-specific one-liner. The browser regression visits every route in
   desktop and 390px projects and asserts the visible identity.
3. **Social preview:** Added the original, project-derived
   `agent-audit-ledger-social.webp` at exactly 1200×630, updated both Open
   Graph and Twitter metadata, and set immutable caching. It is a centered
   ImageMagick crop of the existing factory-generated Evidence Orchard hero;
   provenance is recorded in `.factory/design.md`.
4. **Source regression:** `site/test/site-contract.test.js` fails if a cited
   phrase returns, a static footer omits factory/build identity, social metadata
   changes, the WebP ceases to be 1200×630, immutable caching disappears, or
   the copy audit is incomplete. It passes under `npm test`.

## Verification evidence

### Clean install, claims, CLI, crate, and package

- `npm ci` completed from the repair tree. `npm audit --audit-level=high`
  reported **0 vulnerabilities**.
- Every exact command in `.factory/claims.json` passed. The four browser
  claims passed in both desktop Chrome and 390×844 projects; the six CLI claims
  passed independently. This includes the isolated demo, local-only browser
  requests, offline service-worker reload/update, exports, content exclusion,
  redaction, network guard, schema, and signed-manifest checks.
- `npm run check` passed: rustfmt; Clippy with warnings denied; 13 Rust
  workflow tests; one doctest; and 23 Node tests (including the new site
  contract test).
- `npm run build` produced `dist/bin/aal` and `dist/site`; `npm run pack:cli`
  produced `dist/packages/aal-0.1.0-linux-x86_64.tar.gz`; and
  `cargo package --locked` packaged 12 project files and verified its build.
- A fresh consumer unpacked the packaged crate and compiled the documented
  public `parse_jsonl`, `build`, `to_json`, and `to_markdown` API. A separately
  unpacked release archive passed `aal --help`, `aal schema`, and
  `aal demo --json-output`; the demo reported one file and three evidence
  records.

### Browser, accessibility, privacy, offline, and performance

- Local production-output and live production Playwright each passed **32/32**
  tests across desktop and 390px mobile. The suite covers sample/demo isolation,
  malformed input recovery, downloads, keyboard skip-link/focus, touch target
  sizing, reduced motion, local-only requests, service-worker update and
  offline reload, all routes, and the repaired footer/social behavior.
- Playwright Axe scans found **0 serious or critical** violations on the home
  workbench, `/demo`, `/privacy/`, `/terms/`, and `/404.html` in both browser
  projects. The standalone Axe CLI could not locate a system Chrome in this
  worker, so the repository's official Playwright Axe integration was used.
- `/opt/fleet/lib/verify-url.sh` passed locally and live on `/demo`. The final
  live report recorded title `Demo — Agent Audit Ledger`, `lang=en`, one h1, a
  main landmark, no missing image alt text or unlabeled buttons, and **0**
  console/page errors.
- The first-load application JavaScript is **16,004 B raw / 6,312 B gzip**.
  Shared/home CSS is **16,204 B raw / 4,427 B gzip**. The new social preview is
  42,406 B; the existing LCP hero is 54,572 B.
- Live mobile Lighthouse on `/demo`: **100** performance, **100**
  accessibility, **100** best practices, **100** SEO; FCP **1.0 s**, LCP
  **1.3 s**, TBT **30 ms**, CLS **0**.

### Deployment, response policy, and live identity

- Deployed the exact `dist/site` directory via the static work-order deployer
  to Azure deployment `5095e35d-c847-414e-bf92-dfc8998e600e`. The default host
  is `ambitious-plant-082cc7a0f.7.azurestaticapps.net`; production is
  https://agent-audit-ledger.sociobot.in.
- All **21** public production files matched the local `dist/site` files
  byte-for-byte by SHA-256, excluding only the intentionally non-public
  `staticwebapp.config.json`.
- Live `/not-a-real-route` returns HTTP **404** with the styled 404 document.
  `/staticwebapp.config.json` returns 404. HTML has
  `public, must-revalidate, max-age=30`; hashed assets and the social image are
  one-year immutable; `sw.js` is `no-cache, no-store, must-revalidate`.
- Live headers include the response-header CSP with `frame-ancestors 'none'`,
  HSTS, `Permissions-Policy`, `strict-origin-when-cross-origin`, and
  `X-Content-Type-Options: nosniff`.
- The live invalid-license request returned JSON `{"valid":false,"reason":"invalid"}`
  with `Cache-Control: no-store`. The advertised hosted checkout test passed
  and redirected with HTTP 303 to `checkout.dodopayments.com`.

## How to verify

```sh
npm ci
npm audit --audit-level=high
# Run every command listed in .factory/claims.json.
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
npm run test:billing:live
```

Run the CLI sample with `dist/bin/aal demo --json-output`; open `/demo` for the
browser sandbox. The demo uses `demo:agent-audit-ledger:workbench` only and can
be reset or discarded with **Start for real**.

## Known gaps and next steps

No product release blocker remains. The first two immediate post-deploy calls
to the external Sociobot checkout endpoint returned transient HTTP 500; a third
retry 15 seconds later passed the repository's exact live checkout test with a
303 redirect. This was an external service condition, not a changed product
route. Registry publication remains an owner operation; the crate and Linux
archive are ready to publish.
