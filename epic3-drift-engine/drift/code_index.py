import json
from typing import Dict, Set, Any


def load_code_index(path_to_impact_report: str) -> Dict[str, Set[str]]:
    """
    Load a code index from an impact report JSON file.

    Args:
        path_to_impact_report: Path to the JSON impact report file

    Returns:
        Dictionary containing:
        - all_symbols: set of all symbols
        - api_symbols: set of symbols from files with API_IMPACT
        - schema_symbols: set of symbols from files with SCHEMA_CHANGE
    """
    all_symbols: Set[str] = set()
    api_symbols: Set[str] = set()
    schema_symbols: Set[str] = set()

    try:
        with open(path_to_impact_report, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError, IOError):
        return {
            'all_symbols': all_symbols,
            'api_symbols': api_symbols,
            'schema_symbols': schema_symbols
        }

    if not isinstance(data, dict):
        return {
            'all_symbols': all_symbols,
            'api_symbols': api_symbols,
            'schema_symbols': schema_symbols
        }

    files = data.get('files', [])
    if not isinstance(files, list):
        files = []

    for file_entry in files:
        if not isinstance(file_entry, dict):
            continue

        # Support both 'impacts' (Epic-1 standard) and 'flags' (legacy)
        impacts = file_entry.get('impacts', file_entry.get('flags', []))
        if not isinstance(impacts, list):
            impacts = []

        symbols = file_entry.get('symbols', [])
        if not isinstance(symbols, list):
            symbols = []

        has_api_impact = 'API_IMPACT' in impacts
        has_schema_change = 'SCHEMA_CHANGE' in impacts

        for symbol in symbols:
            if isinstance(symbol, str):
                all_symbols.add(symbol)

                if has_api_impact:
                    api_symbols.add(symbol)

                if has_schema_change:
                    schema_symbols.add(symbol)

    return {
        'all_symbols': all_symbols,
        'api_symbols': api_symbols,
        'schema_symbols': schema_symbols
    }