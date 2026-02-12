"""
Test script for EPIC-3 Drift Detection Engine
Validates all components with sample data.
"""
import json
import os
import sys
import tempfile
import shutil
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from drift.code_index import load_code_index
from drift.doc_index import extract_symbols_from_markdown
from drift.comparators.symbol_drift import detect_symbol_drift
from drift.comparators.api_drift import detect_api_drift
from drift.comparators.schema_drift import detect_schema_drift
from drift.severity import assign_severity
from drift.report import build_drift_report


def test_code_index():
    """Test loading code index from impact report."""
    print("Testing code_index.py...")

    result = load_code_index("inputs/impact_report.json")
    assert "all_symbols" in result
    assert "api_symbols" in result
    assert "schema_symbols" in result

    all_symbols = result["all_symbols"]
    api_symbols = result["api_symbols"]

    print(f"  ✓ Loaded {len(all_symbols)} symbols")
    print(f"  ✓ Found {len(api_symbols)} API symbols")


def test_doc_index():
    """Test extracting symbols from markdown."""
    print("Testing doc_index.py...")

    symbols = extract_symbols_from_markdown("inputs/docs")
    print(f"  ✓ Extracted {len(symbols)} symbols from documentation")

    if symbols:
        print(f"  Sample symbols: {list(symbols)[:5]}")


def test_drift_detection():
    """Test drift detection logic."""
    print("Testing drift detection...")

    # Sample data
    code_symbols = {"create_user", "delete_user", "User", "update_profile"}
    doc_symbols = {"User", "admin_login"}
    api_symbols = {"create_user", "delete_user"}
    schema_symbols = {"User"}

    # Test symbol drift
    symbol_drift = detect_symbol_drift(code_symbols, doc_symbols)
    print(f"  ✓ Symbol drift: {len(symbol_drift['undocumented'])} undocumented, {len(symbol_drift['obsolete'])} obsolete")

    # Test API drift
    api_drift = detect_api_drift(api_symbols, doc_symbols)
    print(f"  ✓ API drift: {len(api_drift)} undocumented APIs")

    # Test schema drift
    schema_drift = detect_schema_drift(schema_symbols, doc_symbols)
    print(f"  ✓ Schema drift: {len(schema_drift)} undocumented schemas")

    # Test severity
    severity = assign_severity(api_drift, schema_drift, symbol_drift)
    print(f"  ✓ Severity: {severity}")

    return symbol_drift, api_drift, schema_drift, severity


def test_report_generation():
    """Test drift report generation."""
    print("Testing report generation...")

    symbol_drift, api_drift, schema_drift, severity = test_drift_detection()

    repo_metadata = {
        "repo": {
            "name": "test-repo",
            "branch": "main",
            "commit": "test123"
        }
    }

    report = build_drift_report(
        symbol_drift,
        api_drift,
        schema_drift,
        severity,
        repo_metadata,
        "test/path",
        None
    )

    # Validate report structure
    assert "report_id" in report
    assert "drift_detected" in report
    assert "overall_severity" in report
    assert "severity_summary" in report
    assert "issues" in report
    assert "validated_docs_bucket_path" in report
    assert "statistics" in report

    print(f"  ✓ Report ID: {report['report_id']}")
    print(f"  ✓ Drift detected: {report['drift_detected']}")
    print(f"  ✓ Overall severity: {report['overall_severity']}")
    print(f"  ✓ Total issues: {len(report['issues'])}")

    return report


def test_full_pipeline():
    """Test complete drift analysis pipeline."""
    print("Testing full pipeline...")

    from run_drift import run_drift_analysis

    # Create output directory
    os.makedirs("outputs", exist_ok=True)

    try:
        # Run analysis in local mode (no R2)
        report = run_drift_analysis(
            impact_report_path="inputs/impact_report.json",
            doc_snapshot_path="inputs/doc_snapshot.json",
            output_report_path="outputs/test_drift_report.json",
            use_r2_storage=False
        )

        print(f"  ✓ Pipeline completed successfully")
        print(f"  ✓ Report written to: outputs/test_drift_report.json")

        # Validate output file exists
        assert os.path.exists("outputs/test_drift_report.json")

        # Validate output is valid JSON
        with open("outputs/test_drift_report.json", "r") as f:
            output_report = json.load(f)

        assert "report_id" in output_report
        print(f"  ✓ Output validation passed")

    except Exception as e:
        print(f"  ✗ Pipeline test failed: {e}")
        raise


def main():
    """Run all tests."""
    print("=" * 60)
    print("EPIC-3 Drift Detection Engine - Test Suite")
    print("=" * 60)
    print()

    try:
        test_code_index()
        print()

        test_doc_index()
        print()

        test_drift_detection()
        print()

        test_report_generation()
        print()

        test_full_pipeline()
        print()

        print("=" * 60)
        print("✓ All tests passed!")
        print("=" * 60)

    except Exception as e:
        print()
        print("=" * 60)
        import traceback
        traceback.print_exc()
        print(f"✗ Tests failed: {e!r}")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    main()
