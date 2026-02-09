#!/usr/bin/env python3
"""
API Documentation Generator
Extracts and documents API endpoints from code changes
"""
import re


HTTP_METHODS = {"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"}


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


def _endpoint_to_string(endpoint) -> str:
    """
    Convert an endpoint to a string representation.
    Handles both string and dict endpoints.
    """
    if isinstance(endpoint, str):
        return endpoint
    elif isinstance(endpoint, dict):
        # Handle dict endpoints like {"line": 135, "route": "/", "verb": "GET"}
        verb = endpoint.get("verb", endpoint.get("method", ""))
        route = endpoint.get("route", endpoint.get("path", ""))
        if verb:
            verb = str(verb).upper()
        route = _normalize_route(route)
        if verb and route:
            return f"{verb} {route}"
        elif route:
            return route
        else:
            return str(endpoint)
    else:
        return str(endpoint)


def _describe_endpoint(endpoint: str) -> str:
    return "Detected API endpoint from impact analysis of code changes."


def _parse_endpoint(endpoint: str):
    parts = (endpoint or "").strip().split(None, 1)
    if len(parts) == 2 and parts[0].upper() in HTTP_METHODS:
        return parts[0].upper(), parts[1]
    return None, (endpoint or "").strip()


def generate_api_docs(report):
    """
    Generate API documentation from impact report
    
    Args:
        report (dict): Impact report containing API endpoint information
    
    Returns:
        str: Formatted API reference documentation
    """
    changes = report.get("changes", [])
    
    # Extract all API endpoints from all changed files
    api_endpoints = []
    files_with_apis = []
    
    for change in changes:
        features = change.get("features", {})
        endpoints = features.get("api_endpoints", [])
        
        if endpoints:
            file_path = change.get("file", "unknown")
            # Convert endpoints to strings for consistent handling
            string_endpoints = []
            for ep in endpoints:
                endpoint_str = _endpoint_to_string(ep)
                method, path = _parse_endpoint(endpoint_str)
                if method:
                    path = _normalize_route(path, file_path=file_path)
                    string_endpoints.append(f"{method} {path}")
                else:
                    string_endpoints.append(_normalize_route(path, file_path=file_path))
            files_with_apis.append({
                "file": file_path,
                "endpoints": string_endpoints,
                "language": change.get("language", "unknown")
            })
            api_endpoints.extend(string_endpoints)
    
    # Build documentation
    doc = "# API Reference\n\n"
    
    if not api_endpoints:
        doc += "No API endpoints detected in the analyzed code changes.\n"
        return doc
    
    doc += f"**Total Endpoints:** {len(api_endpoints)}\n\n"
    doc += "---\n\n"
    
    # Group endpoints by file
    doc += "## Endpoints by File\n\n"
    
    for file_info in files_with_apis:
        file_path = file_info["file"]
        endpoints = file_info["endpoints"]
        language = file_info["language"]
        
        doc += f"### `{file_path}`\n\n"
        doc += f"**Language:** {language}\n\n"
        
        for endpoint in endpoints:
            method, path = _parse_endpoint(endpoint)
            if method:
                doc += f"- **Method:** {method}\n"
                doc += f"  **Path:** `{path}`\n"
                doc += f"  **Summary:** {_describe_endpoint(endpoint)}\n"
                doc += "  **Authentication:** Not detected in impact report\n"
                doc += "  **Parameters:** Not detected in impact report\n"
                doc += "  **Responses:** Not detected in impact report\n"
                doc += "  **Examples:** Not detected in impact report\n"
            else:
                doc += f"- **Path:** `{endpoint}`\n"
                doc += f"  **Summary:** {_describe_endpoint(endpoint)}\n"
                doc += "  **Authentication:** Not detected in impact report\n"
                doc += "  **Parameters:** Not detected in impact report\n"
                doc += "  **Responses:** Not detected in impact report\n"
                doc += "  **Examples:** Not detected in impact report\n"
        
        doc += "\n"
    
    doc += "---\n\n"
    
    # List all unique endpoints (using string representation)
    doc += "## All Endpoints\n\n"
    
    unique_endpoints = sorted(set(api_endpoints))
    for endpoint in unique_endpoints:
        doc += f"- `{endpoint}`\n"
    
    doc += "\n---\n\n"
    doc += "## Notes\n\n"
    doc += "- This documentation was automatically generated from impact analysis\n"
    doc += "- Endpoints are extracted based on detected API patterns\n"
    doc += "- For detailed implementation, refer to the source files\n"
    
    return doc
