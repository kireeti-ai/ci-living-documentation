#!/usr/bin/env python3
"""
Documentation Snapshot Writer
Creates JSON metadata about generated documentation
Outputs schema compliant with EPIC-2 requirements for downstream integration.
"""
import json
import hashlib
from typing import Dict, List, Any, Optional


def _generate_snapshot_id(project_id: str, commit: str) -> str:
    """Generate deterministic snapshot ID based on project_id and commit."""
    base = f"{project_id}:{commit}"
    return hashlib.sha256(base.encode("utf-8")).hexdigest()[:16]


def _compute_documentation_health(
    generated_files: List[Dict],
    errors: List[Dict],
    expected_files: Optional[List[str]] = None
) -> Dict[str, Any]:
    if expected_files is None:
        expected_files = [
            "README.generated.md",
            "api/api-reference.md",
            "adr/ADR-001.md",
            "architecture/system.mmd",
            "architecture/sequence.mmd",
            "architecture/er.mmd",
            "tree.txt",
            "doc_snapshot.json"
        ]

    generated_paths = {f.get("file") or f.get("path", "") for f in generated_files}
    missing_sections = [f for f in expected_files if f not in generated_paths]
    template_followed = len(errors) == 0 and len(missing_sections) == 0

    return {
        "missing_sections": missing_sections,
        "template_followed": template_followed
    }


def compute_documentation_health(
    generated_files: List[Dict],
    errors: List[Dict]
) -> Dict[str, Any]:
    normalized = _normalize_generated_files(generated_files)
    return _compute_documentation_health(normalized, errors)


def _normalize_generated_files(generated_files: List[Dict]) -> List[Dict]:
    normalized = []
    for f in generated_files:
        normalized.append({
            "file": f.get("file") or f.get("path", "unknown"),
            "type": f.get("type", "unknown"),
            "description": f.get("description", "")
        })
    return normalized


def write_snapshot(
    report: Dict[str, Any],
    project_id: str,
    commit_hash: str,
    generated_at: str,
    docs_bucket_path: str,
    generated_files: List[Dict],
    errors: Optional[List[Dict]] = None
) -> str:
    errors = errors or []

    if "repo" in report:
        repo_info = report.get("repo", {})
        repo_name = repo_info.get("name", "unknown")
        branch = repo_info.get("branch", "main")
        commit = repo_info.get("commit", "unknown")
        author = report.get("intent_context", {}).get("author", "unknown")
        severity = report.get("severity", "UNKNOWN")
        files = report.get("files", [])
    else:
        context = report.get("context", {})
        repo_name = context.get("repository", "unknown")
        branch = context.get("branch", "main")
        commit = context.get("commit_sha", "unknown")
        author = context.get("author", "unknown")
        analysis = report.get("analysis_summary", {})
        severity = analysis.get("highest_severity", "UNKNOWN")
        files = report.get("changes", [])

    normalized_files = _normalize_generated_files(generated_files)
    doc_health = _compute_documentation_health(normalized_files, errors)

    snapshot = {
        "snapshot_id": _generate_snapshot_id(project_id, commit_hash),
        "project_id": project_id,
        "commit": commit_hash,
        "generated_at": generated_at,
        "docs_bucket_path": docs_bucket_path,
        "generated_files": normalized_files,
        "documentation_health": doc_health,
        "author": author,
        "analysis": {
            "severity": severity,
            "breaking_changes": report.get("analysis_summary", {}).get("breaking_changes_detected", False),
            "files_changed": len(files)
        },
        "errors": errors,
        "statistics": {
            "total_files": len(files),
            "total_documents": len(normalized_files),
            "diagram_count": len([f for f in normalized_files if f.get("type") == "mermaid"])
        }
    }

    snapshot["repo"] = {
        "name": repo_name,
        "branch": branch,
        "commit": commit
    }
    snapshot["changed_files"] = [
        {
            "path": f.get("file", f.get("path", "unknown")) if isinstance(f, dict) else str(f),
            "language": f.get("language") if isinstance(f, dict) else None,
            "severity": f.get("severity", "UNKNOWN") if isinstance(f, dict) else "UNKNOWN"
        }
        for f in files
    ]

    return json.dumps(snapshot, indent=2, ensure_ascii=False)
