import sys
import json
import os
import datetime
from typing import Optional, Union
import re
from src.git_manager import GitManager
from src.file_filter import FileFilter, ConfigLoader
from src.scorers import SeverityCalculator
from src.syntax_checker import SyntaxChecker
from src.parsers.java_parser import JavaParser
from src.parsers.ts_parser import TSParser
from src.parsers.schema_detector import SchemaDetector
from src.parsers.python_parser import PythonParser

def _dedupe_order(items: list[str]) -> list[str]:
    seen = set()
    result = []
    for item in items:
        if item not in seen:
            seen.add(item)
            result.append(item)
    return result


def _classify_component(file_path: str, content: Optional[str]) -> str:
    path = file_path.lower()
    tokens = [t for t in path.replace("\\", "/").split("/") if t]

    def has_any(keys: list[str]) -> bool:
        return any(k in path for k in keys)

    if has_any(["/auth", "authentication", "login", "signup", "oauth", "jwt"]):
        return "authentication"
    if has_any(["/security", "crypto", "encryption", "tls", "ssl", "cipher"]):
        return "security"
    if has_any(["/db", "database", "schema", "migration", "migrations", "/model", "/models"]):
        return "database"
    if has_any(["/frontend", "/ui", "/client", "/web", "/pages", "/components", "/views"]):
        return "frontend"
    if "quiz" in tokens or "quiz" in path:
        return "quiz"
    return "other"


def _detect_security_features(content: str) -> list[str]:
    text = content.lower()
    detected = []
    patterns = [
        (["mfa", "multi-factor", "multi factor", "two-factor", "2fa"], "MFA"),
        (["jwt", "json web token"], "JWT Authentication"),
        (["oauth", "openid"], "OAuth"),
        (["aes-256", "aes256"], "AES-256 Encryption"),
        (["encrypt", "encryption", "decrypt", "decryption"], "Encryption"),
        (["bcrypt", "scrypt", "argon2", "pbkdf2"], "Password Hashing"),
        (["tls", "ssl"], "TLS/SSL"),
        (["xss", "csrf", "sqli", "sql injection"], "Web Vulnerability Mitigation"),
    ]
    for keys, label in patterns:
        if any(k in text for k in keys):
            detected.append(label)
    return _dedupe_order(detected)


def _extract_packages(file_path: str, content: str, language: Optional[str]) -> list[str]:
    packages: list[str] = []
    if language == "java":
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("package "):
                pkg = line[len("package "):].rstrip(";").strip()
                if pkg:
                    packages.append(pkg)
                break
    elif language == "python":
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("import "):
                pkg = line[len("import "):].split(" as ")[0].split(",")[0].strip()
                if pkg:
                    packages.append(pkg)
            elif line.startswith("from "):
                pkg = line[len("from "):].split(" import ")[0].strip()
                if pkg:
                    packages.append(pkg)
    elif language in {"javascript", "typescript"}:
        for line in content.splitlines():
            line = line.strip()
            if " from " in line and ("import " in line or "export " in line):
                parts = line.split(" from ")
                if len(parts) > 1:
                    mod = parts[1].strip().strip(";").strip("'\"")
                    if mod:
                        packages.append(mod)
            if "require(" in line:
                start = line.find("require(")
                if start != -1:
                    frag = line[start + len("require("):].strip()
                    if frag.startswith(("'", '"')):
                        mod = frag.split(frag[0], 2)[1]
                        if mod:
                            packages.append(mod)
    return _dedupe_order(packages)


def _classify_intent(message: Optional[str], security_features: list[str]) -> str:
    text = (message or "").lower()
    if security_features:
        return "SECURITY"
    if any(k in text for k in ["fix", "bug", "defect", "hotfix", "patch"]):
        return "BUGFIX"
    if any(k in text for k in ["refactor", "cleanup", "restructure", "rename"]):
        return "REFACTOR"
    if any(k in text for k in ["feat", "feature", "add", "introduce", "implement"]):
        return "FEATURE"
    return "FEATURE"


def _generate_change_summary(message: Optional[str],
                             api_summary: dict,
                             security_features: list[str],
                             has_db_change: bool,
                             components: list[str]) -> str:
    base = (message or "").splitlines()[0].strip()
    clauses = []
    if security_features:
        clauses.append("Adds security enhancements")
    if has_db_change:
        clauses.append("includes database schema changes")
    if api_summary.get("added", 0) or api_summary.get("modified", 0) or api_summary.get("removed", 0):
        clauses.append("updates API endpoints")
    if components:
        clauses.append(f"touches {', '.join(components)} components")

    if base and clauses:
        return f"{base}. " + "; ".join(clauses) + "."
    if base:
        return base + "."
    if clauses:
        return "; ".join(clauses).capitalize() + "."
    return "Updates internal code and configuration."


def _detect_doc_impact(file_path: str, api_summary: dict, has_db_change: bool) -> dict:
    path = file_path.lower()
    return {
        "readme": "readme" in path,
        "api_docs": any(api_summary.values()) or "openapi" in path or "swagger" in path,
        "architecture": "architecture" in path or "/docs/arch" in path or "/design" in path,
        "adr_required": has_db_change or any(api_summary.values())
    }


def _extract_env_vars(content: str) -> list[str]:
    vars_found = []
    patterns = [
        r'\bENV\s+([A-Z][A-Z0-9_]{2,})\b',
        r'\bexport\s+([A-Z][A-Z0-9_]{2,})\b',
        r'process\.env\.([A-Z][A-Z0-9_]{2,})',
        r'os\.environ\[\s*[\'"]([A-Z][A-Z0-9_]{2,})[\'"]\s*\]'
    ]
    for rx in patterns:
        vars_found.extend(re.findall(rx, content))
    return _dedupe_order(vars_found)


def _extract_tables_from_sql(content: str) -> list[str]:
    tables = []
    for match in re.finditer(r'\b(?:CREATE|ALTER|DROP)\s+TABLE\s+[`"]?([A-Za-z_][\w]*)', content, re.IGNORECASE):
        tables.append(match.group(1))
    return _dedupe_order(tables)


def _extract_table_annotations(content: str) -> list[str]:
    tables = []
    for match in re.finditer(r'@Table\s*\(\s*name\s*=\s*["\']([A-Za-z_][\w]*)["\']', content):
        tables.append(match.group(1))
    return _dedupe_order(tables)


def _calc_complexity_score(total_files: int,
                           api_total: int,
                           component_count: int,
                           has_db_change: bool,
                           has_security: bool,
                           breaking: bool) -> float:
    score = 0.0
    score += min(0.6, total_files * 0.03)
    score += min(0.3, api_total * 0.02)
    score += min(0.2, component_count * 0.03)
    if has_db_change:
        score += 0.2
    if has_security:
        score += 0.1
    if breaking:
        score += 0.1
    return round(min(1.0, score), 3)

def _extract_markdown_sections(content: str) -> dict[str, list[str]]:
    sections: dict[str, list[str]] = {}
    current: Optional[str] = None
    for line in content.splitlines():
        heading = re.match(r'^\s{0,3}(#{1,6})\s+(.+)$', line)
        if heading:
            title = heading.group(2).strip().lower()
            current = title
            sections.setdefault(current, [])
            continue
        if current is not None:
            sections[current].append(line.rstrip())
    return sections


def _normalize_section_items(lines: list[str]) -> list[str]:
    items: list[str] = []
    for line in lines:
        raw = line.strip()
        if not raw:
            continue
        bullet = re.match(r'^[-*+]\s+(.*)$', raw)
        ordered = re.match(r'^\d+\.\s+(.*)$', raw)
        if bullet:
            items.append(bullet.group(1).strip())
        elif ordered:
            items.append(ordered.group(1).strip())
        else:
            items.append(raw)
    return _dedupe_order(items)


def _first_paragraph(lines: list[str]) -> Optional[str]:
    buffer: list[str] = []
    for line in lines:
        raw = line.strip()
        if not raw:
            if buffer:
                break
            continue
        buffer.append(raw)
    if buffer:
        return " ".join(buffer).strip()
    return None


def _detect_license_from_text(content: str) -> Optional[str]:
    candidates = [
        "MIT License", "Apache License", "GNU General Public License",
        "Mozilla Public License", "BSD License", "ISC License"
    ]
    for name in candidates:
        if name.lower() in content.lower():
            return name
    return None


def _collect_documentation_context(git_mgr, additional_ignores: list[str], env_vars: list[str]) -> dict:
    context: dict[str, object] = {}
    files = git_mgr.list_all_files()
    doc_files: list[str] = []
    license_files: list[str] = []
    for file_path in files:
        lower = file_path.lower()
        if FileFilter.should_exclude_from_analysis(file_path, additional_ignores):
            continue
        if os.path.basename(lower).startswith("readme") and lower.endswith((".md", ".rst", ".txt", ".adoc")):
            doc_files.append(file_path)
        elif "/docs/" in lower and lower.endswith((".md", ".rst", ".txt", ".adoc")):
            doc_files.append(file_path)
        elif os.path.basename(lower) in {"project_status.md", "documentation.md"}:
            doc_files.append(file_path)
        if os.path.basename(lower).startswith("license"):
            license_files.append(file_path)

    sections_map = {
        "project_overview": ["overview", "about", "description"],
        "installation": ["installation", "install", "setup", "getting started"],
        "usage": ["usage", "quickstart", "quick start", "run"],
        "features": ["features"],
        "tech_stack": ["tech stack", "technology", "built with", "stack"],
        "configuration": ["configuration", "config"],
        "troubleshooting": ["troubleshooting", "faq"],
        "contributing": ["contributing", "contribution", "contribute"],
        "license": ["license"]
    }

    aggregated: dict[str, list[str]] = {k: [] for k in sections_map.keys()}
    overview_paragraph: Optional[str] = None
    license_value: Optional[str] = None

    for file_path in doc_files:
        content = git_mgr.get_file_content(file_path)
        if not content:
            continue
        sections = _extract_markdown_sections(content)
        if overview_paragraph is None:
            # Use the first paragraph before any heading as fallback overview.
            pre_heading_lines = []
            for line in content.splitlines():
                if re.match(r'^\s{0,3}#{1,6}\s+', line):
                    break
                pre_heading_lines.append(line)
            overview_paragraph = _first_paragraph(pre_heading_lines)

        for key, aliases in sections_map.items():
            for title, lines in sections.items():
                if any(alias in title for alias in aliases):
                    items = _normalize_section_items(lines)
                    aggregated[key].extend(items)
                    if key == "license":
                        if license_value is None:
                            license_value = _first_paragraph(lines)
                    if key == "project_overview" and overview_paragraph is None:
                        overview_paragraph = _first_paragraph(lines)

    if license_value is None:
        for file_path in license_files:
            content = git_mgr.get_file_content(file_path) or ""
            detected = _detect_license_from_text(content)
            if detected:
                license_value = detected
                break

    if overview_paragraph:
        context["project_overview"] = overview_paragraph
    for key in ["installation", "usage", "features", "tech_stack", "configuration",
                "troubleshooting", "contributing"]:
        values = _dedupe_order([v for v in aggregated.get(key, []) if v])
        if values:
            context[key] = values
    if env_vars:
        context.setdefault("configuration", _dedupe_order(env_vars))
    if license_value:
        context["license"] = license_value
    return context


def _extract_route_params(path: str) -> list[str]:
    params = []
    for token in re.findall(r'<([^>]+)>', path):
        params.append(token.strip())
    for token in re.findall(r'\{([^}]+)\}', path):
        params.append(token.strip())
    for token in re.findall(r':([A-Za-z_][A-Za-z0-9_]*)', path):
        params.append(token.strip())
    return _dedupe_order(params)


def _parse_swagger_docstring(doc: str) -> dict[str, Union[list[str], str]]:
    result: dict[str, list[str] | str] = {}
    lines = doc.splitlines()
    summary = None
    for line in lines:
        raw = line.strip()
        if raw:
            summary = raw
            break
    if summary:
        result["summary"] = summary

    params: list[str] = []
    responses: list[str] = []
    examples: list[str] = []
    in_parameters = False
    in_responses = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("parameters:"):
            in_parameters = True
            in_responses = False
            continue
        if stripped.startswith("responses:"):
            in_responses = True
            in_parameters = False
            continue
        if re.match(r'^\w+:', stripped) and not stripped.startswith(("-", "parameters:", "responses:")):
            in_parameters = False
            in_responses = False
        if in_parameters:
            name_match = re.match(r'^-\s*name:\s*(\w+)', stripped)
            if name_match:
                params.append(name_match.group(1))
        if in_responses:
            code_match = re.match(r'^(\d{3})\s*:', stripped)
            if code_match:
                responses.append(code_match.group(1))
        example_match = re.match(r'^\s*example:\s*(.+)$', stripped)
        if example_match:
            examples.append(example_match.group(1).strip())

    if params:
        result["params"] = _dedupe_order(params)
    if responses:
        result["responses"] = _dedupe_order(responses)
    if examples:
        result["example"] = examples[0]
    if "security:" in doc.lower() or "authorization" in doc.lower():
        result["auth"] = "Authorization"
    return result


def _collect_api_details(git_mgr, additional_ignores: list[str]) -> list[dict]:
    api_details: list[dict] = []
    files = git_mgr.list_all_files()
    for file_path in files:
        lower = file_path.lower()
        if FileFilter.should_exclude_from_analysis(file_path, additional_ignores):
            continue
        if not lower.endswith((".py", ".js", ".jsx", ".ts", ".tsx", ".java", ".kt")):
            continue
        if not any(token in lower for token in ["/api", "/routes", "/route", "/controller", "/controllers", "/server", "/app"]):
            continue
        content = git_mgr.get_file_content(file_path)
        if not content:
            continue

        # Flask/FastAPI style routes
        for match in re.finditer(r'@(\w+)\.route\(\s*[\'"]([^\'"]+)[\'"]\s*(?:,\s*methods\s*=\s*\[([^\]]+)\])?', content):
            decorator, path, methods_block = match.groups()
            methods = []
            if methods_block:
                methods = re.findall(r'[\'"](\w+)[\'"]', methods_block)
            if not methods:
                methods = ["GET"]
            params = _extract_route_params(path)
            for method in methods:
                api_entry = {"method": method.upper(), "path": path}
                if params:
                    api_entry["params"] = [f"path:{p}" for p in params]
                api_details.append(api_entry)

        for match in re.finditer(r'@(\w+)\.(get|post|put|delete|patch)\(\s*[\'"]([^\'"]+)[\'"]', content):
            decorator, method, path = match.groups()
            params = _extract_route_params(path)
            api_entry = {"method": method.upper(), "path": path}
            if params:
                api_entry["params"] = [f"path:{p}" for p in params]
            api_details.append(api_entry)

        # Express.js style routes
        for match in re.finditer(r'\b(app|router|api|server)\.(get|post|put|delete|patch)\(\s*[\'"]([^\'"]+)[\'"]', content):
            _, method, path = match.groups()
            params = _extract_route_params(path)
            api_entry = {"method": method.upper(), "path": path}
            if params:
                api_entry["params"] = [f"path:{p}" for p in params]
            api_details.append(api_entry)
        for match in re.finditer(r'\.route\(\s*[\'"]([^\'"]+)[\'"]\s*\)\s*\.(get|post|put|delete|patch)\b', content):
            path, method = match.groups()
            params = _extract_route_params(path)
            api_entry = {"method": method.upper(), "path": path}
            if params:
                api_entry["params"] = [f"path:{p}" for p in params]
            api_details.append(api_entry)

        # Spring annotations
        for match in re.finditer(r'@(GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\(\s*[\'"]([^\'"]+)[\'"]', content):
            mapping, path = match.groups()
            method = mapping.replace("Mapping", "").upper()
            params = _extract_route_params(path)
            api_entry = {"method": method, "path": path}
            if params:
                api_entry["params"] = [f"path:{p}" for p in params]
            api_details.append(api_entry)
        for match in re.finditer(r'@RequestMapping\([^)]*method\s*=\s*RequestMethod\.(GET|POST|PUT|DELETE|PATCH)[^)]*', content):
            method = match.group(1)
            path_match = re.search(r'value\s*=\s*["\']([^"\']+)["\']', match.group(0))
            if path_match:
                path = path_match.group(1)
                params = _extract_route_params(path)
                api_entry = {"method": method, "path": path}
                if params:
                    api_entry["params"] = [f"path:{p}" for p in params]
                api_details.append(api_entry)

        # Swagger-style docstrings for Flask routes
        for route_match in re.finditer(r'@app\.route\(\s*[\'"]([^\'"]+)[\'"][^)]*\)\s*\ndef\s+\w+\([^)]*\):\s*\n\s+("""|\'\'\')([\s\S]*?)\2', content):
            path = route_match.group(1)
            doc = route_match.group(3)
            doc_info = _parse_swagger_docstring(doc)
            methods_match = re.search(r'methods\s*=\s*\[([^\]]+)\]', route_match.group(0))
            methods = re.findall(r'[\'"](\w+)[\'"]', methods_match.group(1)) if methods_match else ["GET"]
            for method in methods:
                api_entry = {"method": method.upper(), "path": path}
                api_entry.update(doc_info)
                api_details.append(api_entry)

    # Deduplicate by method/path/summary
    seen = set()
    deduped: list[dict] = []
    for item in api_details:
        key = (item.get("method"), item.get("path"), item.get("summary"))
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped

def _ask_new_user_interactive() -> bool:
    """Ask on TTY if the user is new to the tool.

    Returns True when the user confirms they are new. Defaults to False
    when stdin is not a TTY or on empty input.
    """
    try:
        if sys.stdin.isatty():
            answer = input("Are you new to this tool? [y/N]: ").strip().lower()
            return answer in ("y", "yes")
    except Exception:
        pass
    return False


def _is_new_user_flag(argv: list[str]) -> bool:
    """Detect `--new-user` flag in argv or env var CODE_DETECT_NEW_USER.

    Accepts values like: --new-user, --new-user=true, --new-user=yes.
    Env var: CODE_DETECT_NEW_USER=1|true|yes
    """
    truthy = {"1", "true", "yes", "y"}
    # Check CLI
    for a in argv:
        if a == "--new-user":
            return True
        if a.startswith("--new-user="):
            val = a.split("=", 1)[1].strip().lower()
            return val in truthy
    # Check env
    env_val = os.environ.get("CODE_DETECT_NEW_USER", "").strip().lower()
    return env_val in truthy


def _validate_report_schema(report: dict) -> tuple[bool, str]:
    """Validate report structure before writing to disk."""
    if not isinstance(report, dict):
        return False, "Report must be an object"

    required_top = {"meta", "context", "analysis_summary", "changes"}
    if not required_top.issubset(report.keys()):
        return False, "Report missing required top-level keys"

    if not isinstance(report.get("meta"), dict):
        return False, "meta must be an object"
    if not isinstance(report.get("context"), dict):
        return False, "context must be an object"
    if not isinstance(report.get("analysis_summary"), dict):
        return False, "analysis_summary must be an object"
    if not isinstance(report.get("changes"), list):
        return False, "changes must be an array"

    summary = report["analysis_summary"]
    summary_keys = {"total_files", "highest_severity", "breaking_changes_detected"}
    if not summary_keys.issubset(summary.keys()):
        return False, "analysis_summary missing required keys"

    if not isinstance(summary["total_files"], int):
        return False, "analysis_summary.total_files must be an integer"
    if summary["highest_severity"] not in {"PATCH", "MINOR", "MAJOR"}:
        return False, "analysis_summary.highest_severity must be PATCH|MINOR|MAJOR"
    if not isinstance(summary["breaking_changes_detected"], bool):
        return False, "analysis_summary.breaking_changes_detected must be a boolean"

    required_change_keys = {
        "file", "change_type", "language", "severity", "is_binary", "syntax_error", "features"
    }
    for item in report["changes"]:
        if not isinstance(item, dict):
            return False, "Each changes entry must be an object"
        if not required_change_keys.issubset(item.keys()):
            return False, "A changes entry is missing required keys"
        if item["severity"] not in {"PATCH", "MINOR", "MAJOR"}:
            return False, "Change severity must be PATCH|MINOR|MAJOR"
        if not isinstance(item["is_binary"], bool):
            return False, "Change is_binary must be a boolean"
        if not isinstance(item["syntax_error"], bool):
            return False, "Change syntax_error must be a boolean"
        if not isinstance(item["features"], dict):
            return False, "Change features must be an object"

    # Optional documentation_context validation
    if "documentation_context" in report:
        doc_ctx = report["documentation_context"]
        if not isinstance(doc_ctx, dict):
            return False, "documentation_context must be an object"
        allowed_doc_keys = {
            "project_overview", "installation", "usage", "features", "tech_stack",
            "configuration", "troubleshooting", "contributing", "license"
        }
        for key in doc_ctx.keys():
            if key not in allowed_doc_keys:
                return False, f"documentation_context contains invalid key: {key}"
        string_keys = {"project_overview", "license"}
        list_keys = allowed_doc_keys - string_keys
        for key in string_keys:
            if key in doc_ctx and not isinstance(doc_ctx[key], str):
                return False, f"documentation_context.{key} must be a string"
        for key in list_keys:
            if key in doc_ctx:
                if not isinstance(doc_ctx[key], list) or not all(isinstance(v, str) for v in doc_ctx[key]):
                    return False, f"documentation_context.{key} must be an array of strings"

    # Optional api_details validation
    if "api_details" in report:
        api_details = report["api_details"]
        if not isinstance(api_details, list):
            return False, "api_details must be an array"
        allowed_api_keys = {
            "method", "path", "summary", "auth", "params", "responses", "example"
        }
        for item in api_details:
            if not isinstance(item, dict):
                return False, "Each api_details entry must be an object"
            for key in item.keys():
                if key not in allowed_api_keys:
                    return False, f"api_details contains invalid key: {key}"
            if "method" not in item or not isinstance(item["method"], str):
                return False, "api_details.method must be a string"
            if "path" not in item or not isinstance(item["path"], str):
                return False, "api_details.path must be a string"
            if "summary" in item and not isinstance(item["summary"], str):
                return False, "api_details.summary must be a string"
            if "auth" in item and not isinstance(item["auth"], str):
                return False, "api_details.auth must be a string"
            if "example" in item and not isinstance(item["example"], str):
                return False, "api_details.example must be a string"
            if "params" in item:
                if not isinstance(item["params"], list) or not all(isinstance(v, str) for v in item["params"]):
                    return False, "api_details.params must be an array of strings"
            if "responses" in item:
                if not isinstance(item["responses"], list) or not all(isinstance(v, str) for v in item["responses"]):
                    return False, "api_details.responses must be an array of strings"

    return True, ""


def main():
    usage_error = {"error": "Usage: python main.py <repo_path_or_url> [github_token] [branch] [--new-user]"}

    if len(sys.argv) < 2:
        print(json.dumps(usage_error))
        sys.exit(1)

    # Extract positional args (ignore known flags we handle separately)
    args = [a for a in sys.argv[1:] if not a.startswith("--new-user")]
    if not args:
        print(json.dumps(usage_error))
        sys.exit(1)

    repo_path = args[0]
    github_token = args[1] if len(args) > 1 else os.environ.get('GITHUB_TOKEN')
    branch = args[2] if len(args) > 2 else "main"

    new_user = _is_new_user_flag(sys.argv[1:]) or _ask_new_user_interactive()

    report = {
        "meta": {
            "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
            "tool_version": "1.0.0"
        },
        "context": {},
        "analysis_summary": {
            "total_files": 0,
            "highest_severity": "PATCH",
            "breaking_changes_detected": False
        },
        "changes": [],
        "change_summary": "",
        "api_summary": {
            "added": 0,
            "modified": 0,
            "removed": 0
        },
        "impact_scope": "INTERNAL_ONLY",
        "security_features_detected": [],
        "affected_packages": [],
        "intent_classification": "FEATURE",
        "component_distribution": {},
        "documentation_impact": {
            "readme": False,
            "api_docs": False,
            "architecture": False,
            "adr_required": False
        },
        "breaking_change_details": [],
        "configuration_changes": {
            "docker": False,
            "build_files": [],
            "environment_variables": []
        },
        "database_impact": {
            "schema_changed": False,
            "tables_affected": []
        },
        "feature_tags": [],
        "change_complexity_score": 0.0,
        "test_impact": {
            "requires_new_tests": False,
            "test_files_changed": 0
        }
    }

    try:
        # Use context manager to ensure cleanup
        with GitManager(repo_path, github_token, branch) as git_mgr:
            report["context"] = git_mgr.get_metadata()
            config_path = os.path.join(git_mgr.repo_path, "config.yaml")
            config = ConfigLoader.load(config_path)
            additional_ignores = config.get("ignore_patterns", [])

            # New users: analyze the full repository once for baseline.
            changes_list = git_mgr.list_all_files() if new_user else git_mgr.get_changed_files()

            severity_rank = {"PATCH": 1, "MINOR": 2, "MAJOR": 3}
            max_severity = 0
            api_summary = {"added": 0, "modified": 0, "removed": 0}
            security_features_detected: list[str] = []
            affected_packages: list[str] = []
            component_distribution: dict[str, int] = {}
            has_db_change = False
            tables_affected: list[str] = []
            doc_impact = {
                "readme": False,
                "api_docs": False,
                "architecture": False,
                "adr_required": False
            }
            config_build_files: list[str] = []
            env_vars: list[str] = []
            docker_changed = False
            test_files_changed = 0
            has_non_test_changes = False

            for change in changes_list:
                file_path = change["path"]
                if FileFilter.should_exclude_from_analysis(file_path, additional_ignores):
                    continue

                record = {
                    "file": file_path,
                    "change_type": change["change_type"],
                    "language": None,
                    "severity": "PATCH",
                    "is_binary": False,
                    "syntax_error": False,
                    "features": {},
                    "component": _classify_component(file_path, None)
                }

                # A. Binary/Safety Check
                if FileFilter.is_known_binary_extension(file_path):
                    record["is_binary"] = True
                    record["note"] = "Skipped binary file analysis"
                    component_distribution[record["component"]] = component_distribution.get(record["component"], 0) + 1
                    report["changes"].append(record)
                    continue

                # B. Read Content
                content = git_mgr.get_file_content(file_path)
                if content is None:
                    record["is_binary"] = True
                    record["note"] = "Skipped binary file analysis"
                    component_distribution[record["component"]] = component_distribution.get(record["component"], 0) + 1
                    report["changes"].append(record)
                    continue
                ext = os.path.splitext(file_path)[1].lower()

                # C. Syntax Check
                if SyntaxChecker.check(file_path, content):
                    record["syntax_error"] = True
                    record["features"]["note"] = "Partial extraction due to syntax error"

                # D. Parse Features
                features = {}
                if ext == '.java':
                    record["language"] = "java"
                    features = JavaParser.analyze(content)

                # Handle JS and TS files using the TSParser
                elif ext in ['.ts', '.tsx', '.js', '.jsx']:
                    record["language"] = "typescript" if 'ts' in ext else "javascript"
                    features = TSParser.analyze(content)

                elif ext == '.py':
                    record["language"] = "python"
                    features = PythonParser.analyze(content)

                # Merge notes if syntax error existed
                if record["syntax_error"]:
                    features["note"] = record["features"]["note"]

                # Component refinement with content
                record["component"] = _classify_component(file_path, content)
                component_distribution[record["component"]] = component_distribution.get(record["component"], 0) + 1

                # Security features detection
                security_features = _detect_security_features(content)
                if security_features:
                    security_features_detected.extend(security_features)

                # Extract affected packages/services
                pkgs = _extract_packages(file_path, content, record["language"])
                if pkgs:
                    affected_packages.extend(pkgs)

                record["features"] = features

                # E. Schema & Scoring
                schema_tags = SchemaDetector.analyze(file_path, content)
                severity = SeverityCalculator.assess(ext, features, schema_tags)

                record["severity"] = severity
                if schema_tags:
                    has_db_change = True
                    if ext == ".sql":
                        tables_affected.extend(_extract_tables_from_sql(content))
                    if ext == ".java":
                        tables_affected.extend(_extract_table_annotations(content))
                    for tag in schema_tags:
                        if tag.startswith("MONGOOSE_MODEL:"):
                            tables_affected.append(tag.split(":", 1)[1])

                # F. Update Summary Stats
                if severity_rank[severity] > max_severity:
                    max_severity = severity_rank[severity]
                    report["analysis_summary"]["highest_severity"] = severity

                if severity == "MAJOR":
                    report["analysis_summary"]["breaking_changes_detected"] = True

                # API summary aggregation
                api_endpoints = features.get("api_endpoints", [])
                if isinstance(api_endpoints, list) and api_endpoints:
                    if change["change_type"] == "ADDED":
                        api_summary["added"] += len(api_endpoints)
                    elif change["change_type"] == "DELETED":
                        api_summary["removed"] += len(api_endpoints)
                    else:
                        api_summary["modified"] += len(api_endpoints)

                # Documentation impact signals
                impact = _detect_doc_impact(file_path, api_summary, has_db_change)
                doc_impact["readme"] = doc_impact["readme"] or impact["readme"]
                doc_impact["api_docs"] = doc_impact["api_docs"] or impact["api_docs"]
                doc_impact["architecture"] = doc_impact["architecture"] or impact["architecture"]
                doc_impact["adr_required"] = doc_impact["adr_required"] or impact["adr_required"]

                # Configuration/build detection
                path_lower = file_path.lower()
                if os.path.basename(path_lower) in {"dockerfile", "docker-compose.yml", "docker-compose.yaml"}:
                    docker_changed = True
                if os.path.basename(path_lower) in {
                    "pom.xml", "build.gradle", "build.gradle.kts", "package.json",
                    "pyproject.toml", "requirements.txt", "makefile"
                }:
                    config_build_files.append(os.path.basename(path_lower))
                if path_lower.endswith((".env", ".yml", ".yaml", ".json", ".toml", ".ini")):
                    env_vars.extend(_extract_env_vars(content))

                # Test impact signals
                is_test_file = (
                    "/test" in path_lower or "/tests" in path_lower or
                    path_lower.endswith("_test.py") or path_lower.endswith(".spec.ts") or
                    path_lower.endswith(".test.ts") or path_lower.endswith(".spec.js") or
                    path_lower.endswith(".test.js")
                )
                if is_test_file:
                    test_files_changed += 1
                else:
                    has_non_test_changes = True

                report["changes"].append(record)

            report["analysis_summary"]["total_files"] = len(report["changes"])

            # Normalize aggregates
            security_features_detected = _dedupe_order(security_features_detected)
            affected_packages = _dedupe_order(affected_packages)
            tables_affected = _dedupe_order(tables_affected)
            config_build_files = _dedupe_order(config_build_files)
            env_vars = _dedupe_order(env_vars)
            report["security_features_detected"] = security_features_detected
            report["affected_packages"] = affected_packages
            report["api_summary"] = api_summary
            report["component_distribution"] = component_distribution
            report["documentation_impact"] = doc_impact
            report["configuration_changes"] = {
                "docker": docker_changed,
                "build_files": config_build_files,
                "environment_variables": env_vars
            }
            report["database_impact"] = {
                "schema_changed": has_db_change,
                "tables_affected": tables_affected
            }
            report["test_impact"] = {
                "requires_new_tests": False,
                "test_files_changed": test_files_changed
            }

            # Documentation context and API details (only include when evidence exists)
            documentation_context = _collect_documentation_context(git_mgr, additional_ignores, env_vars)
            if documentation_context:
                report["documentation_context"] = documentation_context
            api_details = _collect_api_details(git_mgr, additional_ignores)
            if api_details:
                report["api_details"] = api_details

            # Impact scope classification
            if security_features_detected:
                report["impact_scope"] = "SECURITY_CHANGE"
            elif has_db_change:
                report["impact_scope"] = "DATABASE_CHANGE"
            elif any(api_summary.values()):
                report["impact_scope"] = "API_CHANGE"
            else:
                report["impact_scope"] = "INTERNAL_ONLY"

            # Intent classification
            commit_message = report.get("context", {}).get("intent", {}).get("message")
            report["intent_classification"] = _classify_intent(commit_message, security_features_detected)

            # Change summary narrative
            components_sorted = sorted(
                component_distribution.items(),
                key=lambda item: (-item[1], item[0])
            )
            component_names = [name for name, _ in components_sorted if name != "other"]
            report["change_summary"] = _generate_change_summary(
                commit_message,
                api_summary,
                security_features_detected,
                has_db_change,
                component_names[:3]
            )

            # Breaking change details
            breaking_details = []
            if report["analysis_summary"]["breaking_changes_detected"]:
                if api_summary.get("removed", 0) > 0:
                    breaking_details.append("API endpoints removed or changed")
                if has_db_change:
                    breaking_details.append("Database schema changes detected")
                if report["analysis_summary"]["highest_severity"] == "MAJOR":
                    breaking_details.append("Major severity changes detected")
            if commit_message and "breaking" in commit_message.lower():
                breaking_details.append("Commit message indicates breaking change")
            report["breaking_change_details"] = _dedupe_order(breaking_details)

            # Feature tags
            feature_tags = []
            if security_features_detected:
                feature_tags.append("Security")
            if "authentication" in component_distribution:
                feature_tags.append("Authentication")
            if any(api_summary.values()):
                feature_tags.append("API")
            if has_db_change:
                feature_tags.append("Database")
            if docker_changed or config_build_files:
                feature_tags.append("Deployment")
            feature_tags.extend([name.title() for name in component_distribution.keys() if name not in {"other"}])
            report["feature_tags"] = _dedupe_order(feature_tags)

            # Test impact
            requires_new_tests = (
                test_files_changed == 0 and has_non_test_changes and (
                    any(api_summary.values()) or has_db_change or security_features_detected
                )
            )
            report["test_impact"]["requires_new_tests"] = requires_new_tests

            # Change complexity score
            api_total = api_summary["added"] + api_summary["modified"] + api_summary["removed"]
            report["change_complexity_score"] = _calc_complexity_score(
                report["analysis_summary"]["total_files"],
                api_total,
                len(component_distribution),
                has_db_change,
                bool(security_features_detected),
                report["analysis_summary"]["breaking_changes_detected"]
            )

            valid, validation_error = _validate_report_schema(report)
            if not valid:
                raise ValueError(f"Report validation failed: {validation_error}")

            # Save to file
            output_path = os.path.join(os.path.dirname(__file__), 'impact_report.json')
            with open(output_path, 'w') as f:
                json.dump(report, f, indent=2)

            # Print to stdout
            print(json.dumps(report, indent=2))

    except Exception as e:
        error_report = {"status": "error", "message": str(e)}

        # Save error to file
        output_path = os.path.join(os.path.dirname(__file__), 'impact_report.json')
        with open(output_path, 'w') as f:
            json.dump(error_report, f, indent=2)

        print(json.dumps(error_report))
        sys.exit(1)

if __name__ == "__main__":
    main()
