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

PROJECT_ID = os.getenv("PROJECT_ID")
COMMIT_HASH = os.getenv("COMMIT_HASH")


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
    for w in warnings:
        print(f"⚠️ {w}")
    return report


def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Generated {path}")


def _derive_generated_at(report):
    deterministic = os.getenv("DETERMINISTIC_DOCS", "true").lower() == "true"
    if deterministic:
        return report.get("context", {}).get("commit_timestamp", "1970-01-01T00:00:00Z")
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def generate_all_docs(report, project_id, commit_hash, generated_at, docs_bucket_path):
    generated_files = []
    errors = []
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    rag_context = build_rag_context(repo_root)

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

    attempt(
        f"{OUTPUT_BASE}/README.generated.md",
        "markdown",
        "Auto-generated repository README",
        lambda: generate_readme(report, generated_at, rag_context=rag_context)
    )
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
        f"{OUTPUT_BASE}/adr/ADR-001.md",
        "markdown",
        "Architecture Decision Record",
        lambda: generate_adr(report, generated_at, rag_context=rag_context)
    )
    attempt(
        f"{OUTPUT_BASE}/architecture/system.mmd",
        "mermaid",
        "System architecture diagram",
        lambda: system_diagram()
    )
    attempt(
        f"{OUTPUT_BASE}/architecture/sequence.mmd",
        "mermaid",
        "Process sequence diagram",
        lambda: sequence_diagram()
    )
    attempt(
        f"{OUTPUT_BASE}/architecture/er.mmd",
        "mermaid",
        "Entity-relationship diagram",
        lambda: er_diagram()
    )
    attempt(
        f"{OUTPUT_BASE}/tree.txt",
        "text",
        "Hierarchical file tree",
        lambda: generate_tree(report)
    )
    attempt(
        f"{OUTPUT_BASE}/architecture/architecture.md",
        "markdown",
        "Architecture documentation text",
        lambda: generate_architecture_doc(report)
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
    if not PROJECT_ID:
        raise RuntimeError("Missing required env var: PROJECT_ID")
    if not COMMIT_HASH:
        raise RuntimeError("Missing required env var: COMMIT_HASH")

    ensure_directories()
    report = get_impact_report()
    bucket = os.environ["R2_BUCKET_NAME"]
    prefix = f"{PROJECT_ID}/{COMMIT_HASH}/docs"
    docs_bucket_path = f"{PROJECT_ID}/{COMMIT_HASH}/docs/"
    generated_at = _derive_generated_at(report)

    generate_all_docs(report, PROJECT_ID, COMMIT_HASH, generated_at, docs_bucket_path)

    print("☁️ Uploading docs to R2...")
    upload_docs_to_r2(
        local_dir="sprint1/artifacts/docs",
        bucket=bucket,
        prefix=prefix
    )

    print("✅ EPIC-2 completed")


if __name__ == "__main__":
    main()
