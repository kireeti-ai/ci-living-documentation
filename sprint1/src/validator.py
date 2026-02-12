#!/usr/bin/env python3
"""
EPIC-2 Documentation Generation Service Validator
Validates the service against all requirements from the EPIC-2 specification.
"""

import json
import os
import re
from typing import Dict, List, Tuple, Any

# Required fields for input validation
REQUIRED_REPO_FIELDS = ["name", "branch", "commit"]
REQUIRED_INPUT_FIELDS = ["repo", "files", "severity", "intent_context"]

# Required documentation artifacts
REQUIRED_ARTIFACTS = [
    "README.generated.md",
    "api/api-reference.md",
    "adr/ADR-001.md",
    "architecture/system.mmd",
    "architecture/sequence.mmd",
    "architecture/er.mmd",
    "tree.txt",
    "doc_snapshot.json"
]

# ADR required sections
ADR_REQUIRED_SECTIONS = ["Status", "Date", "Context", "Decision", "Consequences"]

# README required sections
README_REQUIRED_HEADINGS = [
    "Executive Summary",
    "Key Features",
    "System Architecture",
    "Tech Stack",
    "Repository Structure",
    "Installation & Setup",
    "API Reference",
    "Impact Analysis [Internal]"
]

# doc_snapshot.json required schema fields
SNAPSHOT_REQUIRED_FIELDS = [
    "snapshot_id",
    "project_id",
    "commit",
    "generated_at",
    "docs_bucket_path",
    "generated_files",
    "documentation_health"
]

SNAPSHOT_REPO_FIELDS = ["name", "branch", "commit"]
SNAPSHOT_FILE_ENTRY_FIELDS = ["file", "type"]
SNAPSHOT_HEALTH_FIELDS = ["missing_sections", "template_followed"]


def validate_impact_report_input(report: dict) -> Tuple[bool, List[str], List[str]]:
    """
    Validate impact report input against EPIC-2 requirements.
    Returns: (is_valid, errors, warnings)
    """
    errors = []
    warnings = []
    
    if not isinstance(report, dict):
        return False, ["Impact report must be a JSON object"], []

    # Normalize envelope formats before schema validation.
    # Supports payloads like:
    # {"report": {"report": {...}}} or {"report": {...}}
    if isinstance(report.get("report"), dict):
        nested = report["report"]
        if isinstance(nested.get("report"), dict):
            report = nested["report"]
        else:
            report = nested
    
    # Check for required fields (support both old and new schema)
    # New schema: repo, files, severity, intent_context
    # Old schema: context, changes, analysis_summary
    
    # Check for repo field (new) or context field (old)
    has_new_schema = "repo" in report
    has_old_schema = "context" in report
    
    if has_new_schema:
        repo = report.get("repo", {})
        if not isinstance(repo, dict):
            errors.append("repo field must be a JSON object")
        else:
            for field in REQUIRED_REPO_FIELDS:
                if field not in repo or not repo.get(field):
                    errors.append(f"Missing required repo.{field}")
        
        if "files" not in report:
            warnings.append("files field missing, will use empty list")
        
        if "severity" not in report:
            warnings.append("severity field missing, will use UNKNOWN")
            
        if "intent_context" not in report:
            warnings.append("intent_context field missing, will use empty object")
            
    elif has_old_schema:
        # Support legacy schema with context, changes, analysis_summary
        context = report.get("context", {})
        if not isinstance(context, dict):
            errors.append("context field must be a JSON object")
        else:
            legacy_required = {"repository": "name", "commit_sha": "commit", "branch": "branch"}
            for old_field, new_field in legacy_required.items():
                if old_field not in context or not context.get(old_field):
                    errors.append(f"Missing required context.{old_field} (maps to repo.{new_field})")
                    
        warnings.append("Using legacy schema format (context/changes/analysis_summary)")
    else:
        errors.append("Missing required field: repo (or legacy context)")
    
    is_valid = len(errors) == 0
    return is_valid, errors, warnings


def validate_mermaid_syntax(content: str, diagram_type: str) -> Tuple[bool, List[str]]:
    """
    Validate Mermaid diagram syntax.
    Returns: (is_valid, errors)
    """
    errors = []
    content = content.strip()
    
    # Check diagram type declarations
    valid_starts = {
        "system": ["graph ", "flowchart "],
        "sequence": ["sequenceDiagram"],
        "er": ["erDiagram"]
    }
    
    expected_starts = valid_starts.get(diagram_type, [])
    if expected_starts:
        if not any(content.startswith(start) for start in expected_starts):
            errors.append(f"{diagram_type} diagram should start with one of: {expected_starts}")
    
    # For ER diagrams, remove relationship syntax before brace counting
    # ER diagrams use ||--o{ and similar patterns that aren't code braces
    content_for_brace_check = content
    if diagram_type == "er":
        # Remove ER relationship patterns like ||--o{ or }o--|| etc.
        import re
        # Remove ER relationship patterns recursively or in sequence
        # We need to remove all common relationship markers that contain braces
        # Patterns: ||--|{, ||--o{, }|--||, }o--||, }o--o{, }|--|{ 
        # Also simple ones like --|{, --o{
        
        # Using a loop to clear all relationships is safer than listing every permutation
        content_for_brace_check = re.sub(r'\|\|--\|\{', '', content_for_brace_check)
        content_for_brace_check = re.sub(r'\|\|--o\{', '', content_for_brace_check)
        content_for_brace_check = re.sub(r'\}\|--\|\|', '', content_for_brace_check)
        content_for_brace_check = re.sub(r'\}o--\|\|', '', content_for_brace_check)
        content_for_brace_check = re.sub(r'\}\|--\|\{', '', content_for_brace_check)
        content_for_brace_check = re.sub(r'\}o--o\{', '', content_for_brace_check)
        
        # Legacy ones from previous code
        content_for_brace_check = re.sub(r'\|\|--\|\|', '', content_for_brace_check)
        content_for_brace_check = re.sub(r'\|o--o\|', '', content_for_brace_check)
    
    # Basic syntax checks
    if content_for_brace_check.count("[") != content_for_brace_check.count("]"):
        errors.append("Unbalanced square brackets in Mermaid syntax")
    
    if content_for_brace_check.count("{") != content_for_brace_check.count("}"):
        errors.append("Unbalanced curly braces in Mermaid syntax")
    
    if content_for_brace_check.count("(") != content_for_brace_check.count(")"):
        errors.append("Unbalanced parentheses in Mermaid syntax")
    
    return len(errors) == 0, errors


def validate_adr_document(content: str) -> Tuple[bool, List[str], List[str]]:
    """
    Validate ADR document structure.
    Returns: (is_valid, errors, missing_sections)
    """
    errors = []
    missing_sections = []
    
    for section in ADR_REQUIRED_SECTIONS:
        # Check for section heading (## Status, ## Date, etc.)
        pattern = rf"##\s+{section}"
        if not re.search(pattern, content, re.IGNORECASE):
            missing_sections.append(section)
    
    if missing_sections:
        errors.append(f"ADR missing required sections: {missing_sections}")
    
    return len(errors) == 0, errors, missing_sections


def validate_readme_document(content: str) -> Tuple[bool, List[str], List[str]]:
    """
    Validate README document structure.
    Returns: (is_valid, errors, missing_sections)
    """
    errors = []
    missing_sections = []
    
    for heading in README_REQUIRED_HEADINGS:
        if heading.lower() not in content.lower():
            missing_sections.append(heading)
    
    if missing_sections:
        errors.append(f"README missing required sections: {missing_sections}")
    
    return len(errors) == 0, errors, missing_sections


def validate_doc_snapshot_schema(snapshot: dict) -> Tuple[bool, List[str]]:
    """
    Validate doc_snapshot.json against required schema.
    Returns: (is_valid, errors)
    """
    errors = []
    
    # Check required top-level fields
    for field in SNAPSHOT_REQUIRED_FIELDS:
        if field not in snapshot:
            errors.append(f"doc_snapshot.json missing required field: {field}")
    
    # Validate project_id and commit are non-empty strings
    if not isinstance(snapshot.get("project_id"), str) or not snapshot.get("project_id", "").strip():
        errors.append("doc_snapshot.json field project_id must be a non-empty string")
    if not isinstance(snapshot.get("commit"), str) or not snapshot.get("commit", "").strip():
        errors.append("doc_snapshot.json field commit must be a non-empty string")
    
    # Validate generated_files array
    gen_files = snapshot.get("generated_files", [])
    if not isinstance(gen_files, list):
        errors.append("generated_files must be an array")
    else:
        for i, entry in enumerate(gen_files):
            if not isinstance(entry, dict):
                errors.append(f"generated_files[{i}] must be an object")
            else:
                # Check for file and type fields (or path and type for legacy)
                has_file = "file" in entry or "path" in entry
                has_type = "type" in entry
                if not has_file:
                    errors.append(f"generated_files[{i}] missing 'file' field")
                if not has_type:
                    errors.append(f"generated_files[{i}] missing 'type' field")
    
    # Validate documentation_health
    health = snapshot.get("documentation_health", {})
    if isinstance(health, dict):
        for field in SNAPSHOT_HEALTH_FIELDS:
            if field not in health:
                errors.append(f"documentation_health missing required field: {field}")
    else:
        errors.append("documentation_health must be an object")
    
    # Validate docs_bucket_path format: <project_id>/<commit_hash>/docs/
    bucket_path = snapshot.get("docs_bucket_path", "")
    expected = ""
    if isinstance(snapshot.get("project_id"), str) and isinstance(snapshot.get("commit"), str):
        expected = f"{snapshot.get('project_id')}/{snapshot.get('commit')}/docs/"
    if not isinstance(bucket_path, str) or not bucket_path:
        errors.append("docs_bucket_path must be a non-empty string")
    elif expected and bucket_path != expected:
        errors.append(f"docs_bucket_path must equal {expected}")
    
    return len(errors) == 0, errors


def validate_generated_artifacts(output_dir: str) -> Tuple[bool, List[str], List[str]]:
    """
    Validate all required documentation artifacts exist.
    Returns: (is_valid, errors, missing_artifacts)
    """
    errors = []
    missing_artifacts = []
    
    for artifact in REQUIRED_ARTIFACTS:
        artifact_path = os.path.join(output_dir, artifact)
        if not os.path.exists(artifact_path):
            missing_artifacts.append(artifact)
    
    if missing_artifacts:
        errors.append(f"Missing required artifacts: {missing_artifacts}")
    
    return len(errors) == 0, errors, missing_artifacts


def validate_no_credential_leaks(output_dir: str) -> Tuple[bool, List[str]]:
    """
    Verify no credentials or secrets are written to artifacts.
    Returns: (is_valid, errors)
    """
    errors = []
    
    # Patterns that indicate potential credential leaks
    credential_patterns = [
        r"R2_SECRET_ACCESS_KEY\s*=",
        r"R2_ACCESS_KEY_ID\s*=",
        r"aws_secret_access_key\s*=",
        r"aws_access_key_id\s*=",
        r"-----BEGIN.*PRIVATE KEY-----",
        r"token\s*[=:]\s*['\"]?[A-Za-z0-9_-]{20,}",
        r"password\s*[=:]\s*['\"]?[^\s]{8,}",
    ]
    
    for root, _, files in os.walk(output_dir):
        for file in files:
            file_path = os.path.join(root, file)
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    for pattern in credential_patterns:
                        matches = re.findall(pattern, content, re.IGNORECASE)
                        if matches:
                            rel_path = os.path.relpath(file_path, output_dir)
                            errors.append(f"Potential credential leak in {rel_path}: pattern '{pattern}' matched")
            except Exception:
                pass
    
    return len(errors) == 0, errors


def run_full_validation(
    input_path: str,
    output_dir: str
) -> Dict[str, Any]:
    """
    Run complete validation of EPIC-2 service.
    Returns comprehensive validation report.
    """
    report = {
        "status": "pending",
        "input_validation": {},
        "artifact_validation": {},
        "schema_validation": {},
        "template_validation": {},
        "security_validation": {},
        "overall_errors": [],
        "overall_warnings": []
    }
    
    # 1. Input Validation
    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            impact_report = json.load(f)
        
        is_valid, errors, warnings = validate_impact_report_input(impact_report)
        report["input_validation"] = {
            "valid": is_valid,
            "errors": errors,
            "warnings": warnings
        }
        if errors:
            report["overall_errors"].extend(errors)
        if warnings:
            report["overall_warnings"].extend(warnings)
    except json.JSONDecodeError as e:
        report["input_validation"] = {
            "valid": False,
            "errors": [f"Invalid JSON: {str(e)}"],
            "warnings": []
        }
        report["overall_errors"].append(f"Input JSON parse error: {str(e)}")
    except FileNotFoundError:
        report["input_validation"] = {
            "valid": False,
            "errors": ["Input file not found"],
            "warnings": []
        }
        report["overall_errors"].append("Impact report not found")
    
    # 2. Artifact Validation
    is_valid, errors, missing = validate_generated_artifacts(output_dir)
    report["artifact_validation"] = {
        "valid": is_valid,
        "errors": errors,
        "missing_artifacts": missing
    }
    if errors:
        report["overall_errors"].extend(errors)
    
    # 3. Schema Validation (doc_snapshot.json)
    snapshot_path = os.path.join(output_dir, "doc_snapshot.json")
    if os.path.exists(snapshot_path):
        try:
            with open(snapshot_path, 'r', encoding='utf-8') as f:
                snapshot = json.load(f)
            is_valid, errors = validate_doc_snapshot_schema(snapshot)
            report["schema_validation"] = {
                "valid": is_valid,
                "errors": errors
            }
            if errors:
                report["overall_errors"].extend(errors)
        except json.JSONDecodeError as e:
            report["schema_validation"] = {
                "valid": False,
                "errors": [f"Invalid JSON in doc_snapshot.json: {str(e)}"]
            }
            report["overall_errors"].append(f"doc_snapshot.json parse error: {str(e)}")
    else:
        report["schema_validation"] = {
            "valid": False,
            "errors": ["doc_snapshot.json not found"]
        }
    
    # 4. Template Validation (README, ADR, Mermaid diagrams)
    template_issues = []
    missing_sections = []
    
    readme_path = os.path.join(output_dir, "README.generated.md")
    if os.path.exists(readme_path):
        with open(readme_path, 'r', encoding='utf-8') as f:
            readme_content = f.read()
        is_valid, errors, sections = validate_readme_document(readme_content)
        if not is_valid:
            template_issues.extend(errors)
            missing_sections.extend(sections)
    
    adr_path = os.path.join(output_dir, "adr/ADR-001.md")
    if os.path.exists(adr_path):
        with open(adr_path, 'r', encoding='utf-8') as f:
            adr_content = f.read()
        is_valid, errors, sections = validate_adr_document(adr_content)
        if not is_valid:
            template_issues.extend(errors)
            missing_sections.extend(sections)
    
    # Validate Mermaid diagrams
    diagrams = {
        "architecture/system.mmd": "system",
        "architecture/sequence.mmd": "sequence",
        "architecture/er.mmd": "er"
    }
    for diagram_file, diagram_type in diagrams.items():
        diagram_path = os.path.join(output_dir, diagram_file)
        if os.path.exists(diagram_path):
            with open(diagram_path, 'r', encoding='utf-8') as f:
                content = f.read()
            is_valid, errors = validate_mermaid_syntax(content, diagram_type)
            if not is_valid:
                template_issues.extend([f"{diagram_file}: {e}" for e in errors])
    
    report["template_validation"] = {
        "valid": len(template_issues) == 0,
        "errors": template_issues,
        "missing_sections": list(set(missing_sections))
    }
    if template_issues:
        report["overall_warnings"].extend(template_issues)
    
    # 5. Security Validation
    is_valid, errors = validate_no_credential_leaks(output_dir)
    report["security_validation"] = {
        "valid": is_valid,
        "errors": errors
    }
    if errors:
        report["overall_errors"].extend(errors)
    
    # Determine overall status
    if report["overall_errors"]:
        report["status"] = "failed"
    elif report["overall_warnings"]:
        report["status"] = "passed_with_warnings"
    else:
        report["status"] = "passed"
    
    return report


if __name__ == "__main__":
    import sys
    
    INPUT_PATH = "sprint1/input/impact_report.json"
    OUTPUT_DIR = "sprint1/artifacts/docs"
    
    print("=" * 60)
    print("EPIC-2 Documentation Generation Service Validator")
    print("=" * 60)
    
    report = run_full_validation(INPUT_PATH, OUTPUT_DIR)
    
    print(f"\n📊 Validation Status: {report['status'].upper()}")
    print("-" * 60)
    
    if report["overall_errors"]:
        print("\n❌ ERRORS:")
        for error in report["overall_errors"]:
            print(f"   • {error}")
    
    if report["overall_warnings"]:
        print("\n⚠️ WARNINGS:")
        for warning in report["overall_warnings"]:
            print(f"   • {warning}")
    
    print("\n📑 Detailed Report:")
    print(json.dumps(report, indent=2))
    
    sys.exit(0 if report["status"] != "failed" else 1)
