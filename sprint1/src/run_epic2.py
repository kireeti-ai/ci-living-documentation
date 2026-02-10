#!/usr/bin/env python3
"""
EPIC-2 Documentation Generator
Consumes EPIC-1 impact report and generates living documentation
"""

import os
import sys
from datetime import datetime, timezone

from sprint1.src.ci.r2_uploader import upload_docs_to_r2
from sprint1.src.loader import load_impact_report
from sprint1.src.readme_generator import generate_readme
from sprint1.src.api_generator import generate_api_docs, generate_api_descriptions_json
from sprint1.src.adr_generator import generate_adr
from sprint1.src.diagram_generator import system_diagram, sequence_diagram, er_diagram
from sprint1.src.tree_generator import generate_tree
from sprint1.src.snapshot_writer import write_snapshot, compute_documentation_health
from sprint1.src.rag_retriever import build_rag_context
from sprint1.src.architecture_doc_generator import generate_architecture_doc
from sprint1.src.health_report_generator import generate_health_report

INPUT_PATH = "sprint1/input/impact_report.json"
OUTPUT_BASE = "sprint1/artifacts/docs"


def ensure_directories():
    for d in [
        OUTPUT_BASE,
        f"{OUTPUT_BASE}/api",
        f"{OUTPUT_BASE}/adr",
        f"{OUTPUT_BASE}/architecture",
    ]:
        os.makedirs(d, exist_ok=True)


def get_impact_report():
    if not os.path.exists(INPUT_PATH):
        print(f"❌ Missing impact report at {INPUT_PATH}")
        sys.exit(1)


    print(f"📂 Using impact report: {INPUT_PATH}")
    report, warnings = load_impact_report(INPUT_PATH)
    

    # ---------------------------------------------------------
    # Sanitize Repository Name (Fix for temp clone names)
    # ---------------------------------------------------------
    ctx = report.get("context", {})
    repo_name = ctx.get("repository", "")
    
    # 1. Prefer explicit override from env var
    override_name = os.getenv("REPOSITORY_NAME")
    if override_name:
         print(f"🔧 Using explicit repository name from env: '{override_name}'")
         ctx["repository"] = override_name
         report["context"] = ctx
    
    # 2. If no override and looks like temp name, try to infer
    elif "git_clone_" in repo_name or not repo_name:
        # Try to infer from environment or CWD
        new_name = os.getenv("GITHUB_REPOSITORY", "").split("/")[-1]
        if not new_name:
            # Fallback to current directory name
            new_name = os.path.basename(os.getcwd())
            
        print(f"⚠️ Detected temporary repository name '{repo_name}'. Overriding with '{new_name}'.")
        ctx["repository"] = new_name
        report["context"] = ctx
    # ---------------------------------------------------------


    for w in warnings:
        print(f"⚠️ {w}")
    return report



def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Generated {path}")


def _load_env_files():
    """Load key=value pairs from .env files if variables are not already exported."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    env_files = [
        os.path.join(repo_root, ".env"),
        os.path.join(repo_root, "backend", ".env"),
    ]
    for env_path in env_files:
        if not os.path.exists(env_path):
            continue
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value


def _derive_generated_at(report):
    deterministic = os.getenv("DETERMINISTIC_DOCS", "true").lower() == "true"
    if deterministic:
        commit_timestamp = report.get("context", {}).get("commit_timestamp")
        if commit_timestamp:
            return commit_timestamp
        return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def generate_all_docs(report, project_id, commit_hash, generated_at, docs_bucket_path):
    generated_files = []
    errors = []
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    # RAG context disabled to prevent hallucinations from the tool's own codebase
    # rag_context = build_rag_context(repo_root) 
    rag_context = {}

    def attempt(path, type_, description, fn):
        try:
            content = fn()
            write_file(path, content)
            generated_files.append({
                "path": os.path.relpath(path, OUTPUT_BASE).replace("\\", "/"),
                "type": type_,
                "description": description
            })
        except Exception as e:
            errors.append({"path": path, "error": str(e)})

    # Architecture & High-level docs first
    attempt(
        f"{OUTPUT_BASE}/README.generated.md",
        "markdown",
        "Auto-generated repository README",
        lambda: generate_readme(report, generated_at, rag_context=rag_context)
    )
    attempt(
        f"{OUTPUT_BASE}/adr/ADR-001.md",
        "markdown",
        "Architecture Baseline",
        lambda: generate_adr(report, generated_at, rag_context=rag_context)
    )
    attempt(
        f"{OUTPUT_BASE}/architecture/system.mmd",
        "mermaid",
        "System architecture diagram",
        lambda: system_diagram(report)
    )
    attempt(
        f"{OUTPUT_BASE}/architecture/sequence.mmd",
        "mermaid",
        "Process sequence diagram",
        lambda: sequence_diagram(report)
    )
    attempt(
        f"{OUTPUT_BASE}/architecture/er.mmd",
        "mermaid",
        "Entity-relationship diagram",
        lambda: er_diagram(report)
    )
    attempt(
        f"{OUTPUT_BASE}/architecture/architecture.md",
        "markdown",
        "Architecture documentation text",
        lambda: generate_architecture_doc(report)
    )
    
    # Detailed API docs later (can be slow)
    attempt(
        f"{OUTPUT_BASE}/api/api-reference.md",
        "markdown",
        "API endpoint documentation",
        lambda: generate_api_docs(report, rag_context=rag_context)
    )
    attempt(
        f"{OUTPUT_BASE}/api/api-descriptions.json",
        "json",
        "API endpoint descriptions map",
        lambda: generate_api_descriptions_json(report, rag_context=rag_context)
    )

    attempt(
        f"{OUTPUT_BASE}/tree.txt",
        "text",
        "Hierarchical file tree",
        lambda: generate_tree(report)
    )

    generated_files.append({
        "path": "doc_snapshot.json",
        "type": "json",
        "description": "Documentation generation metadata"
    })

    health = compute_documentation_health(generated_files, errors)
    attempt(
        f"{OUTPUT_BASE}/documentation-health.md",
        "markdown",
        "Documentation health report",
        lambda: generate_health_report(health.get("missing_sections", []), health.get("template_followed", False))
    )

    snapshot = write_snapshot(
        report,
        project_id=project_id,
        commit_hash=commit_hash,
        generated_at=generated_at,
        docs_bucket_path=docs_bucket_path,
        generated_files=generated_files,
        errors=errors
    )
    write_file(f"{OUTPUT_BASE}/doc_snapshot.json", snapshot)
    return generated_files, errors


def main():
    _load_env_files()
    project_id = os.getenv("PROJECT_ID")
    commit_hash = os.getenv("COMMIT_HASH")

    if not project_id:
        raise RuntimeError("Missing required env var: PROJECT_ID")
    if not commit_hash:
        raise RuntimeError("Missing required env var: COMMIT_HASH")

    ensure_directories()
    report = get_impact_report()
    bucket = os.environ["R2_BUCKET_NAME"]
    prefix = f"{project_id}/{commit_hash}/docs"
    docs_bucket_path = f"{project_id}/{commit_hash}/docs/"
    generated_at = _derive_generated_at(report)

    generate_all_docs(report, project_id, commit_hash, generated_at, docs_bucket_path)

    skip_upload = os.getenv("SKIP_R2_UPLOAD", "false").lower() == "true"
    if skip_upload:
        print("⏭️ SKIP_R2_UPLOAD=true; skipping R2 upload")
    else:
        print("☁️ Uploading docs to R2...")
        upload_docs_to_r2(
            local_dir="sprint1/artifacts/docs",
            bucket=bucket,
            prefix=prefix
        )

    print("✅ EPIC-2 completed")


if __name__ == "__main__":
    main()
