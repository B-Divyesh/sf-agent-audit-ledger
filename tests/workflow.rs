use agent_audit_ledger::{BuildOptions, Manifest};
use std::fs;
use tempfile::tempdir;

#[test]
fn documented_example_builds_and_redacts() {
    let root = tempdir().unwrap();
    fs::create_dir_all(root.path().join("internal/ledger")).unwrap();
    fs::create_dir_all(root.path().join("test-results")).unwrap();
    fs::write(
        root.path().join("internal/ledger/build.rs"),
        "pub fn build() {}\n",
    )
    .unwrap();
    fs::write(root.path().join("test-results/ledger.txt"), "PASS\n").unwrap();
    let input = r#"{"version":"1","time":"2026-08-27T10:12:00Z","type":"file","path":"internal/ledger/build.rs","action":"modified","reason":"Link evidence to changed files"}
{"version":"1","time":"2026-08-27T10:14:00Z","type":"command","command":"cargo test --all","exit_code":0,"files":["internal/ledger/build.rs"]}
{"version":"1","time":"2026-08-27T10:15:00Z","type":"test","name":"ledger package","status":"passed","artifact":"test-results/ledger.txt","files":["internal/ledger/build.rs"]}"#;
    let events = agent_audit_ledger::parse_jsonl(input).unwrap();
    let manifest = agent_audit_ledger::build(
        &events,
        &BuildOptions {
            root: root.path().into(),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(manifest.summary.file_count, 1);
    assert_eq!(manifest.summary.passed_tests, 1);
    assert!(!manifest.files[0].path.contains("build.rs"));
    assert_eq!(manifest.evidence[0].summary, "cargo [arguments redacted]");
    assert_eq!(manifest.files[0].sha256.len(), 64);
    assert!(agent_audit_ledger::to_markdown(&manifest).contains("Link evidence to changed files"));
}

#[test]
fn opt_in_metadata_is_included() {
    let root = tempdir().unwrap();
    fs::write(root.path().join("file.rs"), "x").unwrap();
    let events = agent_audit_ledger::parse_jsonl("{\"version\":\"1\",\"time\":\"2026-08-27T10:12:00Z\",\"type\":\"file\",\"path\":\"file.rs\",\"action\":\"added\",\"reason\":\"reason\"}\n{\"version\":\"1\",\"time\":\"2026-08-27T10:13:00Z\",\"type\":\"command\",\"command\":\"cargo test --all\",\"exit_code\":0}").unwrap();
    let manifest = agent_audit_ledger::build(
        &events,
        &BuildOptions {
            root: root.path().into(),
            include_paths: true,
            include_arguments: true,
        },
    )
    .unwrap();
    assert_eq!(manifest.files[0].path, "file.rs");
    assert_eq!(manifest.evidence[0].summary, "cargo test --all");
}

#[test]
fn default_redaction_never_exposes_a_leading_environment_secret() {
    let root = tempdir().unwrap();
    fs::write(root.path().join("file.rs"), "x").unwrap();
    let events = agent_audit_ledger::parse_jsonl(
        r#"{"version":"1","time":"2026-08-28T00:00:00Z","type":"file","path":"file.rs","action":"modified","reason":"redaction regression"}
{"version":"1","time":"2026-08-28T00:01:00Z","type":"command","command":"API_TOKEN=supersecret cargo test","exit_code":0,"files":["file.rs"]}"#,
    )
    .unwrap();
    let manifest = agent_audit_ledger::build(
        &events,
        &BuildOptions {
            root: root.path().into(),
            ..Default::default()
        },
    )
    .unwrap();

    assert_eq!(manifest.evidence[0].summary, "[command redacted]");
    assert!(
        !agent_audit_ledger::to_json(&manifest)
            .unwrap()
            .contains("supersecret")
    );
    assert!(!agent_audit_ledger::to_markdown(&manifest).contains("supersecret"));
}

#[test]
fn rejects_unknown_fields_and_root_escape() {
    let unknown = r#"{"version":"1","time":"2026-08-27T10:12:00Z","type":"file","path":"a","action":"added","reason":"x","prompt":"secret"}"#;
    assert!(
        agent_audit_ledger::parse_jsonl(unknown)
            .unwrap_err()
            .contains("unknown field")
    );
    let root = tempdir().unwrap();
    let events = agent_audit_ledger::parse_jsonl(r#"{"version":"1","time":"2026-08-27T10:12:00Z","type":"file","path":"../secret","action":"deleted","reason":"x"}"#).unwrap();
    assert!(
        agent_audit_ledger::build(
            &events,
            &BuildOptions {
                root: root.path().into(),
                ..Default::default()
            }
        )
        .unwrap_err()
        .contains("escapes root")
    );
}

#[test]
fn rejects_calendar_invalid_rfc3339_timestamps() {
    for timestamp in [
        "2026-99-99T99:99:99Z",
        "2025-02-29T12:00:00Z",
        "2026-04-31T12:00:00Z",
        "2026-08-27T24:00:00Z",
        "2026-08-27T10:00:00+24:00",
    ] {
        let input = format!(
            r#"{{"version":"1","time":"{timestamp}","type":"file","path":"file.rs","action":"added","reason":"valid fields"}}"#
        );
        assert!(
            agent_audit_ledger::parse_jsonl(&input)
                .unwrap_err()
                .contains("time must be RFC 3339"),
            "{timestamp} should be rejected"
        );
    }
    assert!(agent_audit_ledger::parse_jsonl(
        r#"{"version":"1","time":"2024-02-29T23:59:59.123+23:59","type":"file","path":"file.rs","action":"added","reason":"valid leap day"}"#
    )
    .is_ok());
}

#[test]
fn enforces_schema_status_constraints_and_unique_file_references() {
    let test_started = r#"{"version":"1","time":"2026-08-27T10:12:00Z","type":"test","name":"suite","status":"started"}"#;
    assert!(
        agent_audit_ledger::parse_jsonl(test_started)
            .unwrap_err()
            .contains("test events require")
    );
    let delegation_skipped = r#"{"version":"1","time":"2026-08-27T10:12:00Z","type":"delegation","task":"review","delegate":"agent-1","status":"skipped"}"#;
    assert!(
        agent_audit_ledger::parse_jsonl(delegation_skipped)
            .unwrap_err()
            .contains("delegation events require")
    );
    let duplicate_files = r#"{"version":"1","time":"2026-08-27T10:12:00Z","type":"command","command":"cargo test","exit_code":0,"files":["src/lib.rs","src/lib.rs"]}"#;
    assert!(
        agent_audit_ledger::parse_jsonl(duplicate_files)
            .unwrap_err()
            .contains("duplicate")
    );
    let valid_test = r#"{"version":"1","time":"2026-08-27T10:12:00Z","type":"test","name":"suite","status":"passed","files":["src/lib.rs"]}"#;
    assert!(agent_audit_ledger::parse_jsonl(valid_test).is_ok());
}

#[test]
fn rejects_evidence_references_without_a_changed_file_event() {
    let root = tempdir().unwrap();
    fs::write(root.path().join("changed.rs"), "changed").unwrap();
    let events = agent_audit_ledger::parse_jsonl(
        r#"{"version":"1","time":"2026-08-28T00:00:00Z","type":"file","path":"changed.rs","action":"modified","reason":"baseline"}
{"version":"1","time":"2026-08-28T00:01:00Z","type":"command","command":"cargo test","exit_code":0,"files":["other.rs"]}"#,
    )
    .unwrap();
    assert!(
        agent_audit_ledger::build(
            &events,
            &BuildOptions {
                root: root.path().into(),
                ..Default::default()
            }
        )
        .unwrap_err()
        .contains("no matching file event")
    );
}

#[test]
fn redacted_file_ids_are_random_per_ledger_and_preserve_links() {
    let root = tempdir().unwrap();
    fs::write(root.path().join("src.rs"), "changed").unwrap();
    let events = agent_audit_ledger::parse_jsonl(
        r#"{"version":"1","time":"2026-08-28T00:00:00Z","type":"file","path":"src.rs","action":"modified","reason":"baseline"}
{"version":"1","time":"2026-08-28T00:01:00Z","type":"command","command":"cargo test","exit_code":0,"files":["src.rs"]}"#,
    )
    .unwrap();
    let options = BuildOptions {
        root: root.path().into(),
        ..Default::default()
    };
    let first = agent_audit_ledger::build(&events, &options).unwrap();
    let second = agent_audit_ledger::build(&events, &options).unwrap();
    assert!(first.files[0].id.starts_with("file:"));
    assert_ne!(first.files[0].id, second.files[0].id);
    assert_eq!(first.evidence[0].files, vec![first.files[0].id.clone()]);
    assert_eq!(first.files[0].evidence, vec![first.evidence[0].id.clone()]);
}

#[test]
fn selects_generated_at_by_instant_not_timestamp_spelling() {
    let root = tempdir().unwrap();
    fs::write(root.path().join("src.rs"), "changed").unwrap();
    let events = agent_audit_ledger::parse_jsonl(
        r#"{"version":"1","time":"2026-08-28T10:00:00+14:00","type":"file","path":"src.rs","action":"modified","reason":"earlier instant"}
{"version":"1","time":"2026-08-28T00:00:00Z","type":"command","command":"cargo test","exit_code":0,"files":["src.rs"]}"#,
    )
    .unwrap();
    let manifest = agent_audit_ledger::build(
        &events,
        &BuildOptions {
            root: root.path().into(),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(manifest.generated_at, "2026-08-28T00:00:00Z");
}

#[test]
fn selects_generated_at_correctly_across_a_leap_second() {
    let root = tempdir().unwrap();
    fs::write(root.path().join("src.rs"), "changed").unwrap();
    let events = agent_audit_ledger::parse_jsonl(
        r#"{"version":"1","time":"2016-12-31T23:59:60.900Z","type":"file","path":"src.rs","action":"modified","reason":"leap second"}
{"version":"1","time":"2017-01-01T00:00:00.800Z","type":"command","command":"cargo test","exit_code":0,"files":["src.rs"]}"#,
    )
    .unwrap();
    let manifest = agent_audit_ledger::build(
        &events,
        &BuildOptions {
            root: root.path().into(),
            ..Default::default()
        },
    )
    .unwrap();
    assert_eq!(manifest.generated_at, "2016-12-31T23:59:60.900Z");
}

#[test]
fn signed_manifest_detects_tampering() {
    let root = tempdir().unwrap();
    let private = root.path().join("private.key");
    let public = root.path().join("public.key");
    agent_audit_ledger::generate_keypair(&private, &public).unwrap();
    let mut manifest = Manifest {
        schema_version: "1".into(),
        generated_at: "2026-08-27T10:00:00Z".into(),
        privacy: "redacted".into(),
        summary: Default::default(),
        files: vec![],
        evidence: vec![],
        signature: None,
    };
    agent_audit_ledger::sign(&mut manifest, &private).unwrap();
    agent_audit_ledger::verify(&manifest, Some(&public)).unwrap();
    let mut fingerprint_tampered = manifest.clone();
    fingerprint_tampered
        .signature
        .as_mut()
        .unwrap()
        .public_key_fingerprint = format!("sha256:{}", "0".repeat(64));
    for pinned_key in [None, Some(public.as_path())] {
        assert!(
            agent_audit_ledger::verify(&fingerprint_tampered, pinned_key)
                .unwrap_err()
                .contains("fingerprint does not match")
        );
    }
    manifest.privacy = "changed".into();
    assert!(agent_audit_ledger::verify(&manifest, Some(&public)).is_err());
}

#[test]
fn json_round_trips() {
    let manifest = Manifest {
        schema_version: "1".into(),
        generated_at: "2026-08-27T10:00:00Z".into(),
        privacy: "redacted".into(),
        summary: Default::default(),
        files: vec![],
        evidence: vec![],
        signature: None,
    };
    let data = agent_audit_ledger::to_json(&manifest).unwrap();
    let decoded: Manifest = serde_json::from_str(&data).unwrap();
    assert_eq!(decoded, manifest);
}
