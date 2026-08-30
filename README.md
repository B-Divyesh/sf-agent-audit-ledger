# Agent Audit Ledger

Agent Audit Ledger (`aal`) turns tool-neutral JSONL action events into a compact,
offline review artifact. It helps engineers reviewing agent-assisted patches see
which files, commands, tests, and delegated tasks produced a change.

It is for engineers reviewing agent-assisted patches who need to answer “what
changed, why, and what was verified?” without replaying terminal scrollback.

## Install

Download a release binary, or install from source with Rust 1.85+:

```sh
cargo install agent-audit-ledger
```

## Try the shipped sample

Run a complete, isolated sample with no setup:

~~~sh
aal demo
# or: aal --demo
~~~

The command creates a new temporary directory, builds a redacted and hashed
ledger from [examples/review-actions.jsonl](examples/review-actions.jsonl),
and prints where it wrote audit.md and audit.json. It never reads from or
writes to your current repository. Use aal demo --json-output in scripts.

The browser workbench has the same one-click sample at
https://agent-audit-ledger.sociobot.in/demo (or /demo when running locally).
Its persistent banner offers **Reset demo** and **Start for real**; the sample
uses the separate demo:agent-audit-ledger:workbench storage key.

## Usage

Create `actions.jsonl` using the [open event schema](schema/event.schema.json):

```jsonl
{"version":"1","time":"2026-08-27T10:12:00Z","type":"file","path":"src/lib.rs","action":"modified","reason":"Link evidence to changed files"}
{"version":"1","time":"2026-08-27T10:14:00Z","type":"command","command":"cargo test --all","exit_code":0,"files":["src/lib.rs"]}
{"version":"1","time":"2026-08-27T10:15:00Z","type":"test","name":"ledger package","status":"passed","artifact":"test-results/ledger.txt","files":["src/lib.rs"]}
{"version":"1","time":"2026-08-27T10:16:00Z","type":"delegation","task":"Review redaction behavior","delegate":"reviewer-1","status":"completed","files":["src/lib.rs"]}
```

Build Markdown and JSON ledgers. Paths and command arguments are redacted by
default; each ledger uses fresh random opaque IDs so a guessed path cannot be
matched to its exported ID. File contents and prompts are never copied into the
ledger.

```sh
aal build --input actions.jsonl --markdown audit.md --json audit.json --root .
aal verify --input audit.json
```

Use `--include-paths` or `--include-arguments` only when the review context
requires that metadata. For signed manifests:

```sh
aal keygen --private-key audit.key --public-key audit.pub
aal build --input actions.jsonl --json audit.json --sign-key audit.key --root .
aal verify --input audit.json --public-key audit.pub
```

Automation-friendly commands support `--json-output`; errors go to stderr and
use non-zero exit codes. Run `aal --help` for all options and `aal schema` to
print the bundled schema.

## Event schema

Every line is one UTF-8 JSON object with `version: "1"` and one of four event
types: `file`, `command`, `test`, or `delegation`. Unknown fields are rejected
so producer mistakes do not silently weaken an audit. Timestamps use RFC 3339.
Calendar-invalid dates, invalid UTC offsets, duplicate file references,
references without a corresponding file event, and event-type-incompatible
statuses are rejected before a ledger is generated.
Paths are resolved beneath `--root`; traversal and symlink escapes are rejected.
Hashes establish byte identity only—they do not prove author intent or code
quality.

## Develop and verify

```sh
cargo test --all
cargo build --release
npm ci
npm test
npm run build       # complete product -> dist/bin and dist/site
npm run pack:cli    # release archives -> dist/packages
```

The static documentation and local demo live in `site/`. `npm run build:site`
outputs exactly to `dist/site`. There are no runtime third-party scripts,
fonts, or analytics. The browser workbench processes its event text and selected
files locally; an explicit license verification is the only optional product
API call. In the browser demo, one uniquely named selected file can match a
directory-qualified event path such as `src/lib.rs`; ambiguous basenames stay
unmatched rather than risking the wrong hash.

Run `npm run test:e2e` for desktop and 390 px browser coverage. Run
`npm run test:billing:live` to confirm that the advertised purchase route
redirects to Sociobot's hosted checkout.

## Deploy

Deploy `dist/site/` as a static site. It includes the Azure Static Web Apps
configuration for immutable assets, service-worker updates, CSP, and
Permissions-Policy. The factory publishes release archives from
`dist/packages/`; this repository does not contain registry credentials.

## Privacy and security

Ledger processing is local. The website workbench processes selected files in
the browser. License tokens and paid policy presets are stored in localStorage;
the separate demo state is discarded with **Start for real**. See `/privacy/`
and `/terms/`. Please report security issues privately to the repository owner
rather than attaching sensitive ledgers to a public issue.

## License

MIT. See [LICENSE](LICENSE).
