#!/usr/bin/env python3
"""
API Documentation Generator
Extracts and documents API endpoints from code changes
"""

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
            files_with_apis.append({
                "file": file_path,
                "endpoints": endpoints,
                "language": change.get("language", "unknown")
            })
            api_endpoints.extend(endpoints)
    
    # Build documentation
    doc = "# API Reference\n\n"
    
    if not api_endpoints:
        doc += "ℹ️ No API endpoints detected in the analyzed code changes.\n"
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
            # Try to extract HTTP method and path
            if isinstance(endpoint, str):
                # Parse endpoints like "GET /api/users" or just "/api/users"
                parts = endpoint.strip().split()
                if len(parts) == 2:
                    method, path = parts
                    doc += f"- **{method}** `{path}`\n"
                else:
                    doc += f"- `{endpoint}`\n"
            else:
                doc += f"- `{endpoint}`\n"
        
        doc += "\n"
    
    doc += "---\n\n"
    
    # List all unique endpoints
    doc += "## All Endpoints\n\n"
    
    unique_endpoints = sorted(set(api_endpoints))
    for endpoint in unique_endpoints:
        doc += f"- `{endpoint}`\n"
    
    doc += "\n---\n\n"
    doc += "## Notes\n\n"
    doc += "- This documentation was automatically generated from code analysis\n"
    doc += "- Endpoints are extracted based on detected API patterns\n"
    doc += "- For detailed implementation, refer to the source files\n"
    
    return doc