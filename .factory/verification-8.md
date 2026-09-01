# Independent verification 8 — FAIL

**Candidate:** `e01d0724a07b209ad289d2d11db604f9c33ebdf7`  
**Live URL:** <https://agent-audit-ledger.sociobot.in/>  
**Verified:** 2026-09-01 UTC

## Verdict

**FAIL — release is not approved.** The local product, published CLI package,
live site, demo, accessibility checks, offline reload, and all executable
in-scope claim tests passed. One required claim command, `team-kit-checkout`,
was not run because it contacts an external billing host outside the stated
resource boundary. The same boundary also means the documented request
allowance and 429/`Retry-After` behavior of the license endpoint were not
observed. The claims contract makes an unrun listed claim release-blocking.

No product code was changed during this verification.

## First-read result

**PASS.** A cold live visit answered all three required questions in plain
words: it reviews agent-assisted patches with evidence; it is for engineers
reviewing those patches; and the first action is **Try it with sample data**.
The adjacent text says it opens a finished ledger with four sample events. One
click opened `/demo`, showed the persistent **Demo — sample data, nothing is
saved** banner plus **Reset demo** and **Start for real**, and displayed a
completed ledger with one changed file and three evidence records.

## Claims run first from the clean candidate

After `npm ci`, the following exact listed commands passed. Browser claim
commands ran in both desktop Chrome and the 390×844 project.

| Claim | Result |
| --- | --- |
| `demo-sandbox` | PASS |
| `browser-local-only` | PASS |
| `browser-file-hashing` | PASS |
| `offline-reload` | PASS |
| `exports-markdown-json` | PASS |
| `cli-demo` | PASS |
| `redaction-default` | PASS |
| `content-exclusion` | PASS |
| `cli-local-only` | PASS |
| `open-event-schema` | PASS |
| `manifest-signing` | PASS |
| `team-policy-workflow` | PASS |
| `license-daily-verification` | PASS |
| `license-local-verification` | PASS |
| `team-kit-price` | PASS |
| `team-kit-checkout` | NOT RUN — requires the external billing host |
| `inactive-license-lock` | PASS |

`npm test` additionally passed 13 Rust workflow tests, one Rust documentation
example, and 23 Node tests. `npm run check` passed formatting, Clippy with
warnings denied, and the complete test suite. The full local browser suite
passed 38/38; the same suite against the live URL passed 38/38.

## Product QA evidence

- `npm run build` completed and produced `dist/bin/aal` and `dist/site`.
  Initial application JavaScript was 16,663 B raw / 6,463 B gzip; CSS was
  17,264 B raw / 4,975 B gzip.
- `npm run pack:cli` produced the Linux archive. In a new temporary consumer
  directory, its unpacked `aal` binary showed help, printed the four-type
  event schema, and `aal demo --json-output` produced the reported input,
  Markdown, and JSON files.
- `cargo package --locked` completed and verified the 12-file crate package.
- Live desktop and 390px `/demo` both returned 200 with `lang=en`, one `h1`,
  one `main`, the demo banner, no horizontal overflow, and no console or page
  errors. The first Tab focused the skip link. Reduced motion on mobile gave
  `scroll-behavior: auto` and a `0.00001s` button transition.
- Independent Axe scans on live desktop and mobile found no serious or
  critical findings. The local suite also covers home, demo, privacy, terms,
  and 404 routes.
- In a fresh live demo flow, the browser request log contained only
  `https://agent-audit-ledger.sociobot.in`; the workbench did not upload the
  sample or pasted data. The live demo service worker activated from `/sw.js`
  and a cached offline reload retained the completed sample ledger.
- Live HTML has a response-header CSP with `frame-ancestors 'none'`, HSTS,
  `Referrer-Policy: strict-origin-when-cross-origin`, `nosniff`, and a
  Permissions-Policy. HTML uses a 30-second revalidation policy; the hashed
  JavaScript uses one-year immutable caching; `sw.js` uses `no-cache,
  no-store, must-revalidate`.
- The live footer build identity is `agent-audit-ledger-repair-8`, matching
  the candidate source and its production asset name
  `assets/home-B2Jkdr_2.js`.

## Defects

### Blocker — required checkout claim and endpoint allowance remain unverified

`.factory/claims.json` requires
`npm run test:billing:live` for the published hosted-checkout claim. Its test
contacts `api.sociobot.in` and follows the hosted checkout location. The work
order prohibits contacting any resource other than the allowed product host,
so it was not run. This leaves one required claim without fresh execution
evidence.

The same scope prevents observing the license endpoint's documented request
allowance, 429 response, and `Retry-After` header. There is no product-hosted
server endpoint; this applies to the optional Team-license endpoint only.

Run the listed checkout command and the documented single-client allowance
check from an authorized environment, record the observed allowance and
`Retry-After`, then update this report before release.

## Retest

```sh
npm ci
# Run every exact command in .factory/claims.json, including:
npm run test:billing:live
npm run check
npm run build
npm run pack:cli
npm run test:e2e
PLAYWRIGHT_BASE_URL=https://agent-audit-ledger.sociobot.in npm run test:e2e
```

Then record the checkout redirect result and the optional license endpoint's
single-client allowance, 429 behavior, and `Retry-After` header from an
environment authorized to reach that endpoint.
