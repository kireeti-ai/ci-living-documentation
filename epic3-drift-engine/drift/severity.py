from typing import List, Dict


def assign_severity(api_drift: List[str], schema_drift: List[str], symbol_drift: Dict[str, List[str]]) -> str:
    """
    Assign severity level based on detected drift.

    Args:
        api_drift: List of undocumented API symbols
        schema_drift: List of undocumented schema symbols
        symbol_drift: Dictionary with "undocumented" and "obsolete" lists

    Returns:
        Severity level: "MAJOR", "MINOR", "PATCH", or "NONE"
    """
    if api_drift:
        return "MAJOR"

    if schema_drift:
        return "MINOR"

    undocumented = symbol_drift.get("undocumented", [])
    obsolete = symbol_drift.get("obsolete", [])

    if undocumented or obsolete:
        return "PATCH"

    return "NONE"