# Agent Audit Ledger demo sandbox

## Browser workbench

Open [the browser demo](https://agent-audit-ledger.sociobot.in/demo), or open
/demo locally. ?demo=1 also enters the same mode. The first rendered view
already contains a completed ledger built from four realistic review events:
one changed file, a passing command, a passing test with an artifact, and a
completed delegated review.

The visible banner says “Demo — sample data, nothing is saved.” It offers:

- **Reset demo** to restore the shipped events and default redaction settings.
- **Start for real** to discard the demo state and return to the blank
  workbench.

Browser-demo state is stored only under
demo:agent-audit-ledger:workbench. It never reads or writes the real aal:
team-policy key or the sb_license: license keys. Files selected in the demo
remain browser-local and are not persisted.

## CLI

The bundled sample input is
[examples/review-actions.jsonl](../examples/review-actions.jsonl). Run:

~~~sh
aal demo
# or
aal --demo
~~~

Each command creates a new agent-audit-ledger-demo-* directory beneath the
operating system temporary directory. It writes actions.jsonl, a matching
sample source file, a test artifact, and generated audit.md and audit.json
there, then prints the exact directory. It never reads from or writes to the
current repository. Use aal demo --json-output for scriptable output paths.
