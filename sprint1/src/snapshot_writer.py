#!/usr/bin/env python3
"""
Documentation Snapshot Writer
Creates JSON metadata about generated documentation
"""
import json
from datetime import datetime

def write_snapshot(report):
    """
    Create a JSON snapshot of the documentation generation
    
    Args:
        report (dict): Impact report from EPIC-1
    
    Returns:
        str: JSON string containing snapshot metadata
    """
    context = report.get("context", {})
    analysis = report.get("analysis_summary", {})
    changes = report.get("changes", [])
    
    # Build comprehensive snapshot
    snapshot = {
        "metadata": {
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "generator": "EPIC-2 Documentation Pipeline",
            "version": "1.0.0"
        },
        "repository": {
            "name": context.get("repository", "unknown"),
            "branch": context.get("branch", "main"),
            "commit_sha": context.get("commit_sha", "unknown"),
            "author": context.get("author", "unknown")
        },
        "analysis": {
            "severity": analysis.get("highest_severity", "UNKNOWN"),
            "breaking_changes": analysis.get("breaking_changes_detected", False),
            "files_changed": len(changes)
        },
        "generated_files": [
            {
                "path": "README.generated.md",
                "type": "markdown",
                "description": "Auto-generated repository README"
            },
            {
                "path": "api/api-reference.md",
                "type": "markdown",
                "description": "API endpoint documentation"
            },
            {
                "path": "adr/ADR-001.md",
                "type": "markdown",
                "description": "Architecture Decision Record"
            },
            {
                "path": "architecture/system.mmd",
                "type": "mermaid",
                "description": "System architecture diagram"
            },
            {
                "path": "architecture/sequence.mmd",
                "type": "mermaid",
                "description": "Process sequence diagram"
            },
            {
                "path": "architecture/er.mmd",
                "type": "mermaid",
                "description": "Entity-relationship diagram"
            },
            {
                "path": "tree.txt",
                "type": "text",
                "description": "Hierarchical file tree"
            },
            {
                "path": "doc_snapshot.json",
                "type": "json",
                "description": "Documentation generation metadata"
            }
        ],
        "statistics": {
            "total_files": len(changes),
            "total_documents": 8,
            "diagram_count": 3
        },
        "changed_files": [
            {
                "path": change.get("file", "unknown"),
                "language": change.get("language", "unknown"),
                "severity": change.get("severity", "UNKNOWN")
            }
            for change in changes
        ]
    }
    
    return json.dumps(snapshot, indent=2, ensure_ascii=False)