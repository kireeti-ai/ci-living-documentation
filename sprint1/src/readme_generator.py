#!/usr/bin/env python3
"""
README Generator
Creates comprehensive auto-generated README documentation
"""
from typing import Dict, Any, List
from sprint1.src.narrative_generator import generate_readme_narrative, generate_impact_narrative


def _first_non_empty(report, paths):
    for path in paths:
        current = report
        ok = True
        for key in path:
            if not isinstance(current, dict) or key not in current:
                ok = False
                break
            current = current[key]
        if not ok:
            continue
        if isinstance(current, str) and current.strip():
            return current.strip()
        if isinstance(current, list) and current:
            return "\n".join(f"- {str(item)}" for item in current if str(item).strip())
    return None


def _section_text(report, paths):
    value = _first_non_empty(report, paths)
    return value or "Not detected in the impact report."


def _infer_section_defaults(report):
    changes = report.get("changes", []) or []
    affected_packages = report.get("affected_packages", []) or []
    change_summary = str(report.get("change_summary", "")).strip()
    files = [str(c.get("file", "")).strip() for c in changes if isinstance(c, dict)]
    files_lower = [f.lower() for f in files]
    packages_lower = {str(p).strip().lower() for p in affected_packages if str(p).strip()}

    has_frontend = any(f.startswith("frontend/") or "/src/pages/" in f or "/src/components/" in f for f in files_lower)
    has_backend = any(f.startswith("backend/") or "/src/modules/" in f or "/src/routes/" in f for f in files_lower)
    has_node = "package.json" in files_lower or any("node" in p or "react" in p or "express" in p for p in packages_lower)
    has_java = "backend/pom.xml" in files_lower or any(p.startswith("com.") for p in packages_lower)
    has_docker = any("dockerfile" in f or "docker-compose" in f for f in files_lower)
    has_env = any(".env" in f for f in files_lower)
    has_ci = any(".github/workflows/" in f for f in files_lower)
    has_tests = any("/test" in f or "/tests/" in f for f in files_lower)
    has_license = any(f == "license" or f.endswith("/license") for f in files_lower)

    inferred = {}

    install_lines = []
    if has_node:
        install_lines.append("Install Node.js dependencies with `npm install` in each app directory that contains `package.json`.")
    if has_java:
        install_lines.append("If the backend includes Maven modules, install/build with `mvn clean install`.")
    if has_docker:
        install_lines.append("Containerized setup is available via Docker (`docker compose up --build`).")
    if install_lines:
        inferred["installation"] = "\n".join(f"- {line}" for line in install_lines)

    usage_lines = []
    if has_backend:
        usage_lines.append("Run the backend service and confirm API health/check endpoints before integration testing.")
    if has_frontend:
        usage_lines.append("Run the frontend dev server (typically `npm run dev`) and validate UI flows against backend APIs.")
    if has_docker:
        usage_lines.append("For parity environments, use Docker Compose to start all services together.")
    if usage_lines:
        inferred["usage"] = "\n".join(f"- {line}" for line in usage_lines)

    feature_lines = []
    module_markers = {
        "auth": "Authentication and authorization",
        "project": "Project management",
        "task": "Task management",
        "user": "User management",
        "comment": "Comments and collaboration",
        "label": "Labels and categorization",
        "activity": "Activity tracking/audit trail",
    }
    changed_text = " ".join(files_lower)
    for marker, label in module_markers.items():
        if marker in changed_text:
            feature_lines.append(label)
    if not feature_lines and change_summary:
        feature_lines.append(change_summary)
    if feature_lines:
        inferred["features"] = "\n".join(f"- {line}" for line in feature_lines)

    stack = set()
    if has_node:
        stack.update(["Node.js", "JavaScript"])
    if "react" in packages_lower or any("/src/app.jsx" in f or "/src/main.jsx" in f for f in files_lower):
        stack.add("React")
    if "express" in packages_lower:
        stack.add("Express")
    if "mongoose" in packages_lower:
        stack.add("MongoDB/Mongoose")
    if has_java:
        stack.update(["Java", "Maven"])
    if has_docker:
        stack.add("Docker")
    if has_ci:
        stack.add("GitHub Actions")
    if stack:
        inferred["tech_stack"] = "\n".join(f"- {item}" for item in sorted(stack))

    config_lines = []
    if has_env:
        config_lines.append("Environment-variable configuration is present (`.env*` files).")
    if has_backend and has_frontend:
        config_lines.append("Configure frontend API base URLs and backend service/database credentials for each environment.")
    if has_ci:
        config_lines.append("CI configuration is present under `.github/workflows/`.")
    if config_lines:
        inferred["configuration"] = "\n".join(f"- {line}" for line in config_lines)

    troubleshooting_lines = []
    if has_tests:
        troubleshooting_lines.append("Run unit/integration tests first to isolate regressions.")
    if has_backend and has_frontend:
        troubleshooting_lines.append("Check API contract compatibility between backend routes and frontend service calls.")
    if has_docker:
        troubleshooting_lines.append("If services fail in containers, inspect compose logs and verify required env vars.")
    if troubleshooting_lines:
        inferred["troubleshooting"] = "\n".join(f"- {line}" for line in troubleshooting_lines)

    if has_ci or has_tests:
        inferred["contributing"] = "- Follow repository linting/testing workflows before opening pull requests."
    if has_license:
        inferred["license"] = "- See the repository `LICENSE` file."

    return inferred


def _generate_badges(report, severity, breaking):
    """Generate markdown badges for the project."""
    badges = []
    
    # Severity Badge
    color = "green"
    if severity == "CRITICAL":
        color = "red"
    elif severity == "MAJOR":
        color = "orange"
    elif severity == "MINOR":
        color = "yellow"
    
    badges.append(f"![Severity](https://img.shields.io/badge/Severity-{severity}-{color})")
    
    # Breaking Change Badge
    if breaking:
        badges.append("![Breaking Changes](https://img.shields.io/badge/Breaking%20Changes-Yes-red)")
    else:
        badges.append("![Breaking Changes](https://img.shields.io/badge/Breaking%20Changes-No-green)")

    # Tech Stack Badges (Simple inference)
    defaults = _infer_section_defaults(report)
    stack_str = defaults.get("tech_stack", "")
    if "Node.js" in stack_str:
        badges.append("![Node.js](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)")
    if "React" in stack_str:
        badges.append("![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)")
    if "Python" in stack_str:
         badges.append("![Python](https://img.shields.io/badge/Python-3776AB?style=flat&logo=python&logoColor=white)")
    if "Docker" in stack_str:
        badges.append("![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)")

    return " ".join(badges)


def _generate_tree_structure(changes):
    """Generate a simplified file tree for the README."""
    if not changes:
        return ""
        
    tree_lines = ["```"]
    # Simple hierarchy just for show - robust tree done in tree_generator, 
    # but here we want a small snapshot of key dirs
    
    seen_dirs = set()
    files_to_show = []
    
    # Prioritize src/ content
    for c in changes:
        path = c.get("file", "")
        if not path: continue
        parts = path.split("/")
        if len(parts) > 1:
            top_dir = parts[0]
            if top_dir not in seen_dirs:
                seen_dirs.add(top_dir)
                tree_lines.append(f"├── {top_dir}/")
    
    tree_lines.append("```")
    return "\n".join(tree_lines)



def _synthesize_report_context(report: Dict[str, Any]) -> str:
    """
    Synthesize a structured textual context from the impact report for the LLM.
    Extracts high-level concepts instead of raw file paths.
    """
    api_contract = report.get("api_contract", {})
    endpoints = api_contract.get("endpoints", [])
    
    # Extract unique resources from endpoints (e.g., /users/{id} -> Users)
    resources = set()
    for ep in endpoints:
        path = ep.get("path", "")
        parts = path.strip("/").split("/")
        if parts:
            resource = parts[0].capitalize()
            # Ignore variables like {id}
            if not resource.startswith("{"):
                resources.add(resource)
    
    # Extract modules from file paths
    changes = report.get("changes", [])
    files = [c.get("file", "") for c in changes]
    modules = set()
    for f in files:
        if "backend/src/modules/" in f:
            # Extract module name: backend/src/modules/auth/... -> Auth
            try:
                part = f.split("backend/src/modules/")[1].split("/")[0]
                modules.add(part.capitalize())
            except IndexError:
                pass
        elif "frontend/src/pages/" in f:
            try:
                part = f.split("frontend/src/pages/")[1].split("Page")[0]
                modules.add(part.capitalize())
            except IndexError:
                pass

    # Infer tech stack basics for context
    defaults = _infer_section_defaults(report)
    stack = defaults.get("tech_stack", "Unknown Stack").replace("\n- ", ", ").strip("- ")

    # Construct the synthesis
    context_lines = []
    if resources:
        context_lines.append(f"Key API Resources: {', '.join(sorted(resources))}")
    if modules:
        context_lines.append(f"Active Modules: {', '.join(sorted(modules))}")
    if stack:
        context_lines.append(f"Technological Stack: {stack}")
    
    summary = report.get("change_summary")
    if summary:
        context_lines.append(f"Change Summary from Report: {summary}")

    return "\n".join(context_lines)



def generate_readme(report, generated_at=None, rag_context=None):
    """
    Generate README from impact report
    
    Args:
        report (dict): Impact report from EPIC-1
    
    Returns:
        str: Formatted README content
    """
    context = report.get("context", {})
    analysis = report.get("analysis_summary", {})
    changes = report.get("changes", [])
    
    repository = context.get("repository", "Unknown Repository")
    branch = context.get("branch", "main")
    commit = context.get("commit_sha", "unknown")
    author = context.get("author", "Unknown")
    severity = analysis.get("highest_severity", "UNKNOWN")
    breaking = analysis.get("breaking_changes_detected", False)
    
    # Count changes by language, handling None values
    languages = {}
    for change in changes:
        lang = change.get("language")
        # Normalize None/null to "other"
        lang_key = lang if lang else "other"
        languages[lang_key] = languages.get(lang_key, 0) + 1
    
    rag_context = rag_context or {}
    
    # Synthesize a better context for the LLM if RAG is empty or minimal
    synthesized_context = _synthesize_report_context(report)
    
    # We pass the synthesized text as a special key in rag_context if not present
    if not rag_context:
        rag_context = {"synthetic_report_summary.txt": synthesized_context}

    overview = generate_readme_narrative(report, rag_context)
    impact_summary = generate_impact_narrative(report)
    badges = _generate_badges(report, severity, breaking)
    
    generated_at_str = generated_at or "unknown"
    
    # Infer defaults for missing sections
    inferred = _infer_section_defaults(report)

    # Helper to get section text or default
    def get_section(keys, default_key):
        val = _section_text(report, keys)
        if val == "Not detected in the impact report.":
            return inferred.get(default_key, val)
        return val

    installation = get_section([("installation",), ("metadata", "installation"), ("project_info", "installation")], "installation")
    usage = get_section([("usage",), ("metadata", "usage")], "usage")
    features = get_section([("features",), ("metadata", "features")], "features")
    tech_stack = get_section([("tech_stack",), ("techStack",), ("metadata", "tech_stack")], "tech_stack")
    configuration = get_section([("configuration",), ("config",)], "configuration")
    troubleshooting = get_section([("troubleshooting",)], "troubleshooting")
    contributing = get_section([("contributing",)], "contributing")
    license_text = get_section([("license",)], "license")

    # Generate tree structure
    file_tree = _generate_tree_structure(changes)
    
    # Generate system diagram for embedding
    # We import here to avoid circular dependencies if any, though ideally at top
    from sprint1.src.diagram_generator import system_diagram
    sys_diag = system_diagram(report)
    
    # Prepare variables for new README structure
    stack_details = tech_stack 
    stack_badges = _generate_badges(report, severity, breaking)
    
    language_bar_lines = []
    if languages:
        for lang, count in sorted(languages.items(), key=lambda x: (x[0] == "other", x[0])):
            display_name = lang.capitalize() if lang != "other" else "Other/Unknown"
            language_bar_lines.append(f"- **{display_name}**: {count} file(s)")
    language_bar = "\n".join(language_bar_lines)

    file_list_str_lines = []
    if changes:
        for i, change in enumerate(changes, 1):
            file_path = change.get("file", "unknown")
            file_list_str_lines.append(f"{i}. `{file_path}`")
    file_list_str = "\n".join(file_list_str_lines)

    impact_section = f"""
**Severity Level:** `{severity}`
**Breaking Changes:** {'Yes' if breaking else 'No'}

{impact_summary}

### Repository Details

| Attribute | Value |
|-----------|-------|
| **Repository** | `{repository}` |
| **Branch** | `{branch}` |
| **Commit** | `{commit}` |
| **Author** | `{author}` |
"""

    readme = f"""# {repository}

{badges}

## 📋 Table of Contents

- [Executive Summary](#executive-summary)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Installation & Setup](#installation)
- [API Reference](#api-reference)
- [Repository Structure](#repository-structure)

---

## <a name="executive-summary"></a>Executive Summary

{overview}

---

## <a name="key-features"></a>Key Features

Based on the analyzed codebase, the system implements the following core capabilities:

{features}

---

## <a name="system-architecture"></a>System Architecture

The following diagram illustrates the high-level system components and their interactions:

```mermaid
{sys_diag}
```

For more details, see the [Full Architecture Documentation](architecture/architecture.md).

---

## <a name="tech-stack"></a>Tech Stack

**Detailed Analysis**:
{stack_details}

### Technologies Detected
{stack_badges}

### Languages
{language_bar}

---

## <a name="repository-structure"></a>Repository Structure

### Recent Changes Tree
```text
{file_tree}
```

<details>
<summary>📂 Click to view full list of changed files</summary>

{file_list_str}

</details>

---

## <a name="installation"></a>Installation & Setup

### Prerequisites

Ensure you have the following installed:
- {', '.join([k for k in ['Node.js', 'Python', 'Docker', 'Java'] if k.lower() in str(report).lower()]) or 'Standard runtime environment'}

### Quick Start

```bash
# Clone the repository
git clone {report.get('context', {}).get('repository_url', '...')}

# Install dependencies
npm install  # or pip install -r requirements.txt

# Run development server
npm run dev
```

### Configuration
{configuration}

### Troubleshooting
{troubleshooting}

---

## <a name="api-reference"></a>API Reference

The projects exposes several API endpoints. 
See the [API Reference](api/api-reference.md) for full documentation.

**Key Endpoints Detected:**
- (See API Docs for auto-generated list)

---

## <a name="impact-analysis"></a>Impact Analysis [Internal]

**Generated:** {generated_at_str}

{impact_section}

> **Note**: This README is automatically maintained by the living documentation system. 
> Manual edits may be overwritten.
## License
{license_text}
"""
    return readme

