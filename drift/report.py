from typing import List, Dict, Any


def build_drift_report(
    symbol_drift: Dict[str, List[str]],
    api_drift: List[str],
    schema_drift: List[str],
    severity: str
) -> Dict[str, Any]:
    """
    Build a comprehensive drift report.
    
    Args:
        symbol_drift: Dictionary with "undocumented" and "obsolete" lists
        api_drift: List of undocumented API symbols
        schema_drift: List of undocumented schema symbols
        severity: Severity level string
        
    Returns:
        Dictionary containing all drift information and severity
    """
    return {
        "symbol_drift": symbol_drift,
        "api_drift": api_drift,
        "schema_drift": schema_drift,
        "severity": severity
    }