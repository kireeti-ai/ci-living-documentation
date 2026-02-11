from typing import List, Dict


def assign_severity(api_drift: List[str], schema_drift: List[str], symbol_drift: Dict[str, List[str]]) -> str:
    """
    Assign severity level based on detected drift.
    
    Severity classification:
    - CRITICAL: Breaking API changes (undocumented endpoints)
    - MAJOR: Schema/data model drift
    - MINOR: Obsolete documentation or minor symbol drift
    - NONE: No drift detected

    Args:
        api_drift: List of undocumented API symbols
        schema_drift: List of undocumented schema symbols
        symbol_drift: Dictionary with "undocumented" and "obsolete" lists

    Returns:
        Severity level: "CRITICAL", "MAJOR", "MINOR", or "NONE"
    """
    # Breaking API changes are CRITICAL
    if api_drift:
        return "CRITICAL"

    # Schema/data model changes are MAJOR
    if schema_drift:
        return "MAJOR"

    # Obsolete documentation or minor symbol drift is MINOR
    undocumented = symbol_drift.get("undocumented", [])
    obsolete = symbol_drift.get("obsolete", [])

    if undocumented or obsolete:
        return "MINOR"

    return "NONE"