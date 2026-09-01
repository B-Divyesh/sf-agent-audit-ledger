# Landing-page copy audit

Audited 2026-09-01 from `site/index.html`. Counts treat hyphenated terms,
product names, command names, and numbers as one word. All visible landing
sentences, headings, labels, actions, and footer copy are listed below. No
entry exceeds 22 words or contains a banned plain-words term.

## First screen

| Words | Copy |
| ---: | --- |
| 5 | Offline evidence for agent-assisted code |
| 5 | Review agent-assisted patches with evidence. |
| 15 | For engineers reviewing agent-assisted patches who need to see what changed, why, and what ran. |
| 5 | Try it with sample data |
| 8 | Opens a finished ledger with four sample events. |
| 3 | Install the CLI |
| 6 | Works offline after the first visit. |
| 3 | Redacted by default. |
| 3 | Open event schema. |
| 11 | The ledger links changed files to commands, tests, and delegated work. |

## Review evidence and workflow

| Words | Copy |
| ---: | --- |
| 2 | Review evidence |
| 4 | Keep patch evidence together. |
| 3 | Terminal output disappears. |
| 3 | Agent narration changes. |
| 10 | The ledger keeps files, commands, tests, and delegated tasks together. |
| 3 | How it works |
| 7 | Create a review ledger in three steps. |
| 12 | Any agent, hook, shell, or CI job can write documented JSONL events. |
| 3 | Record JSONL events |
| 14 | Write one strict event for a file, command, test, or delegated task. |
| 4 | Unknown fields fail loudly. |
| 3 | Hash and connect |
| 14 | The CLI hashes current files and artifacts, then links execution evidence to each change. |
| 3 | Export and verify |
| 11 | Hand reviewers clean Markdown plus structured JSON. |
| 6 | Add an Ed25519 signature when provenance matters. |

## Browser workbench and CLI

| Words | Copy |
| ---: | --- |
| 2 | Browser workbench |
| 7 | Build a review ledger in your browser. |
| 14 | Paste JSONL below. The workbench processes it locally and does not upload it. |
| 2 | Action events |
| 2 | Load sample |
| 1 | Clear |
| 3 | JSONL event stream |
| 6 | One JSON object per line. |
| 8 | Prompts and file contents are not accepted fields. |
| 6 | Add files for browser hashing optional |
| 2 | Choose files |
| 13 | A unique file name also matches a directory-qualified event path such as src/lib.rs. |
| 2 | Privacy controls |
| 5 | Include paths in the preview |
| 5 | Include full command arguments |
| 3 | Build the ledger |
| 2 | Review ledger |
| 2 | Export MD |
| 2 | Export JSON |
| 3 | No ledger yet |
| 11 | Paste events or load the sample. Your data stays in this browser. |
| 4 | Recorded workflow 6 seconds |
| 20 | The operator loads four sample events, builds the ledger locally, then reviews one changed file and three linked evidence entries. |
| 4 | There is no audio. |
| 2 | CLI usage |
| 9 | Build a review ledger from the command line. |
| 11 | Run it beside any coding agent. It needs no account or running service. |
| 2 | One binary |
| 4 | Runs in a shell |
| 2 | Two exports |
| 3 | Markdown plus strict JSON |
| 2 | Bundled sample |
| 10 | aal demo writes only to a new temp folder |

## Pricing, sample, and footer

| Words | Copy |
| ---: | --- |
| 1 | Pricing |
| 9 | Free ledger tools and a one-time team kit. |
| 7 | The free tools export redacted, hashed ledgers. |
| 6 | The CLI can also sign them. |
| 8 | The optional team kit saves one policy preset. |
| 3 | Team policy kit |
| 3 | 49 USD one-time |
| 7 | Save one named redaction policy locally |
| 6 | Export policy JSON for team repositories |
| 7 | Reuse saved settings in later ledgers |
| 8 | Include schema version 1 in every policy export |
| 4 | Buy the team kit |
| 10 | Sociobot/Dodo is merchant of record. Refunds revoke the license. |
| 3 | Have a license? Restore it |
| 2 | License token |
| 2 | Verify license |
| 2 | Sample ledger |
| 10 | Review the sample ledger before using your own events. |
| 9 | It contains one changed file and three evidence records. |
| 5 | Try it with sample data |
| 7 | Local evidence for reviewing agent-assisted patches. |
| 4 | Built by Param Factory |
| 6 | v0.1.0 build agent-audit-ledger-repair-8 |

## Terminology

| Concept | One term used |
| --- | --- |
| Input record | event |
| Complete input | event stream |
| Review output | ledger |
| Changed repository item | file |
| Linked command, test, or delegation record | evidence |
| Isolated try-out | demo |
| Optional paid feature | Team policy kit |
| Saved privacy choices | policy |
| Purchase credential | license token |
