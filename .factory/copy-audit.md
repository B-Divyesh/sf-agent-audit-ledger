# Landing-page copy audit

Audited 2026-08-30 from the rendered production build. Counts treat hyphenated
terms, paths, and numbers as one word. No sentence exceeds 22 words. No copy
uses the banned words from the plain-words checklist.

## First screen

| Words | Copy |
| ---: | --- |
| 5 | Offline evidence for agent-assisted code |
| 5 | Know what made the patch. |
| 18 | Turn files, commands, tests, and delegated tasks into one readable review ledger—without recording prompts or sending telemetry. |
| 2 | Open schema |
| 3 | Redacted by default |
| 5 | Signed when you need it |
| 5 | A patch is a destination. |
| 5 | The ledger preserves the path. |

The headline and supporting sentence state the job and privacy boundary in one
breath. The adjacent primary action opens the unsaved browser workbench.

## Product explanation and workflow

| Words | Copy |
| ---: | --- |
| 5 | The diff tells you what. |
| 5 | The ledger tells you how. |
| 3 | Terminal scrollback disappears. |
| 7 | Agent narration is reconstructed after the fact. |
| 6 | Another model review adds more guesses. |
| 11 | A ledger keeps deterministic evidence close to the files it supports. |
| 6 | From action stream to review artifact. |
| 16 | The format stays deliberately boring so any agent, hook, shell, or CI job can produce it. |
| 3 | Record JSONL events |
| 12 | Write one strict event for a file, command, test, or delegated task. |
| 4 | Unknown fields fail loudly. |
| 3 | Hash and connect |
| 14 | The CLI hashes current files and artifacts, then links execution evidence to each change. |
| 3 | Export and verify |
| 7 | Hand reviewers clean Markdown plus structured JSON. |
| 7 | Add an Ed25519 signature when provenance matters. |

## Browser workbench

| Words | Copy |
| ---: | --- |
| 4 | Try the evidence path. |
| 3 | Paste JSONL below. |
| 10 | The preview runs entirely in your browser; nothing is uploaded. |
| 5 | One JSON object per line. |
| 8 | Prompts and file contents are not accepted fields. |
| 13 | A unique file name also matches a directory-qualified event path such as `src/lib.rs`. |
| 4 | Ready for JSONL events. |
| 3 | No ledger yet |
| 6 | Paste events or load the example. |
| 6 | Your data stays in this browser. |
| 4 | Recorded workflow · 6 seconds. |
| 20 | The operator loads four example events, builds the ledger locally, then reviews one changed file and three linked evidence entries. |
| 4 | There is no audio. |

## CLI, price, and closing copy

| Words | Copy |
| ---: | --- |
| 7 | A small binary for the review loop. |
| 6 | Run it beside any coding agent. |
| 7 | No daemon, account, database, or runtime telemetry. |
| 4 | One binary: Linux, macOS, Windows |
| 4 | Two exports: Markdown + strict JSON |
| 5 | Zero telemetry: your repository stays local |
| 3 | The ledger is free. |
| 4 | Team memory is one-time. |
| 10 | Core CLI, browser export, redaction, hashing, and signing stay open. |
| 10 | The optional team kit remembers and shares consistent policy presets. |
| 3 | $49 USD · one-time |
| 5 | Save named redaction policies locally |
| 6 | Export policy JSON for team repositories |
| 5 | Reuse review conventions across projects |
| 5 | All future v1 policy updates |
| 5 | Sociobot/Dodo is merchant of record. |
| 4 | Refunds revoke the license. |
| 6 | Read our privacy policy and terms. |
| 3 | Free ledger active. |
| 5 | Team policy kit is optional. |
| 10 | Store this browser’s current redaction choices under a team-readable name. |
| 11 | The goal is not to prove that an agent meant well. |
| 10 | It is to make the work legible enough to judge. |
| 9 | A portable record for the path behind a patch. |

## Terminology

| Concept | One term used |
| --- | --- |
| Input record | event |
| Complete input | event stream |
| Review output | ledger |
| Changed repository item | file |
| Linked command/test/delegation record | evidence |
| Optional paid feature | Team policy kit |
| Saved privacy choices | policy |
| Purchase credential | license token |
