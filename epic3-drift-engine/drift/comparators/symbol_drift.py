from typing import Set, List, Dict


def detect_symbol_drift(code_symbols: Set[str], doc_symbols: Set[str]) -> Dict[str, List[str]]:
    """
    Detect drift between code symbols and documentation symbols.
    
    Args:
        code_symbols: Set of symbols found in code
        doc_symbols: Set of symbols found in documentation
        
    Returns:
        Dictionary containing:
        - undocumented: sorted list of symbols in code but not in docs
        - obsolete: sorted list of symbols in docs but not in code
    """
    undocumented = code_symbols - doc_symbols
    obsolete = doc_symbols - code_symbols
    
    return {
        "undocumented": sorted(undocumented),
        "obsolete": sorted(obsolete)
    }