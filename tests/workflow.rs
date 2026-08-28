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
