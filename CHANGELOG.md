# Changelog

All notable changes follow semantic versioning.

## Unreleased

- Register Team policy, license-cache, file-hashing, price, and checkout claims
  with observable regressions.
- Add complete route metadata and a product-derived Apple touch icon.
- Raise every wordmark target to 44 px and fix singular file status copy.
- Add a one-click isolated sample for the browser workbench and the aal demo
  command, with a bundled JSONL fixture and generated temporary workspace.
- Add a tested claims manifest and demo-sandbox documentation.
- Reject evidence references that have no corresponding changed-file event in
  both the CLI and browser workbench.
- Replace deterministic path-derived IDs with fresh per-ledger random opaque
  IDs while preserving file-to-evidence linkage.
- Select `generated_at` by the parsed RFC 3339 instant rather than lexical
  timestamp ordering in the CLI and browser workbench.
- Reject calendar-invalid RFC 3339 timestamps and duplicate evidence file
  references in both the CLI and browser workbench.
- Align the published event schema with per-type status constraints and keep
  the published copy synchronized during static-site builds.
- Add Azure Static Web Apps cache and security-header configuration.

## 0.1.0 — 2026-08-27

- Add the `aal` single-binary CLI and typed Rust ledger library.
- Add strict JSONL event schema, privacy-safe redaction, SHA-256 evidence hashes,
  deterministic Markdown/JSON exports, and optional Ed25519 signatures.
- Add the local browser demo, documentation, legal pages, and paid team-policy
  unlock.
