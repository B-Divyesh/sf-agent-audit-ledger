use agent_audit_ledger::{BuildOptions, Manifest};
use clap::{Parser, Subcommand};
use rand::{RngCore, rngs::OsRng};
use serde_json::json;
use std::fs;
use std::io::{self, Read};
use std::path::{Path, PathBuf};

#[derive(Parser)]
#[command(
    name = "aal",
    version,
    about = "Build offline evidence manifests for agent-assisted code review",
    long_about = "Agent Audit Ledger turns tool-neutral JSONL action events into portable Markdown and JSON review artifacts. Processing is local; prompts and file contents are never copied.\n\nPaths and command arguments are redacted by default. Opt in only when reviewers need them."
)]
struct Cli {
    /// Run the bundled sample in a new temporary directory
    #[arg(long, global = true)]
    demo: bool,
    #[command(subcommand)]
    command: Option<Command>,
}

#[derive(Subcommand)]
enum Command {
    /// Hash touched files and export a review ledger
    Build {
        /// JSONL input path, or - for stdin
        #[arg(short, long, default_value = "-")]
        input: String,
        /// Markdown output path; defaults to stdout
        #[arg(long)]
        markdown: Option<PathBuf>,
        /// JSON manifest output path
        #[arg(long = "json")]
        json_path: Option<PathBuf>,
        /// Root directory used to resolve and hash files
        #[arg(long, default_value = ".")]
        root: PathBuf,
        /// Include repository-relative paths (privacy opt-in)
        #[arg(long)]
        include_paths: bool,
        /// Include complete command arguments (privacy opt-in)
        #[arg(long)]
        include_arguments: bool,
        /// Ed25519 private key created by aal keygen
        #[arg(long)]
        sign_key: Option<PathBuf>,
        /// Print a machine-readable result instead of Markdown
        #[arg(long)]
        json_output: bool,
    },
    /// Validate a manifest and verify its signature when present
    Verify {
        /// JSON manifest to verify
        #[arg(short, long)]
        input: PathBuf,
        /// Optional public key to pin the signer identity
        #[arg(long)]
        public_key: Option<PathBuf>,
        /// Print a machine-readable result
        #[arg(long)]
        json_output: bool,
    },
    /// Create an Ed25519 signing keypair
    Keygen {
        /// New private key path
        #[arg(long)]
        private_key: PathBuf,
        /// New public key path
        #[arg(long)]
        public_key: PathBuf,
        /// Print a machine-readable result
        #[arg(long)]
        json_output: bool,
    },
    /// Build a ledger from bundled sample events in a temporary directory
    Demo {
        /// Print the output paths as JSON
        #[arg(long)]
        json_output: bool,
    },
    /// Print the open event JSON Schema
    Schema,
}

fn main() {
    if let Err(error) = run() {
        eprintln!("aal: {error}");
        std::process::exit(1);
    }
}

fn run() -> Result<(), String> {
    let cli = Cli::parse();
    if cli.demo {
        if cli.command.is_some() {
            return Err("use either --demo or the demo command, not both".into());
        }
        return run_demo(false);
    }
    match cli
        .command
        .ok_or_else(|| "choose a command; run aal --help for usage".to_string())?
    {
        Command::Build {
            input,
            markdown,
            json_path,
            root,
            include_paths,
            include_arguments,
            sign_key,
            json_output,
        } => {
            if json_output && markdown.is_none() && json_path.is_none() {
                return Err("--json-output needs --markdown or --json so the result stream stays unambiguous".into());
            }
            let input_text = if input == "-" {
                let mut value = String::new();
                io::stdin()
                    .read_to_string(&mut value)
                    .map_err(|error| format!("read stdin: {error}"))?;
                value
            } else {
                fs::read_to_string(&input)
                    .map_err(|error| format!("read input {input}: {error}"))?
            };
            let events = agent_audit_ledger::parse_jsonl(&input_text)?;
            let mut manifest = agent_audit_ledger::build(
                &events,
                &BuildOptions {
                    root,
                    include_paths,
                    include_arguments,
                },
            )?;
            if let Some(key) = sign_key {
                agent_audit_ledger::sign(&mut manifest, &key)?;
            }
            let json_data = agent_audit_ledger::to_json(&manifest)?;
            let markdown_data = agent_audit_ledger::to_markdown(&manifest);
            if let Some(path) = &json_path {
                atomic_write(path, json_data.as_bytes())?;
            }
            if let Some(path) = &markdown {
                atomic_write(path, markdown_data.as_bytes())?;
            } else if !json_output {
                print!("{markdown_data}");
            }
            if json_output {
                println!(
                    "{}",
                    json!({"ok": true, "files": manifest.files.len(), "evidence": manifest.evidence.len(), "signed": manifest.signature.is_some(), "markdown": markdown, "json": json_path})
                );
            }
        }
        Command::Verify {
            input,
            public_key,
            json_output,
        } => {
            let data = fs::read(&input)
                .map_err(|error| format!("read manifest {}: {error}", input.display()))?;
            let manifest: Manifest = serde_json::from_slice(&data)
                .map_err(|error| format!("parse manifest: {error}"))?;
            agent_audit_ledger::verify(&manifest, public_key.as_deref())?;
            let signed = manifest.signature.is_some();
            if json_output {
                println!(
                    "{}",
                    json!({"ok": true, "signed": signed, "schema_version": manifest.schema_version})
                );
            } else if signed {
                println!("Verified: signature is valid and the manifest is unchanged.");
            } else {
                println!(
                    "Valid: manifest structure is readable (unsigned; authenticity was not checked)."
                );
            }
        }
        Command::Keygen {
            private_key,
            public_key,
            json_output,
        } => {
            if private_key == public_key {
                return Err("private and public key paths must differ".into());
            }
            agent_audit_ledger::generate_keypair(&private_key, &public_key)?;
            if json_output {
                println!(
                    "{}",
                    json!({"ok": true, "private_key": private_key, "public_key": public_key})
                );
            } else {
                println!(
                    "Created {} and {}. Keep the private key secret.",
                    private_key.display(),
                    public_key.display()
                );
            }
        }
        Command::Demo { json_output } => run_demo(json_output)?,
        Command::Schema => print!("{}", agent_audit_ledger::EVENT_SCHEMA),
    }
    Ok(())
}

const DEMO_EVENTS: &str = include_str!("../examples/review-actions.jsonl");
const DEMO_SOURCE: &str = "pub fn linked_evidence_count(events: usize) -> usize {\n    events\n}\n";
const DEMO_ARTIFACT: &str = "review-ledger sample: 18 tests passed\n";

/// Create a complete, disposable review workspace and render its sample ledger.
/// Nothing is read from or written to the caller's current directory.
fn run_demo(json_output: bool) -> Result<(), String> {
    let mut nonce = [0_u8; 8];
    OsRng.fill_bytes(&mut nonce);
    let directory = std::env::temp_dir().join(format!(
        "agent-audit-ledger-demo-{}-{}",
        std::process::id(),
        nonce
            .iter()
            .map(|byte| format!("{byte:02x}"))
            .collect::<String>()
    ));
    fs::create_dir_all(directory.join("src"))
        .map_err(|error| format!("create demo directory: {error}"))?;
    fs::create_dir_all(directory.join("test-results"))
        .map_err(|error| format!("create demo directory: {error}"))?;
    fs::write(directory.join("actions.jsonl"), DEMO_EVENTS)
        .map_err(|error| format!("write demo events: {error}"))?;
    fs::write(directory.join("src/review.rs"), DEMO_SOURCE)
        .map_err(|error| format!("write demo source: {error}"))?;
    fs::write(
        directory.join("test-results/review-ledger.txt"),
        DEMO_ARTIFACT,
    )
    .map_err(|error| format!("write demo artifact: {error}"))?;

    let events = agent_audit_ledger::parse_jsonl(DEMO_EVENTS)?;
    let manifest = agent_audit_ledger::build(
        &events,
        &BuildOptions {
            root: directory.clone(),
            ..Default::default()
        },
    )?;
    let markdown_path = directory.join("audit.md");
    let json_path = directory.join("audit.json");
    atomic_write(
        &markdown_path,
        agent_audit_ledger::to_markdown(&manifest).as_bytes(),
    )?;
    atomic_write(
        &json_path,
        agent_audit_ledger::to_json(&manifest)?.as_bytes(),
    )?;

    if json_output {
        println!(
            "{}",
            json!({
                "ok": true,
                "demo_dir": directory,
                "input": directory.join("actions.jsonl"),
                "markdown": markdown_path,
                "json": json_path,
                "files": manifest.files.len(),
                "evidence": manifest.evidence.len()
            })
        );
    } else {
        println!("Demo ledger written to {}", directory.display());
        println!(
            "Sample input: {}",
            directory.join("actions.jsonl").display()
        );
        println!("Open audit.md or audit.json to review the generated ledger.");
    }
    Ok(())
}

fn atomic_write(path: &Path, data: &[u8]) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("create output directory: {error}"))?;
    }
    let temp = path.with_extension(format!(
        "{}.aal-tmp",
        path.extension().and_then(|ext| ext.to_str()).unwrap_or("")
    ));
    fs::write(&temp, data).map_err(|error| format!("write output {}: {error}", path.display()))?;
    fs::rename(&temp, path).map_err(|error| format!("replace output {}: {error}", path.display()))
}
