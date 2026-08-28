//! Build portable, privacy-safe review ledgers from JSONL action events.
//!
//! The public surface is intentionally small: parse events with [`parse_jsonl`],
//! build a [`Manifest`], then render it as JSON or Markdown.
//!
//! ```no_run
//! use agent_audit_ledger::{BuildOptions, build, parse_jsonl, to_markdown};
//!
//! let input = r#"{"version":"1","time":"2026-08-27T10:12:00Z","type":"file","path":"src/lib.rs","action":"modified","reason":"Link evidence"}"#;
//! let events = parse_jsonl(input)?;
//! let manifest = build(&events, &BuildOptions::default())?;
//! println!("{}", to_markdown(&manifest));
//! # Ok::<(), String>(())
//! ```

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use ed25519_dalek::{Signature as DalekSignature, Signer, SigningKey, Verifier, VerifyingKey};
use rand::rngs::OsRng;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs;
use std::path::{Component, Path, PathBuf};

pub const SCHEMA_VERSION: &str = "1";
pub const EVENT_SCHEMA: &str = include_str!("../schema/event.schema.json");

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Event {
    pub version: String,
    pub time: String,
    #[serde(rename = "type")]
    pub kind: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub path: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub action: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub command: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub files: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub name: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub status: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub artifact: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub task: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub delegate: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct FileRecord {
    pub id: String,
    pub path: String,
    pub action: String,
    pub reason: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub sha256: String,
    pub state: String,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub evidence: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct EvidenceRecord {
    pub id: String,
    #[serde(rename = "type")]
    pub kind: String,
    pub time: String,
    pub summary: String,
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub exit_code: Option<i32>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub files: Vec<String>,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub artifact: String,
    #[serde(default, skip_serializing_if = "String::is_empty")]
    pub artifact_sha256: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct LedgerSignature {
    pub algorithm: String,
    pub public_key: String,
    pub public_key_fingerprint: String,
    pub value: String,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct Summary {
    pub file_count: usize,
    pub evidence_count: usize,
    pub passed_tests: usize,
    pub failed_tests: usize,
    pub failed_commands: usize,
    pub delegated_tasks: usize,
    pub unlinked_events: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Manifest {
    pub schema_version: String,
    pub generated_at: String,
    pub privacy: String,
    pub summary: Summary,
    pub files: Vec<FileRecord>,
    pub evidence: Vec<EvidenceRecord>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub signature: Option<LedgerSignature>,
}

#[derive(Debug, Clone)]
pub struct BuildOptions {
    pub root: PathBuf,
    pub include_paths: bool,
    pub include_arguments: bool,
}

impl Default for BuildOptions {
    fn default() -> Self {
        Self {
            root: PathBuf::from("."),
            include_paths: false,
            include_arguments: false,
        }
    }
}

/// Parse and validate newline-delimited v1 action events.
pub fn parse_jsonl(input: &str) -> Result<Vec<Event>, String> {
    let mut events = Vec::new();
    for (index, line) in input.lines().enumerate() {
        if line.trim().is_empty() {
            continue;
        }
        let event: Event = serde_json::from_str(line)
            .map_err(|error| format!("line {}: invalid JSON event: {error}", index + 1))?;
        validate_event(&event).map_err(|error| format!("line {}: {error}", index + 1))?;
        events.push(event);
    }
    if events.is_empty() {
        return Err("input contains no events".into());
    }
    Ok(events)
}

fn validate_event(event: &Event) -> Result<(), String> {
    if event.version != SCHEMA_VERSION {
        return Err(format!("version must be {SCHEMA_VERSION:?}"));
    }
    if !valid_rfc3339(&event.time) {
        return Err("time must be RFC 3339".into());
    }
    if event.files.iter().any(|value| value.trim().is_empty()) {
        return Err("files cannot contain an empty path".into());
    }
    match event.kind.as_str() {
        "file"
            if event.path.as_deref().unwrap_or("").is_empty()
                || !matches!(
                    event.action.as_deref(),
                    Some("added" | "modified" | "deleted" | "renamed")
                )
                || event.reason.as_deref().unwrap_or("").is_empty() =>
        {
            Err("file events require path, action, and reason".into())
        }
        "command"
            if event.command.as_deref().unwrap_or("").is_empty() || event.exit_code.is_none() =>
        {
            Err("command events require command and exit_code".into())
        }
        "test"
            if event.name.as_deref().unwrap_or("").is_empty()
                || !matches!(
                    event.status.as_deref(),
                    Some("passed" | "failed" | "skipped")
                ) =>
        {
            Err("test events require name and status passed, failed, or skipped".into())
        }
        "delegation"
            if event.task.as_deref().unwrap_or("").is_empty()
                || event.delegate.as_deref().unwrap_or("").is_empty()
                || !matches!(
                    event.status.as_deref(),
                    Some("started" | "completed" | "failed" | "cancelled")
                ) =>
        {
            Err("delegation events require task, delegate, and a valid status".into())
        }
        "file" | "command" | "test" | "delegation" => Ok(()),
        other => Err(format!("unsupported type {other:?}")),
    }
}

fn valid_rfc3339(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() >= 20
        && bytes.get(4) == Some(&b'-')
        && bytes.get(7) == Some(&b'-')
        && bytes.get(10) == Some(&b'T')
        && bytes.get(13) == Some(&b':')
        && bytes.get(16) == Some(&b':')
        && (value.ends_with('Z') || value.rfind(['+', '-']).is_some_and(|i| i > 18))
}

/// Hash files and artifacts, redact metadata, and link evidence to changes.
pub fn build(events: &[Event], options: &BuildOptions) -> Result<Manifest, String> {
    let root = options
        .root
        .canonicalize()
        .map_err(|error| format!("resolve root: {error}"))?;
    let mut manifest = Manifest {
        schema_version: SCHEMA_VERSION.into(),
        generated_at: String::new(),
        privacy: privacy_label(options),
        summary: Summary::default(),
        files: vec![],
        evidence: vec![],
        signature: None,
    };
    let mut index = HashMap::new();
    for event in events.iter().filter(|event| event.kind == "file") {
        let path = event.path.as_deref().unwrap();
        let deleted = event.action.as_deref() == Some("deleted");
        let relative = safe_relative(&root, path, deleted)
            .map_err(|error| format!("file {path:?}: {error}"))?;
        if index.contains_key(&relative) {
            return Err(format!("file {path:?}: duplicate file event"));
        }
        let id = opaque_id("file", &relative);
        let mut record = FileRecord {
            id: id.clone(),
            path: if options.include_paths {
                slash(&relative)
            } else {
                id
            },
            action: event.action.clone().unwrap(),
            reason: event.reason.clone().unwrap(),
            sha256: String::new(),
            state: if deleted {
                "deleted".into()
            } else {
                "present".into()
            },
            evidence: vec![],
        };
        if !deleted {
            record.sha256 = hash_file(&root.join(&relative))
                .map_err(|error| format!("hash {path:?}: {error}"))?;
        }
        index.insert(relative, manifest.files.len());
        manifest.files.push(record);
    }
    let mut evidence_number = 0;
    for event in events.iter().filter(|event| event.kind != "file") {
        evidence_number += 1;
        let mut refs = Vec::new();
        for path in &event.files {
            let relative = safe_relative(&root, path, true)
                .map_err(|error| format!("evidence path {path:?}: {error}"))?;
            refs.push(opaque_id("file", &relative));
        }
        let id = format!("evidence-{evidence_number:03}");
        let (summary, status) = match event.kind.as_str() {
            "command" => {
                let code = event.exit_code.unwrap();
                if code != 0 {
                    manifest.summary.failed_commands += 1;
                }
                (
                    redact_command(event.command.as_deref().unwrap(), options.include_arguments),
                    if code == 0 { "passed" } else { "failed" }.into(),
                )
            }
            "test" => {
                if event.status.as_deref() == Some("passed") {
                    manifest.summary.passed_tests += 1;
                }
                if event.status.as_deref() == Some("failed") {
                    manifest.summary.failed_tests += 1;
                }
                (event.name.clone().unwrap(), event.status.clone().unwrap())
            }
            "delegation" => {
                manifest.summary.delegated_tasks += 1;
                (
                    format!(
                        "{} — {}",
                        event.task.as_deref().unwrap(),
                        event.delegate.as_deref().unwrap()
                    ),
                    event.status.clone().unwrap(),
                )
            }
            _ => unreachable!(),
        };
        let (artifact, artifact_sha256) = if let Some(path) = &event.artifact {
            let relative = safe_relative(&root, path, false)
                .map_err(|error| format!("artifact {path:?}: {error}"))?;
            (
                if options.include_paths {
                    slash(&relative)
                } else {
                    opaque_id("artifact", &relative)
                },
                hash_file(&root.join(relative))
                    .map_err(|error| format!("hash artifact {path:?}: {error}"))?,
            )
        } else {
            (String::new(), String::new())
        };
        if refs.is_empty() {
            manifest.summary.unlinked_events += 1;
        }
        for reference in &refs {
            if let Some(file) = manifest.files.iter_mut().find(|file| &file.id == reference) {
                file.evidence.push(id.clone());
            }
        }
        manifest.evidence.push(EvidenceRecord {
            id,
            kind: event.kind.clone(),
            time: event.time.clone(),
            summary,
            status,
            exit_code: event.exit_code,
            files: refs,
            artifact,
            artifact_sha256,
        });
    }
    manifest.generated_at = events
        .iter()
        .map(|event| event.time.as_str())
        .max()
        .unwrap()
        .to_string();
    manifest.files.sort_by(|a, b| a.id.cmp(&b.id));
    manifest.summary.file_count = manifest.files.len();
    manifest.summary.evidence_count = manifest.evidence.len();
    Ok(manifest)
}

fn safe_relative(root: &Path, input: &str, allow_missing: bool) -> Result<PathBuf, String> {
    if input.trim().is_empty() {
        return Err("path is empty".into());
    }
    let supplied = Path::new(input);
    let joined = if supplied.is_absolute() {
        supplied.to_path_buf()
    } else {
        root.join(supplied)
    };
    let resolved = match joined.canonicalize() {
        Ok(path) => path,
        Err(_error) if allow_missing => lexical_normalize(&joined),
        Err(error) => return Err(error.to_string()),
    };
    resolved
        .strip_prefix(root)
        .map(Path::to_path_buf)
        .map_err(|_| "path escapes root".into())
}

fn lexical_normalize(path: &Path) -> PathBuf {
    let mut out = PathBuf::new();
    for component in path.components() {
        match component {
            Component::ParentDir => {
                out.pop();
            }
            Component::CurDir => {}
            other => out.push(other.as_os_str()),
        }
    }
    out
}

fn hash_file(path: &Path) -> Result<String, String> {
    let data = fs::read(path).map_err(|error| error.to_string())?;
    Ok(format!("{:x}", Sha256::digest(data)))
}

fn opaque_id(kind: &str, path: &Path) -> String {
    let digest = Sha256::digest(slash(path).as_bytes());
    format!("{kind}:{}", &format!("{digest:x}")[..12])
}

fn slash(path: &Path) -> String {
    path.to_string_lossy().replace('\\', "/")
}

fn redact_command(command: &str, include: bool) -> String {
    if include {
        return command.into();
    }
    let Some(first) = command.split_whitespace().next() else {
        return "[command redacted]".into();
    };
    let name = Path::new(first)
        .file_name()
        .and_then(|part| part.to_str())
        .unwrap_or(first);
    if command.split_whitespace().count() > 1 {
        format!("{name} [arguments redacted]")
    } else {
        name.into()
    }
}

fn privacy_label(options: &BuildOptions) -> String {
    match (options.include_paths, options.include_arguments) {
        (true, true) => "paths and command arguments included by explicit opt-in",
        (true, false) => "paths included by explicit opt-in; command arguments redacted",
        (false, true) => "paths redacted; command arguments included by explicit opt-in",
        (false, false) => {
            "paths and command arguments redacted; prompts and file contents excluded"
        }
    }
    .into()
}

#[derive(Serialize, Deserialize)]
struct KeyFile {
    algorithm: String,
    key: String,
}

/// Create a new Ed25519 keypair without overwriting existing key files.
pub fn generate_keypair(private_path: &Path, public_path: &Path) -> Result<(), String> {
    if private_path.exists() || public_path.exists() {
        return Err("refusing to overwrite an existing key".into());
    }
    let signing = SigningKey::generate(&mut OsRng);
    write_key(private_path, &signing.to_bytes(), true)?;
    write_key(public_path, signing.verifying_key().as_bytes(), false)
}

fn write_key(path: &Path, key: &[u8], private: bool) -> Result<(), String> {
    let data = serde_json::to_vec_pretty(&KeyFile {
        algorithm: "ed25519".into(),
        key: BASE64.encode(key),
    })
    .unwrap();
    fs::write(path, [data, b"\n".to_vec()].concat())
        .map_err(|error| format!("write key {}: {error}", path.display()))?;
    #[cfg(unix)]
    if private {
        use std::os::unix::fs::PermissionsExt;
        fs::set_permissions(path, fs::Permissions::from_mode(0o600))
            .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn read_key(path: &Path, expected: usize) -> Result<Vec<u8>, String> {
    let data = fs::read(path).map_err(|error| format!("read key {}: {error}", path.display()))?;
    let file: KeyFile = serde_json::from_slice(&data)
        .map_err(|error| format!("parse key {}: {error}", path.display()))?;
    if file.algorithm != "ed25519" {
        return Err("unsupported key algorithm".into());
    }
    let key = BASE64
        .decode(file.key)
        .map_err(|_| "invalid key encoding".to_string())?;
    if key.len() != expected {
        return Err("invalid key length".into());
    }
    Ok(key)
}

fn canonical_payload(manifest: &Manifest) -> Result<Vec<u8>, String> {
    let mut unsigned = manifest.clone();
    unsigned.signature = None;
    serde_json::to_vec(&unsigned).map_err(|error| error.to_string())
}

/// Add an embedded Ed25519 signature to a manifest.
pub fn sign(manifest: &mut Manifest, private_path: &Path) -> Result<(), String> {
    let bytes: [u8; 32] = read_key(private_path, 32)?.try_into().unwrap();
    let signing = SigningKey::from_bytes(&bytes);
    let public = signing.verifying_key();
    let fingerprint = format!("sha256:{:x}", Sha256::digest(public.as_bytes()));
    let signature = signing.sign(&canonical_payload(manifest)?);
    manifest.signature = Some(LedgerSignature {
        algorithm: "ed25519".into(),
        public_key: BASE64.encode(public.as_bytes()),
        public_key_fingerprint: fingerprint,
        value: BASE64.encode(signature.to_bytes()),
    });
    Ok(())
}

/// Validate the schema version and, when present, the embedded signature.
pub fn verify(manifest: &Manifest, public_path: Option<&Path>) -> Result<(), String> {
    if manifest.schema_version != SCHEMA_VERSION {
        return Err(format!(
            "unsupported manifest schema version {:?}",
            manifest.schema_version
        ));
    }
    let Some(signature) = &manifest.signature else {
        return if public_path.is_some() {
            Err("manifest is unsigned but a public key was supplied".into())
        } else {
            Ok(())
        };
    };
    if signature.algorithm != "ed25519" {
        return Err("unsupported signature algorithm".into());
    }
    let public_bytes: [u8; 32] = BASE64
        .decode(&signature.public_key)
        .map_err(|_| "manifest public key is invalid".to_string())?
        .try_into()
        .map_err(|_| "manifest public key is invalid".to_string())?;
    if let Some(path) = public_path
        && read_key(path, 32)? != public_bytes
    {
        return Err("manifest was not signed by the supplied public key".into());
    }
    let public = VerifyingKey::from_bytes(&public_bytes)
        .map_err(|_| "manifest public key is invalid".to_string())?;
    let signature_bytes: [u8; 64] = BASE64
        .decode(&signature.value)
        .map_err(|_| "signature value is invalid".to_string())?
        .try_into()
        .map_err(|_| "signature value is invalid".to_string())?;
    public
        .verify(
            &canonical_payload(manifest)?,
            &DalekSignature::from_bytes(&signature_bytes),
        )
        .map_err(|_| "signature verification failed: manifest may have changed".into())
}

pub fn to_json(manifest: &Manifest) -> Result<String, String> {
    serde_json::to_string_pretty(manifest)
        .map(|value| value + "\n")
        .map_err(|error| error.to_string())
}

pub fn to_markdown(m: &Manifest) -> String {
    let mut out = format!(
        "# Agent Audit Ledger\n\n> Generated {} · schema v{} · {}\n\n## Review at a glance\n\n- **{} {}** and **{} evidence events**\n- **Tests:** {} passed, {} failed\n- **Commands:** {} failed\n- **Delegated tasks:** {}\n",
        m.generated_at,
        m.schema_version,
        m.privacy,
        m.summary.file_count,
        if m.summary.file_count == 1 {
            "file"
        } else {
            "files"
        },
        m.summary.evidence_count,
        m.summary.passed_tests,
        m.summary.failed_tests,
        m.summary.failed_commands,
        m.summary.delegated_tasks
    );
    if m.summary.unlinked_events > 0 {
        out += &format!(
            "- **Needs review:** {} evidence events are not linked to a changed file\n",
            m.summary.unlinked_events
        );
    }
    out += "\n## Changed files\n\n";
    if m.files.is_empty() {
        out += "No file events were recorded.\n\n";
    }
    for file in &m.files {
        out += &format!(
            "### `{}` · {}\n\n{}\n\n",
            escape(&file.path),
            file.action,
            file.reason
        );
        if !file.sha256.is_empty() {
            out += &format!("- SHA-256: `{}`\n", file.sha256);
        }
        out += &format!(
            "- State: {}\n- Evidence: {}\n\n",
            file.state,
            if file.evidence.is_empty() {
                "none recorded".into()
            } else {
                file.evidence.join(", ")
            }
        );
    }
    out += "## Execution evidence\n\n";
    for event in &m.evidence {
        let mark = match event.status.as_str() {
            "passed" | "completed" => "✓",
            "failed" => "✗",
            _ => "○",
        };
        out += &format!(
            "- {mark} **{} · {}** — `{}`",
            event.kind,
            event.status,
            escape(&event.summary)
        );
        if let Some(code) = event.exit_code {
            out += &format!(" (exit {code})");
        }
        if !event.files.is_empty() {
            out += &format!(" → {}", event.files.join(", "));
        }
        if !event.artifact_sha256.is_empty() {
            out += &format!(
                " · artifact `{}` SHA-256 `{}`",
                event.artifact, event.artifact_sha256
            );
        }
        out.push('\n');
    }
    if m.evidence.is_empty() {
        out += "No command, test, or delegation evidence was recorded.\n";
    }
    out += "\n## Integrity\n\n";
    if let Some(signature) = &m.signature {
        out += &format!(
            "Ed25519 signed · public key `{}`. Verify with `aal verify`. Hashes and signatures establish byte identity only; they do not prove intent or correctness.\n",
            signature.public_key_fingerprint
        );
    } else {
        out += "Unsigned manifest. File hashes establish byte identity only; they do not prove intent or correctness.\n";
    }
    out
}

fn escape(value: &str) -> String {
    value.replace('`', "\\`")
}
