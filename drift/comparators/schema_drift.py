from typing import Set, List


def detect_schema_drift(schema_symbols: Set[str], doc_symbols: Set[str]) -> List[str]:
    """
    Detect schema symbols that are not documented.
    
    Args:
        schema_symbols: Set of schema symbols from code
        doc_symbols: Set of symbols found in documentation
        
    Returns:
        Sorted list of schema symbols that are undocumented
    """
    undocumented_schema = schema_symbols - doc_symbols
    
    return sorted(undocumented_schema)