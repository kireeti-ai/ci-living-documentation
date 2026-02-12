#!/usr/bin/env python3
"""
API Documentation Generator
Extracts and documents API endpoints from code changes
"""
import re
import json
import os
from collections import defaultdict
from typing import Dict, Any, Optional

from sprint1.src.groq_client import GroqClient, llm_available


HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"}
IDEMPOTENT_METHODS = {"GET", "PUT", "DELETE", "HEAD", "OPTIONS"}


def _controller_base_path(file_path: str) -> str:
    """Infer controller base path from Java controller filename."""
    filename = (file_path or "").rsplit("/", 1)[-1]
    if not filename.endswith("Controller.java"):
        return ""
    stem = filename[:-len("Controller.java")]
    return stem.lower()


def _normalize_route(route: str, file_path: str = "") -> str:
    """Normalize route strings and repair common concatenation issues."""
    route = (route or "").strip()
    if not route:
        return route

    if not route.startswith("/"):
        route = f"/{route}"
    route = re.sub(r"/{2,}", "/", route)

    # Heuristic repair for concatenated Spring paths like:
    # questionmy-questions -> /question/my-questions
    base = _controller_base_path(file_path)
    if base and route.startswith(f"/{base}") and not route.startswith(f"/{base}/") and route != f"/{base}":
        suffix = route[len(base) + 1:]
        if suffix:
            route = f"/{base}/{suffix}"

    return route


def _endpoint_to_tuple(endpoint, file_path: str = ""):
    """
    Convert endpoint objects to (method, path) tuple.
    """
    if isinstance(endpoint, str):
        return _parse_endpoint(endpoint, file_path)

    if isinstance(endpoint, dict):
        verb = str(endpoint.get("verb", endpoint.get("method", ""))).upper().strip()
        route = _normalize_route(endpoint.get("route", endpoint.get("path", "")), file_path=file_path)
        if verb not in HTTP_METHODS:
            verb = "GET"
        return verb, route

    return None, ""


def _parse_endpoint(endpoint: str, file_path: str = ""):
    parts = (endpoint or "").strip().split(None, 1)
    if len(parts) == 2 and parts[0].upper() in HTTP_METHODS:
        return parts[0].upper(), _normalize_route(parts[1], file_path=file_path)
    return None, _normalize_route((endpoint or "").strip(), file_path=file_path)


def _infer_summary(method: str, path: str) -> str:
    noun = path.strip("/").split("/")[0] if path else "resource"
    noun = noun.replace("-", " ") or "resource"
    if method == "GET":
        return f"Retrieve {noun} data."
    if method == "POST":
        return f"Create {noun}."
    if method == "PUT":
        return f"Update {noun}."
    if method == "PATCH":
        return f"Partially update {noun}."
    if method == "DELETE":
        return f"Delete {noun}."
    return f"Handle {noun} operation."


def _infer_auth(path: str) -> str:
    public_paths = {"/", "/health", "/login", "/register", "/verify-otp", "/api/csrf-token"}
    if path in public_paths:
        return "Public endpoint (authentication may not be required)"
    return "Likely requires authentication/authorization middleware"


def _infer_parameters(path: str) -> str:
    params = re.findall(r"\{([^}]+)\}|:([A-Za-z0-9_]+)", path or "")
    names = [a or b for a, b in params if (a or b)]
    if not names:
        return "Path params: none detected"
    return "Path params: " + ", ".join(names)


def _infer_response(method: str) -> str:
    if method == "POST":
        return "201 Created (or 200 OK), 400 Bad Request, 401/403 Unauthorized, 500 Server Error"
    if method in IDEMPOTENT_METHODS:
        return "200 OK, 400 Bad Request, 401/403 Unauthorized, 404 Not Found, 500 Server Error"
    return "200 OK, 400 Bad Request, 401/403 Unauthorized, 500 Server Error"


def _infer_example(method: str, path: str) -> str:
    return f"`curl -X {method} \"<base-url>{path}\"`"


def _extract_json_object(text: str) -> Optional[Dict[str, Any]]:
    if not text:
        return None
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return None
    try:
        return json.loads(text[start:end + 1])
    except Exception:
        return None


def _extract_contract_endpoints(report: Dict[str, Any]):
    api_contract = report.get("api_contract")
    if isinstance(api_contract, dict) and isinstance(api_contract.get("endpoints"), list):
        return api_contract.get("endpoints")

    doc_contract = report.get("doc_contract")
    if isinstance(doc_contract, dict):
        nested_api = doc_contract.get("api_contract")
        if isinstance(nested_api, dict) and isinstance(nested_api.get("endpoints"), list):
            return nested_api.get("endpoints")

    return []


def _llm_enrich_endpoint(
    report: Dict[str, Any],
    file_path: str,
    language: str,
    method: str,
    path: str,
    rag_context: Optional[Dict[str, str]] = None
) -> Optional[Dict[str, str]]:
    use_llm = os.getenv("API_DOCS_USE_LLM", "true").lower() == "true"
    if not use_llm or not llm_available():
        return None

    client = GroqClient.from_env()
    if not client:
        return None

    context = report.get("context", {})
    rag_keys = sorted((rag_context or {}).keys())[:6]
    system = (
        "You generate API documentation metadata only from provided facts. "
        "Do not invent endpoint behavior. "
        "Return strict JSON object with keys: summary, authentication, parameters, responses, example."
    )
    user = (
        "Endpoint metadata request:\n"
        f"- repository: {context.get('repository', 'unknown')}\n"
        f"- file: {file_path}\n"
        f"- language: {language}\n"
        f"- method: {method}\n"
        f"- path: {path}\n"
        f"- available_rag_docs: {rag_keys}\n"
        "Rules:\n"
        "1) Keep summary under 18 words.\n"
        "2) If unknown, state concise assumption with 'Likely'.\n"
        "3) parameters should include path params if any.\n"
        "4) responses should list common HTTP outcomes in one line.\n"
        "5) example must be a curl command.\n"
    )

    try:
        raw = client.chat(system=system, user=user, temperature=0.0, max_tokens=220, seed=42)
        data = _extract_json_object(raw)
        if not isinstance(data, dict):
            return None
        enriched = {
            "summary": str(data.get("summary", "")).strip(),
            "authentication": str(data.get("authentication", "")).strip(),
            "parameters": str(data.get("parameters", "")).strip(),
            "responses": str(data.get("responses", "")).strip(),
            "example": str(data.get("example", "")).strip(),
        }
        if not all(enriched.values()):
            return None
        return enriched
    except Exception:
        return None


def generate_api_docs(report, rag_context: Optional[Dict[str, str]] = None):
    """
    Generate API documentation from impact report
    
    Args:
        report (dict): Impact report containing API endpoint information
    
    Returns:
        str: Formatted API reference documentation
    """
    api_endpoints = []
    files_with_apis = defaultdict(list)
    contract_endpoints = _extract_contract_endpoints(report)

    if contract_endpoints:
        for ep in contract_endpoints:
            if not isinstance(ep, dict):
                continue
            method = str(ep.get("method", "GET")).upper().strip() or "GET"
            path = _normalize_route(str(ep.get("path", "")).strip())
            if not path:
                continue
            source = ep.get("source") if isinstance(ep.get("source"), dict) else {}
            file_path = source.get("file", "contract/unknown")
            entry = (method, path, "javascript")
            files_with_apis[file_path].append(entry)
            api_endpoints.append((method, path))
    else:
        changes = report.get("changes", [])
        for change in changes:
            features = change.get("features", {})
            endpoints = features.get("api_endpoints", [])

            if endpoints:
                file_path = change.get("file", "unknown")
                for ep in endpoints:
                    method, path = _endpoint_to_tuple(ep, file_path=file_path)
                    if not path:
                        continue
                    if not method:
                        method = "GET"
                    entry = (method, path, change.get("language", "unknown"))
                    files_with_apis[file_path].append(entry)
                    api_endpoints.append((method, path))
    
    # Build documentation
    doc = "# API Reference\n\n"
    
    if not api_endpoints:
        doc += "No API endpoints detected in the analyzed code changes.\n"
        return doc
    
    if contract_endpoints:
        endpoints_for_count = sorted(api_endpoints)
    else:
        endpoints_for_count = sorted(set(api_endpoints))
    doc += f"**Total Endpoints:** {len(endpoints_for_count)}\n\n"
    doc += "---\n\n"
    
    # Group endpoints by file
    doc += "## Endpoints by File\n\n"
    
    for file_path in sorted(files_with_apis.keys()):
        endpoints = sorted(set((m, p) for m, p, _ in files_with_apis[file_path]))
        language = files_with_apis[file_path][0][2]
        
        doc += f"### `{file_path}`\n\n"
        doc += f"**Language:** {language}\n\n"
        
        for method, path in endpoints:
            llm_meta = _llm_enrich_endpoint(
                report=report,
                file_path=file_path,
                language=language,
                method=method,
                path=path,
                rag_context=rag_context
            )

            summary = llm_meta["summary"] if llm_meta else _infer_summary(method, path)
            auth = llm_meta["authentication"] if llm_meta else _infer_auth(path)
            params = llm_meta["parameters"] if llm_meta else _infer_parameters(path)
            responses = llm_meta["responses"] if llm_meta else _infer_response(method)
            example = llm_meta["example"] if llm_meta else _infer_example(method, path)

            doc += f"- **Method:** {method}\n"
            doc += f"  **Path:** `{path}`\n"
            doc += f"  **Summary:** {summary}\n"
            doc += f"  **Authentication:** {auth}\n"
            doc += f"  **Parameters:** {params}\n"
            doc += f"  **Responses:** {responses}\n"
            doc += f"  **Examples:** {example}\n"
        
        doc += "\n"
    
    doc += "---\n\n"
    
    # List all unique endpoints (using string representation)
    doc += "## All Endpoints\n\n"
    
    for method, path in endpoints_for_count:
        doc += f"- `{method} {path}`\n"
    
    doc += "\n---\n\n"
    doc += "## Notes\n\n"
    doc += "- This documentation was generated from detected endpoint patterns with inferred metadata\n"
    if llm_available() and os.getenv("API_DOCS_USE_LLM", "true").lower() == "true":
        doc += "- LLM enrichment was enabled where available using local RAG context\n"
    doc += "- Review source controllers/routes for exact auth and payload schemas\n"
    doc += "- For detailed implementation, refer to the source files\n"
    
    return doc


def generate_api_descriptions_json(report, rag_context: Optional[Dict[str, str]] = None) -> str:
    """
    Generate API descriptions as JSON.
    Contract mode keeps all endpoint records (including duplicate METHOD+PATH in different modules)
    to stay aligned with api-reference endpoint count.
    """
    endpoints = []
    contract_endpoints = _extract_contract_endpoints(report)

    if contract_endpoints:
        for ep in contract_endpoints:
            if not isinstance(ep, dict):
                continue
            method = str(ep.get("method", "GET")).upper().strip() or "GET"
            path = _normalize_route(str(ep.get("path", "")).strip())
            if not path:
                continue

            source = ep.get("source") if isinstance(ep.get("source"), dict) else {}
            file_path = source.get("file", "contract/unknown")

            # --- Summary (fast heuristic, no LLM) ---
            summary = str(ep.get("summary", "")).strip()
            if not summary:
                summary = _infer_summary(method, path)

            # Derive resource name from module path for smarter summaries
            resource_hint = "resource"
            if "modules/" in file_path:
                try:
                    resource_hint = file_path.split("modules/")[1].split("/")[0].rstrip("s")
                except Exception:
                    pass

            # Fix repetitive summaries ("Register Register" -> "Register")
            parts = summary.split()
            if len(parts) == 2 and parts[0].lower() == parts[1].lower():
                summary = parts[0]
            elif summary == "Authenticate Login":
                summary = "Login"
            elif summary == "List Me":
                summary = "Get Current User"
            elif summary.startswith("Create ") and len(parts) >= 2:
                rest = " ".join(parts[1:]).lower()
                if rest in ["login", "logout", "register", "refresh", "change password"]:
                    summary = " ".join(parts[1:])

            # Replace generic "Resource endpoint" with resource-aware names
            if "Resource endpoint" in summary:
                if method == "GET" and "{" in path:
                    summary = f"Get {resource_hint} by ID"
                elif method == "GET":
                    summary = f"List {resource_hint}s"
                elif method == "POST":
                    summary = f"Create {resource_hint}"
                elif method in ("PATCH", "PUT"):
                    summary = f"Update {resource_hint}"
                elif method == "DELETE":
                    summary = f"Delete {resource_hint}"

            # Sub-resource naming
            if "members" in path and method == "POST":
                summary = f"Add member to {resource_hint}"

            # --- Parameters (from contract data) ---
            req = ep.get("request") if isinstance(ep.get("request"), dict) else {}
            path_params = req.get("path_params") if isinstance(req.get("path_params"), list) else []
            param_names = [str(p["name"]) for p in path_params if isinstance(p, dict) and p.get("name")]
            parameters = f"Path params: {', '.join(param_names)}" if param_names else "Path params: none detected"

            # --- Responses (from contract data) ---
            resp = ep.get("responses") if isinstance(ep.get("responses"), list) else []
            status_parts = []
            for r in resp:
                if isinstance(r, dict) and r.get("status") is not None:
                    desc = str(r.get("description", "")).strip()
                    status_parts.append(f"{r['status']} {desc}" if desc else str(r["status"]))
            responses = ", ".join(status_parts) if status_parts else _infer_response(method)

            endpoints.append({
                "key": f"{method} {path}",
                "method": method,
                "path": path,
                "source_file": file_path,
                "summary": summary,
                "parameters": parameters,
                "responses": responses,
            })
    else:
        changes = report.get("changes", [])
        for change in changes:
            features = change.get("features", {})
            discovered = features.get("api_endpoints", [])
            if not discovered:
                continue

            file_path = change.get("file", "unknown")
            language = change.get("language", "unknown")

            for ep in discovered:
                method, path = _endpoint_to_tuple(ep, file_path=file_path)
                if not path:
                    continue
                if not method:
                    method = "GET"

                llm_meta = _llm_enrich_endpoint(
                    report=report,
                    file_path=file_path,
                    language=language,
                    method=method,
                    path=path,
                    rag_context=rag_context
                )
                summary = llm_meta["summary"] if llm_meta else _infer_summary(method, path)
                parameters = llm_meta["parameters"] if llm_meta else _infer_parameters(path)
                responses = llm_meta["responses"] if llm_meta else _infer_response(method)

                endpoints.append({
                    "key": f"{method} {path}",
                    "method": method,
                    "path": path,
                    "source_file": file_path,
                    "summary": summary,
                    "parameters": parameters,
                    "responses": responses,
                })

    payload = {
        "total_endpoints": len(endpoints),
        "endpoints": endpoints,
    }
    return json.dumps(payload, indent=2, ensure_ascii=False)
