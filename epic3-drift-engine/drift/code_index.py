import json
from typing import Dict, Set, Any


def load_code_index(path_to_impact_report: str) -> Dict[str, Set[str]]:
    """
    Load a code index from an impact report JSON file.
    
    Extracts API endpoints from api_contract.endpoints and schema symbols from data models.

    Args:
        path_to_impact_report: Path to the JSON impact report file

    Returns:
        Dictionary containing:
        - all_symbols: set of all symbols (API endpoints + schemas)
        - api_symbols: set of API endpoint identifiers
        - schema_symbols: set of data model/schema identifiers
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

    # Extract API endpoints from api_contract.endpoints (Epic-1 standard format)
    api_contract = data.get('api_contract', {})
    if isinstance(api_contract, dict):
        endpoints = api_contract.get('endpoints', [])
        if isinstance(endpoints, list):
            for endpoint in endpoints:
                if not isinstance(endpoint, dict):
                    continue
                
                # Use normalized_key as the primary identifier
                if 'normalized_key' in endpoint:
                    api_key = endpoint['normalized_key']
                    api_symbols.add(api_key)
                    all_symbols.add(api_key)
                # Fallback to method + path
                elif 'method' in endpoint and 'path' in endpoint:
                    api_key = f"{endpoint['method']} {endpoint['path']}"
                    api_symbols.add(api_key)
                    all_symbols.add(api_key)
    
    # Extract schema symbols from data models (if present)
    data_models = data.get('data_models', {})
    if isinstance(data_models, dict):
        for model_name in data_models.keys():
            schema_symbols.add(model_name)
            all_symbols.add(model_name)
    
    # Legacy support: Extract from files array if present
    files = data.get('files', [])
    if isinstance(files, list):
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