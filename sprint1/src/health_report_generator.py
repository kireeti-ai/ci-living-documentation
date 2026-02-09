#!/usr/bin/env python3
"""
Documentation health report generator.
"""
from typing import Dict, Any, List


def generate_health_report(missing_sections: List[str], template_followed: bool) -> str:
    status = "PASS" if template_followed else "FAIL"
    missing = "\n".join(f"- {s}" for s in missing_sections) if missing_sections else "- None"
    report = f"""# Documentation Health Report

## Status

{status}

## Template Compliance

Template followed: `{str(template_followed)}`.

## Missing Sections

{missing}

## Recommendations

- If status is FAIL, re-run generation after addressing missing sections.
- Ensure required templates are present and accessible for retrieval.
"""
    return report
