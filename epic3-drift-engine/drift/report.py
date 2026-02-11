import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime


def build_drift_report(
    symbol_drift: Dict[str, List[str]],
    api_drift: List[str],
    schema_drift: List[str],
    severity: str,
    repo_metadata: Dict[str, Any],
    docs_bucket_path: str,
    missing_files: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Build a comprehensive drift report compliant with Epic-4 requirements.

    Args:
        symbol_drift: Dictionary with "undocumented" and "obsolete" lists
        api_drift: List of undocumented API symbols
        schema_drift: List of undocumented schema symbols
        severity: Severity level string (MAJOR, MINOR, PATCH, or NONE)
        repo_metadata: Repository information from impact_report.json
        docs_bucket_path: Validated documentation storage path
        missing_files: Optional list of documentation files that couldn't be retrieved

    Returns:
        Dictionary containing complete drift report with Epic-4 compatible schema
    """
    # Build issues list from all detected drift
    issues = []

    # Add API drift issues
    for symbol in api_drift:
        issues.append({
            "type": "API_UNDOCUMENTED",
            "severity": "CRITICAL",
            "symbol": symbol,
            "description": f"API symbol '{symbol}' is not documented"
        })

    # Add schema drift issues
    for symbol in schema_drift:
        issues.append({
            "type": "SCHEMA_UNDOCUMENTED",
            "severity": "MAJOR",
            "symbol": symbol,
            "description": f"Schema symbol '{symbol}' is not documented"
        })

    # Add undocumented symbol issues
    for symbol in symbol_drift.get("undocumented", []):
        if symbol not in api_drift and symbol not in schema_drift:
            issues.append({
                "type": "SYMBOL_UNDOCUMENTED",
                "severity": "MINOR",
                "symbol": symbol,
                "description": f"Symbol '{symbol}' is not documented"
            })

    # Add obsolete documentation issues
    # Categorize as UNUSED_API if it looks like an API endpoint, otherwise DOCUMENTATION_OBSOLETE
    unused_api_count: int = 0
    for symbol in symbol_drift.get("obsolete", []):
        # Check if symbol looks like an API endpoint (starts with / or HTTP method)
        is_api_endpoint = (
            symbol.startswith('/') or 
            symbol.startswith('GET ') or 
            symbol.startswith('POST ') or 
            symbol.startswith('PUT ') or 
            symbol.startswith('PATCH ') or 
            symbol.startswith('DELETE ')
        )
        
        if is_api_endpoint:
            issues.append({
                "type": "UNUSED_API",
                "severity": "MINOR",
                "symbol": symbol,
                "description": f"API endpoint '{symbol}' is documented but not found in code"
            })
            unused_api_count += 1
        else:
            issues.append({
                "type": "DOCUMENTATION_OBSOLETE",
                "severity": "MINOR",
                "symbol": symbol,
                "description": f"Documentation references obsolete symbol '{symbol}'"
            })

    # Calculate severity summary counts
    severity_summary = {
        "CRITICAL": len(api_drift),
        "MAJOR": len(schema_drift),
        "MINOR": len(symbol_drift.get("undocumented", [])) - len(api_drift) - len(schema_drift) + len(symbol_drift.get("obsolete", []))
    }

    # Determine if drift was detected
    drift_detected = len(issues) > 0
    
    # Determine if Swagger sync is required
    swagger_sync_required = len(api_drift) > 0 or unused_api_count > 0

    # Build the complete report
    report = {
        "report_id": str(uuid.uuid4()),
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "repo": repo_metadata.get("repo", {}),
        "drift_detected": drift_detected,
        "drift_severity": severity if drift_detected else "NONE",
        "swagger_sync_required": swagger_sync_required,
        "severity_summary": severity_summary,
        "issues": issues,
        "validated_docs_bucket_path": docs_bucket_path,
        "statistics": {
            "total_code_symbols": len(symbol_drift.get("undocumented", [])) + len(api_drift) + len(schema_drift),
            "total_drift_issues": len(issues),
            "api_drift_count": len(api_drift),
            "schema_drift_count": len(schema_drift),
            "undocumented_count": len(symbol_drift.get("undocumented", [])),
            "obsolete_documentation_count": len(symbol_drift.get("obsolete", [])),
            "unused_api_count": unused_api_count
        }
    }

    # Add missing files information if any
    if missing_files:
        report["warnings"] = {
            "missing_documentation_files": missing_files,
            "message": "Some documentation files could not be retrieved from storage"
        }

    return report