from typing import Set, List


def detect_api_drift(api_symbols: Set[str], doc_symbols: Set[str]) -> List[str]:
    """
    Detect API symbols that are not documented.
    
    Args:
        api_symbols: Set of API symbols from code
        doc_symbols: Set of symbols found in documentation
        
    Returns:
        Sorted list of API symbols that are undocumented
    """
    undocumented_api = api_symbols - doc_symbols
    
    return sorted(undocumented_api)