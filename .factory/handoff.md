# Agent Audit Ledger — repair 5 handoff

## Result: PASS

Work order agent-audit-ledger-repair-5 repaired the independent-verifier
blockers recorded in .factory/verification-4.md. The repair started from the
obtainable origin commit 2ee37251113fe023ed23f826e61abbc4df1b61ab, not the
unreachable SHA named in the old report. The deployable candidate is
8605a8cccebba069d9a947b1f1b9c2b85cc976f2; it was pushed to origin/main before
this handoff and deployed to production.

The Rust CLI/library artifact and Azure Static Web Apps deployment class are
unchanged. The researched brief and Evidence Orchard visual thesis remain in
place.

## Repairs and regression coverage

1. Added .factory/claims.json with eight observable claims. The manifest test
   fails if any claim does not have exactly one matching @claim regression.
   Every command listed in the manifest was run successfully.
2. The first screen now names engineers reviewing agent-assisted patches and
   provides the required Try it with sample data action. It opens /demo with a
   completed one-file, three-evidence ledger already visible.
3. Browser demo mode is isolated under
   demo:agent-audit-ledger:workbench. Its persistent banner offers Reset demo
   and Start for real. It does not read or write real license or team-policy
   keys. /demo and ?demo=1 are both covered.
4. Added examples/review-actions.jsonl and shipped aal demo plus aal --demo.
   Each creates a new operating-system temporary directory containing sample
   input, source, artifact, audit.md, and audit.json; the command prints the
   exact output directory. The packaged installed binary was exercised with
   the same command.
5. Fixed a 390px overflow triggered by the prefilled demo’s opaque file ID.
   The demo claim asserts no horizontal overflow.
6. Fixed a demo-only layout shift: a small self-hosted route marker reserves
   the demo banner before first paint, is precached, and is protected by a
   static regression. Final live Lighthouse CLS is 0.

## Verification evidence

### Clean build, CLI, package, and claims

- Fresh clone: npm ci and npm audit --audit-level=high passed with zero high
  vulnerabilities. npm run check and npm run build passed in the clean clone.
- Final candidate: npm run check passed: rustfmt, Clippy with warnings denied,
  13 Rust workflow tests, one doctest, 20 Node tests, including the claims
  manifest regression.
- npm run build passed. Final first-load application JS is 16,001 bytes raw /
  6,319 bytes gzip; core CSS is 15,934 bytes raw / 4,389 bytes gzip.
- npm run pack:cli produced dist/packages/aal-0.1.0-linux-x86_64.tar.gz.
- A separate clean package clone ran cargo package --locked successfully:
  12 files, 78.7 KiB unpacked and 21.4 KiB compressed. The post-package
  static-only commits do not change the Rust package contents.
- The packaged crate installed successfully to an empty Cargo root. Its
  help lists both demo and --demo; the installed aal demo --json-output
  created the redacted, hashed sample outputs in a new temporary directory.
- Every claim command in .factory/claims.json passed: browser sandbox, local
  request policy, offline reload, both exports, CLI demo, default redaction,
  schema, and signed-manifest tamper detection.

### Browser, accessibility, privacy, offline, and update path

- Final production Playwright run: 26 of 26 passed across Desktop Chrome and
  the 390 by 844 mobile profile. It includes keyboard skip navigation, visible
  file-picker focus, 44px controls, reset/start-real isolation, no horizontal
  overflow, errors, legal routes, privacy request capture, and offline reload.
- The offline claim opens a dedicated browser context, activates the service
  worker, switches offline, and reloads the seeded demo successfully.
- Service worker cache aal-shell-v3 removes previous cache names on activate;
  its shell includes /demo and /demo-route.js. The no-cache service-worker
  response policy remains tested.
- The page verifier passed on live /demo: HTTP 200, title, lang=en, one h1,
  main landmark, no missing image alt text, no unlabeled buttons, and no
  console/page errors. Evidence: /tmp/aal-final-verify-uIj9zC.
- Independent live Axe scans at 390px found zero serious or critical issues
  on /, /demo, /privacy/, and /terms/. Every route has exactly one h1 and main
  landmark, no console errors, and no horizontal overflow.
- The browser-local-only claim records all requests during the fresh demo flow
  and permits only the product origin. No input or selected files leave the
  browser in that flow.

### Deployment, identity, response policy, and performance

- Deployed with the work-order static configuration:

  ~~~sh
  swa deploy dist/site --env production -n sf-agent-audit-ledger -R sociobot -w dist/site --no-use-keychain
  ~~~

  Azure confirmed production deployment to
  https://ambitious-plant-082cc7a0f.7.azurestaticapps.net. The public custom
  domain is https://agent-audit-ledger.sociobot.in.
- Final live SHA-256 identity matched exactly for index.html
  (4cce5919c0d1b561d6edd32ce6edf09fbd9661c1e317128471fe6d55b84c3072),
  the emitted home JavaScript
  (778c99c4437a1098c0f4942ef92dea95ed77c76c92a1a0c5a4b326d8e858832e),
  and the core stylesheet
  (11dafbc6cbf2fbca24390c119d55ab8afc070bb8c00ca83478183b9dd22837b1).
  The route bootstrap also matched byte-for-byte.
- Live headers verify CSP with frame-ancestors none, Permissions-Policy, HSTS,
  Referrer-Policy, and nosniff. HTML routes use 30-second must-revalidate
  caching, hashed assets are one-year immutable, and sw.js is no-cache,
  no-store, must-revalidate.
- Live checkout regression passed and redirected to Sociobot’s hosted payment
  page.
- Live Lighthouse on /demo: Performance 100, Accessibility 100, Best
  Practices 100, SEO 100; FCP 0.9 s, LCP 1.3 s, TBT 40 ms, CLS 0.

## Commands

~~~sh
npm ci
npm audit --audit-level=high
npm run check
npm run build
npm run pack:cli
cargo package --locked
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
npm run test:billing:live
~~~

See .factory/claims.json for the individual claim commands and .factory/demo.md
for the browser and CLI demo contracts.

## Known gaps and next steps

No release-blocking findings remain. Registry publication remains an owner
operation; the release archive and Cargo package are ready. No runtime model
feature was added because the core job is deterministic local evidence
generation and does not require a model.
