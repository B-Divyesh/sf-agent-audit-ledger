# Changelog

All notable changes follow semantic versioning.

## Unreleased

- Reject calendar-invalid RFC 3339 timestamps and duplicate evidence file
  references in both the CLI and browser workbench.
- Align the published event schema with per-type status constraints and keep
  the published copy synchronized during static-site builds.
- Add Azure Static Web Apps cache and security-header configuration.

## 0.1.0 — 2026-08-27

- Add the `aal` single-binary CLI and typed Go ledger library.
- Add strict JSONL event schema, privacy-safe redaction, SHA-256 evidence hashes,
  deterministic Markdown/JSON exports, and optional Ed25519 signatures.
- Add the local browser demo, documentation, legal pages, and paid team-policy
  unlock.
