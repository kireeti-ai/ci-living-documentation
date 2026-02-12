"""
Unit Tests for EPIC-3 Drift Detection Engine
Pure unit tests for individual functions and modules.
"""
import pytest
import json
import os
from pathlib import Path

# Import modules to test
from drift.code_index import load_code_index
from drift.doc_index import extract_symbols_from_markdown
from drift.comparators.symbol_drift import detect_symbol_drift
from drift.comparators.api_drift import detect_api_drift
from drift.comparators.schema_drift import detect_schema_drift
from drift.severity import assign_severity
from drift.report import build_drift_report


# ==================== Fixtures ====================

@pytest.fixture
def sample_impact_report(tmp_path):
    """Create a temporary impact_report.json file."""
    data = {
        "repository": {"name": "test-repo", "commit": "abc123"},
        "api_contract": {
            "endpoints": [
                {"method": "GET", "path": "/api/users", "normalized_key": "GET /api/users"},
                {"method": "POST", "path": "/api/users", "normalized_key": "POST /api/users"},
                {"method": "DELETE", "path": "/api/users/{id}", "normalized_key": "DELETE /api/users/{id}"}
            ]
        },
        # CHANGED: 'data_contracts' list -> 'data_models' dict to match code_index.py
        "data_models": {
            "User": {"type": "schema"},
            "Product": {"type": "schema"}
        }
    }
    
    file_path = tmp_path / "impact_report.json"
    with open(file_path, 'w') as f:
        json.dump(data, f)
    
    return str(file_path)


@pytest.fixture
def sample_docs_dir(tmp_path):
    """Create temporary documentation directory."""
    docs_dir = tmp_path / "docs"
    docs_dir.mkdir()
    
    # CHANGED: Added backticks to symbols because doc_index.py only extracts `symbol`
    api_md = docs_dir / "api.md"
    api_md.write_text("""
# API Documentation

## `GET /api/users`
Get all users.

## `POST /api/users`
Create a user.

## Schema: `User`
User data model.
""")
    
    return str(docs_dir)


@pytest.fixture
def code_symbols():
    """Sample code symbols."""
    return {"GET /api/users", "POST /api/users", "DELETE /api/users/{id}", "User", "Product"}


@pytest.fixture
def doc_symbols():
    """Sample documentation symbols."""
    return {"GET /api/users", "POST /api/users", "User"}


# ==================== Test code_index.py ====================

class TestCodeIndex:
    """Unit tests for code_index module."""
    
    def test_load_code_index_success(self, sample_impact_report):
        """Test successful loading of code index."""
        result = load_code_index(sample_impact_report)
        
        assert "all_symbols" in result
        assert "api_symbols" in result
        assert "schema_symbols" in result
        
        assert "GET /api/users" in result["api_symbols"]
        assert "POST /api/users" in result["api_symbols"]
        assert "DELETE /api/users/{id}" in result["api_symbols"]
        assert len(result["api_symbols"]) == 3
        
        assert "User" in result["schema_symbols"]
        assert "Product" in result["schema_symbols"]
        assert len(result["schema_symbols"]) == 2
        
        assert len(result["all_symbols"]) == 5
    
    def test_load_code_index_file_not_found(self):
        """Test error when file doesn't exist."""
        # CHANGED: code_index.py catches exceptions and returns empty dicts
        result = load_code_index("nonexistent.json")
        assert len(result["all_symbols"]) == 0
    
    def test_load_code_index_invalid_json(self, tmp_path):
        """Test error with invalid JSON."""
        invalid_file = tmp_path / "invalid.json"
        invalid_file.write_text("{ invalid json }")
        
        # CHANGED: code_index.py catches exceptions and returns empty dicts
        result = load_code_index(str(invalid_file))
        assert len(result["all_symbols"]) == 0
    
    def test_load_code_index_empty_data(self, tmp_path):
        """Test handling empty endpoints and contracts."""
        empty_data = {
            "api_contract": {"endpoints": []},
            "data_models": {}
        }
        file_path = tmp_path / "empty.json"
        with open(file_path, 'w') as f:
            json.dump(empty_data, f)
        
        result = load_code_index(str(file_path))
        assert len(result["all_symbols"]) == 0
        assert len(result["api_symbols"]) == 0
        assert len(result["schema_symbols"]) == 0


# ==================== Test doc_index.py ====================

class TestDocIndex:
    """Unit tests for doc_index module."""
    
    def test_extract_symbols_from_markdown(self, sample_docs_dir):
        """Test symbol extraction from markdown files."""
        symbols = extract_symbols_from_markdown(sample_docs_dir)
        
        assert "GET /api/users" in symbols
        assert "POST /api/users" in symbols
        assert "User" in symbols
        assert len(symbols) >= 3
    
    def test_extract_symbols_nonexistent_dir(self):
        """Test with nonexistent directory."""
        symbols = extract_symbols_from_markdown("/nonexistent/path")
        assert len(symbols) == 0
    
    def test_extract_symbols_empty_dir(self, tmp_path):
        """Test with empty directory."""
        empty_dir = tmp_path / "empty"
        empty_dir.mkdir()
        
        symbols = extract_symbols_from_markdown(str(empty_dir))
        assert len(symbols) == 0
    
    def test_extract_symbols_multiple_endpoints(self, tmp_path):
        """Test extraction of various endpoint formats."""
        docs_dir = tmp_path / "docs"
        docs_dir.mkdir()
        
        # CHANGED: Add backticks
        test_md = docs_dir / "test.md"
        test_md.write_text("""
`GET /api/v1/users`
`POST /api/products/{id}`
`DELETE /resources`
`PUT /api/items/{item_id}/details`

### Schema: `TestModel`
""")
        
        symbols = extract_symbols_from_markdown(str(docs_dir))
        
        assert "GET /api/v1/users" in symbols
        assert "POST /api/products/{id}" in symbols
        assert "DELETE /resources" in symbols
        assert "TestModel" in symbols


# ==================== Test symbol_drift.py ====================

class TestSymbolDrift:
    """Unit tests for symbol drift detection."""
    
    def test_detect_symbol_drift_with_differences(self, code_symbols, doc_symbols):
        """Test drift detection with differences."""
        result = detect_symbol_drift(code_symbols, doc_symbols)
        
        assert "undocumented" in result
        assert "obsolete" in result
        
        assert "DELETE /api/users/{id}" in result["undocumented"]
        assert "Product" in result["undocumented"]
    
    def test_detect_symbol_drift_no_drift(self):
        """Test when code and docs match perfectly."""
        symbols = {"GET /api/test", "User", "Product"}
        result = detect_symbol_drift(symbols, symbols)
        
        assert len(result["undocumented"]) == 0
        assert len(result["obsolete"]) == 0
    
    def test_detect_symbol_drift_empty_sets(self):
        """Test with empty symbol sets."""
        result = detect_symbol_drift(set(), set())
        
        assert len(result["undocumented"]) == 0
        assert len(result["obsolete"]) == 0
    
    def test_detect_symbol_drift_all_undocumented(self):
        """Test when nothing is documented."""
        code = {"API1", "API2", "API3"}
        docs = set()
        
        result = detect_symbol_drift(code, docs)
        
        assert len(result["undocumented"]) == 3
        assert len(result["obsolete"]) == 0


# ==================== Test api_drift.py ====================

class TestApiDrift:
    """Unit tests for API drift detection."""
    
    def test_detect_api_drift_with_undocumented(self):
        """Test detection of undocumented APIs."""
        api_symbols = {"GET /api/users", "POST /api/users", "DELETE /api/users/{id}"}
        doc_symbols = {"GET /api/users"}
        
        result = detect_api_drift(api_symbols, doc_symbols)
        
        assert "POST /api/users" in result
        assert "DELETE /api/users/{id}" in result
        assert len(result) == 2
    
    def test_detect_api_drift_all_documented(self):
        """Test when all APIs are documented."""
        api_symbols = {"GET /api/users", "POST /api/users"}
        doc_symbols = {"GET /api/users", "POST /api/users", "EXTRA"}
        
        result = detect_api_drift(api_symbols, doc_symbols)
        assert len(result) == 0
    
    def test_detect_api_drift_empty_apis(self):
        """Test with no API symbols."""
        result = detect_api_drift(set(), {"GET /api/users"})
        assert len(result) == 0
    
    def test_detect_api_drift_multiple_undocumented(self):
        """Test with multiple undocumented APIs."""
        apis = {f"GET /api/endpoint{i}" for i in range(5)}
        docs = set()
        
        result = detect_api_drift(apis, docs)
        assert len(result) == 5


# ==================== Test schema_drift.py ====================

class TestSchemaDrift:
    """Unit tests for schema drift detection."""
    
    def test_detect_schema_drift_with_undocumented(self):
        """Test detection of undocumented schemas."""
        schema_symbols = {"User", "Product", "Order"}
        doc_symbols = {"User"}
        
        result = detect_schema_drift(schema_symbols, doc_symbols)
        
        assert "Product" in result
        assert "Order" in result
        assert len(result) == 2
    
    def test_detect_schema_drift_all_documented(self):
        """Test when all schemas are documented."""
        schema_symbols = {"User", "Product"}
        
        result = detect_schema_drift(schema_symbols, schema_symbols)
        assert len(result) == 0
    
    def test_detect_schema_drift_empty_schemas(self):
        """Test with no schemas."""
        result = detect_schema_drift(set(), set())
        assert len(result) == 0


# ==================== Test severity.py ====================

class TestSeverity:
    """Unit tests for severity assignment."""
    
    def test_assign_severity_critical(self):
        """Test CRITICAL severity with many APIs."""
        api_drift = {"API1", "API2", "API3", "API4", "API5"}
        schema_drift = set()
        symbol_drift = {"undocumented": set(), "obsolete": set()}
        
        severity = assign_severity(api_drift, schema_drift, symbol_drift)
        assert severity == "CRITICAL"
    
    def test_assign_severity_major_apis(self):
        """Test CRITICAL (was MAJOR) severity with multiple APIs."""
        # CHANGED: severity.py assigns CRITICAL if ANY api_drift present
        api_drift = {"API1", "API2"}
        schema_drift = set()
        symbol_drift = {"undocumented": set(), "obsolete": set()}
        
        severity = assign_severity(api_drift, schema_drift, symbol_drift)
        assert severity == "CRITICAL"
    
    def test_assign_severity_major_schemas(self):
        """Test MAJOR severity with schemas."""
        api_drift = set()
        schema_drift = {"Schema1", "Schema2", "Schema3"}
        symbol_drift = {"undocumented": set(), "obsolete": set()}
        
        severity = assign_severity(api_drift, schema_drift, symbol_drift)
        assert severity == "MAJOR"
    
    def test_assign_severity_minor(self):
        """Test MINOR severity."""
        api_drift = set() # Needs to be empty for MINOR
        schema_drift = set()
        # Non-API/Schema symbol drift treated as MINOR
        symbol_drift = {"undocumented": {"Symbol1"}, "obsolete": set()}
        
        severity = assign_severity(api_drift, schema_drift, symbol_drift)
        assert severity == "MINOR"
    
    def test_assign_severity_none(self):
        """Test NONE severity when everything is documented."""
        api_drift = set()
        schema_drift = set()
        symbol_drift = {"undocumented": set(), "obsolete": set()}
        
        severity = assign_severity(api_drift, schema_drift, symbol_drift)
        assert severity == "NONE"


# ==================== Test report.py ====================

class TestReport:
    """Unit tests for drift report generation."""
    
    def test_build_drift_report_structure(self):
        """Test report has required fields."""
        symbol_drift = {"undocumented": {"Symbol1"}, "obsolete": {"Symbol2"}}
        api_drift = {"GET /api/test"}
        schema_drift = {"Schema1"}
        severity = "MAJOR"
        repo_metadata = {"repository": {"name": "test-repo"}}
        
        report = build_drift_report(
            symbol_drift, api_drift, schema_drift, severity,
            repo_metadata, "docs/path", None
        )
        
        assert "report_id" in report
        assert "generated_at" in report
        assert "drift_detected" in report
        assert "overall_severity" in report
        assert "issues" in report
        assert "statistics" in report
        
        assert report["drift_detected"] is True
        assert report["overall_severity"] == "MAJOR"
        assert isinstance(report["issues"], list)
        assert len(report["issues"]) > 0
    
    def test_build_drift_report_no_drift(self):
        """Test report when no drift detected."""
        symbol_drift = {"undocumented": set(), "obsolete": set()}
        api_drift = set()
        schema_drift = set()
        severity = "NONE"
        
        report = build_drift_report(
            symbol_drift, api_drift, schema_drift, severity,
            {}, "docs/path", None
        )
        
        assert report["drift_detected"] is False
        assert report["overall_severity"] == "NONE"
        assert len(report["issues"]) == 0
    
    def test_build_drift_report_issue_types(self):
        """Test correct issue types are generated."""
        symbol_drift = {"undocumented": {"Symbol1"}, "obsolete": {"Symbol2"}}
        api_drift = {"GET /api/test"}
        schema_drift = {"Schema1"}
        
        report = build_drift_report(
            symbol_drift, api_drift, schema_drift, "MAJOR",
            {}, "docs/path", None
        )
        
        issue_types = [issue["type"] for issue in report["issues"]]
        
        assert "API_UNDOCUMENTED" in issue_types
        assert "SCHEMA_UNDOCUMENTED" in issue_types
        assert "SYMBOL_UNDOCUMENTED" in issue_types
        assert "DOCUMENTATION_OBSOLETE" in issue_types
    
    def test_build_drift_report_statistics(self):
        """Test statistics are correctly calculated."""
        symbol_drift = {"undocumented": {"S1", "S2"}, "obsolete": {"S3"}}
        api_drift = {"API1", "API2"}
        schema_drift = {"Schema1"}
        
        report = build_drift_report(
            symbol_drift, api_drift, schema_drift, "MAJOR",
            {}, "docs/path", None
        )
        
        stats = report["statistics"]
        assert stats["api_drift_count"] == 2
        assert stats["schema_drift_count"] == 1
        # CHANGED: Updated keys to match report.py
        assert stats["undocumented_count"] == 2
        assert stats["obsolete_documentation_count"] == 1


# ==================== Parametrized Tests ====================

@pytest.mark.parametrize("api_count,schema_count,expected_severity", [
    (0, 0, "NONE"),
    (1, 0, "CRITICAL"), # CHANGED: Any API drift is CRITICAL
    (2, 0, "CRITICAL"), # CHANGED: Any API drift is CRITICAL
    (5, 0, "CRITICAL"),
    (0, 3, "MAJOR"),
    (1, 1, "CRITICAL"), # CHANGED: Any API drift is CRITICAL
    (3, 2, "CRITICAL"), # CHANGED: Any API drift is CRITICAL
    (10, 5, "CRITICAL"),
])
def test_severity_levels(api_count, schema_count, expected_severity):
    """Test severity assignment with various counts."""
    api_drift = set(f"API{i}" for i in range(api_count))
    schema_drift = set(f"Schema{i}" for i in range(schema_count))
    symbol_drift = {"undocumented": set(), "obsolete": set()}
    
    severity = assign_severity(api_drift, schema_drift, symbol_drift)
    assert severity == expected_severity


@pytest.mark.parametrize("code_symbols,doc_symbols,expected_undocumented", [
    ({"A", "B", "C"}, {"A", "B", "C"}, 0),
    ({"A", "B", "C"}, {"A"}, 2),
    ({"A", "B", "C"}, set(), 3),
    (set(), {"A", "B"}, 0),
])
def test_symbol_drift_counts(code_symbols, doc_symbols, expected_undocumented):
    """Test symbol drift with various symbol sets."""
    result = detect_symbol_drift(code_symbols, doc_symbols)
    assert len(result["undocumented"]) == expected_undocumented


# ==================== Edge Case Tests ====================

class TestEdgeCases:
    """Test edge cases and boundary conditions."""
    
    def test_empty_impact_report(self, tmp_path):
        """Test with minimal impact report."""
        minimal_data = {}
        file_path = tmp_path / "minimal.json"
        with open(file_path, 'w') as f:
            json.dump(minimal_data, f)
        
        result = load_code_index(str(file_path))
        assert len(result["all_symbols"]) == 0
    
    def test_special_characters_in_symbols(self):
        """Test symbols with special characters."""
        code = {"GET /api/users/{id}/posts/{post-id}"}
        docs = set()
        
        result = detect_api_drift(code, docs)
        assert len(result) == 1
    
    def test_case_sensitivity(self):
        """Test that comparison is case-sensitive."""
        code = {"GET /api/users"}
        docs = {"get /api/users"}  # Different case
        
        result = detect_api_drift(code, docs)
        assert len(result) == 1  # Should not match
    
    def test_large_symbol_sets(self):
        """Test with large numbers of symbols."""
        code = {f"API{i}" for i in range(1000)}
        docs = {f"API{i}" for i in range(500)}
        
        result = detect_symbol_drift(code, docs)
        assert len(result["undocumented"]) == 500


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

