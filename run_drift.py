import json
from drift.code_index import load_code_index
from drift.doc_index import extract_symbols_from_markdown
from drift.comparators.symbol_drift import detect_symbol_drift
from drift.comparators.api_drift import detect_api_drift
from drift.comparators.schema_drift import detect_schema_drift
from drift.severity import assign_severity
from drift.report import build_drift_report



def main():
    """
    Main function to run drift analysis.
    """
    # Load code symbols from impact report
    code_data = load_code_index("inputs/impact_report.json")
    all_symbols = code_data["all_symbols"]
    api_symbols = code_data["api_symbols"]
    schema_symbols = code_data["schema_symbols"]
    
    # Load documentation symbols
    doc_symbols = extract_symbols_from_markdown("inputs/docs")
    
    # Detect various types of drift
    symbol_drift_result = detect_symbol_drift(all_symbols, doc_symbols)
    api_drift_result = detect_api_drift(api_symbols, doc_symbols)
    schema_drift_result = detect_schema_drift(schema_symbols, doc_symbols)
    
    # Assign severity level
    severity_level = assign_severity(
        api_drift_result,
        schema_drift_result,
        symbol_drift_result
    )
    
    # Build final report
    drift_report = build_drift_report(
        symbol_drift_result,
        api_drift_result,
        schema_drift_result,
        severity_level
    )
    
    # Print report as pretty JSON
    print(json.dumps(drift_report, indent=2))


if __name__ == "__main__":
    main()