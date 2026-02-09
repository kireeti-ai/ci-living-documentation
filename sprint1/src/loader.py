import json
import os

REQUIRED_CONTEXT_FIELDS = ["repository", "commit_sha", "branch"]


def _normalize_report(report):
    warnings = []
    if not isinstance(report, dict):
        raise ValueError("impact_report.json must be a JSON object")

    context = report.get("context", {})
    if not isinstance(context, dict):
        warnings.append("context missing or invalid; using defaults")
        context = {}

    for field in REQUIRED_CONTEXT_FIELDS:
        if field not in context:
            warnings.append(f"missing context.{field}; using default")
    context.setdefault("repository", "unknown")
    context.setdefault("commit_sha", "unknown")
    context.setdefault("branch", "main")
    context.setdefault("author", "unknown")

    changes = report.get("changes", [])
    if not isinstance(changes, list):
        warnings.append("changes missing or invalid; using empty list")
        changes = []

    analysis = report.get("analysis_summary", {})
    if not isinstance(analysis, dict):
        warnings.append("analysis_summary missing or invalid; using defaults")
        analysis = {}

    report["context"] = context
    report["changes"] = changes
    report["analysis_summary"] = analysis
    return report, warnings


def load_impact_report(path=None):
    base_dir = os.path.dirname(os.path.dirname(__file__))
    default_path = os.path.join(base_dir, "input", "impact_report.json")
    path = path or default_path

    with open(path, "r", encoding="utf-8") as f:
        report = json.load(f)

    return _normalize_report(report)
