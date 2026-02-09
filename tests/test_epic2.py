#!/usr/bin/env python3
"""
EPIC-2 Documentation Generation Service Test Suite
Comprehensive tests validating all requirements from the EPIC-2 specification.
"""

import json
import os
import sys
import unittest
from unittest.mock import patch, MagicMock
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from sprint1.src import (
    loader,
    snapshot_writer,
    readme_generator,
    api_generator,
    adr_generator,
    diagram_generator,
    tree_generator
)
from sprint1.src.validator import (
    validate_impact_report_input,
    validate_doc_snapshot_schema,
    validate_mermaid_syntax,
    validate_adr_document,
    validate_readme_document
)
from backend.app import app as epic2_app


class TestInputValidation(unittest.TestCase):
    """Test input validation against EPIC-2 requirements."""
    
    def test_valid_new_schema_input(self):
        """Test validation of new schema format."""
        valid_input = {
            "repo": {"name": "test-repo", "branch": "main", "commit": "abc123"},
            "files": [],
            "severity": "MINOR",
            "intent_context": {}
        }
        is_valid, errors, warnings = validate_impact_report_input(valid_input)
        self.assertTrue(is_valid, f"Expected valid input, got errors: {errors}")
        self.assertEqual(len(errors), 0)
    
    def test_valid_legacy_schema_input(self):
        """Test validation of legacy schema format."""
        legacy_input = {
            "context": {
                "repository": "test-repo",
                "branch": "main",
                "commit_sha": "abc123",
                "author": "tester"
            },
            "changes": [],
            "analysis_summary": {}
        }
        is_valid, errors, warnings = validate_impact_report_input(legacy_input)
        self.assertTrue(is_valid, f"Expected valid input, got errors: {errors}")
        self.assertIn("Using legacy schema format", warnings[0])
    
    def test_reject_malformed_json(self):
        """Test that non-dict inputs are rejected."""
        is_valid, errors, _ = validate_impact_report_input([])
        self.assertFalse(is_valid)
        self.assertIn("Impact report must be a JSON object", errors)
    
    def test_reject_missing_required_fields(self):
        """Test rejection of input missing required fields."""
        invalid_input = {"some_field": "value"}
        is_valid, errors, _ = validate_impact_report_input(invalid_input)
        self.assertFalse(is_valid)
        self.assertTrue(any("repo" in e or "context" in e for e in errors))


class TestSnapshotWriter(unittest.TestCase):
    """Test doc_snapshot.json generation."""
    
    def get_sample_report(self):
        """Get a sample impact report for testing."""
        return {
            "context": {
                "repository": "test-repo",
                "branch": "main",
                "commit_sha": "abc12345",
                "author": "tester"
            },
            "changes": [
                {"file": "file1.py", "language": "python", "severity": "MINOR"}
            ],
            "analysis_summary": {
                "highest_severity": "MINOR",
                "breaking_changes_detected": False
            }
        }
    
    def test_snapshot_has_required_fields(self):
        """Test that generated snapshot has all required fields."""
        report = self.get_sample_report()
        generated_files = [
            {"path": "README.generated.md", "type": "markdown"},
            {"path": "api/api-reference.md", "type": "markdown"}
        ]
        
        snapshot_json = snapshot_writer.write_snapshot(
            report,
            project_id="proj_10234",
            commit_hash="63d36c2b",
            generated_at="2025-01-01T00:00:00Z",
            docs_bucket_path="proj_10234/63d36c2b/docs/",
            generated_files=generated_files,
            errors=[]
        )
        snapshot = json.loads(snapshot_json)
        
        # Check required top-level fields
        required_fields = ["snapshot_id", "project_id", "commit", "generated_at", "docs_bucket_path",
                          "generated_files", "documentation_health"]
        for field in required_fields:
            self.assertIn(field, snapshot, f"Missing required field: {field}")
    
    def test_snapshot_contract_fields(self):
        """Test project_id/commit and deterministic docs path contract."""
        report = self.get_sample_report()
        snapshot_json = snapshot_writer.write_snapshot(
            report,
            project_id="proj_10234",
            commit_hash="63d36c2b",
            generated_at="2025-01-01T00:00:00Z",
            docs_bucket_path="proj_10234/63d36c2b/docs/",
            generated_files=[],
            errors=[]
        )
        snapshot = json.loads(snapshot_json)

        self.assertEqual(snapshot["project_id"], "proj_10234")
        self.assertEqual(snapshot["commit"], "63d36c2b")
        self.assertEqual(snapshot["docs_bucket_path"], "proj_10234/63d36c2b/docs/")
    
    def test_documentation_health_structure(self):
        """Test documentation_health has required fields."""
        report = self.get_sample_report()
        snapshot_json = snapshot_writer.write_snapshot(
            report,
            project_id="proj_10234",
            commit_hash="63d36c2b",
            generated_at="2025-01-01T00:00:00Z",
            docs_bucket_path="proj_10234/63d36c2b/docs/",
            generated_files=[],
            errors=[]
        )
        snapshot = json.loads(snapshot_json)
        
        health = snapshot.get("documentation_health", {})
        self.assertIn("missing_sections", health)
        self.assertIn("template_followed", health)
    
    def test_generated_files_format(self):
        """Test that generated_files uses 'file' key."""
        report = self.get_sample_report()
        generated_files = [
            {"path": "README.generated.md", "type": "markdown", "description": "Test"}
        ]
        
        snapshot_json = snapshot_writer.write_snapshot(
            report,
            project_id="proj_10234",
            commit_hash="63d36c2b",
            generated_at="2025-01-01T00:00:00Z",
            docs_bucket_path="proj_10234/63d36c2b/docs/",
            generated_files=generated_files,
            errors=[]
        )
        snapshot = json.loads(snapshot_json)
        
        for file_entry in snapshot.get("generated_files", []):
            self.assertIn("file", file_entry, "Missing 'file' key in generated_files entry")
            self.assertIn("type", file_entry, "Missing 'type' key in generated_files entry")


class TestReadmeGenerator(unittest.TestCase):
    """Test README generation."""
    
    def get_sample_report(self):
        return {
            "context": {
                "repository": "test-repo",
                "branch": "main",
                "commit_sha": "abc12345",
                "author": "tester"
            },
            "changes": [
                {"file": "file1.py", "language": "python", "severity": "MINOR"},
                {"file": "file2.js", "language": "javascript", "severity": "MAJOR"}
            ],
            "analysis_summary": {
                "highest_severity": "MAJOR",
                "breaking_changes_detected": True
            }
        }
    
    def test_readme_has_required_sections(self):
        """Test that README has all required sections."""
        report = self.get_sample_report()
        readme = readme_generator.generate_readme(report, "2025-01-01T00:00:00Z")
        
        is_valid, errors, missing = validate_readme_document(readme)
        self.assertTrue(is_valid, f"README missing sections: {missing}")
    
    def test_readme_handles_none_language(self):
        """Test README handles None language values."""
        report = {
            "context": {"repository": "test", "branch": "main", "commit_sha": "abc"},
            "changes": [{"file": "test.bin", "language": None, "severity": "PATCH"}],
            "analysis_summary": {}
        }
        
        # Should not raise
        readme = readme_generator.generate_readme(report)
        self.assertIn("Other/Unknown", readme)


class TestApiGenerator(unittest.TestCase):
    """Test API documentation generation."""
    
    def test_handles_dict_endpoints(self):
        """Test that dict endpoints are handled properly."""
        report = {
            "changes": [
                {
                    "file": "routes.js",
                    "language": "javascript",
                    "features": {
                        "api_endpoints": [
                            {"verb": "GET", "route": "/api/users", "line": 10},
                            "POST /api/login"
                        ]
                    }
                }
            ]
        }
        
        # Should not raise
        docs = api_generator.generate_api_docs(report)
        self.assertIn("GET /api/users", docs)
        self.assertIn("POST /api/login", docs)
    
    def test_handles_empty_endpoints(self):
        """Test handling of no API endpoints."""
        report = {"changes": []}
        docs = api_generator.generate_api_docs(report)
        self.assertIn("No API endpoints detected", docs)

    def test_normalizes_concatenated_java_routes(self):
        """Test repair of concatenated controller + method route strings."""
        report = {
            "changes": [
                {
                    "file": "backend/src/main/java/com/exl/quizapp/controller/QuestionController.java",
                    "language": "java",
                    "features": {
                        "api_endpoints": [
                            {"verb": "GET", "route": "questionmy-questions"},
                            {"verb": "POST", "route": "questionadd"}
                        ]
                    }
                }
            ]
        }
        docs = api_generator.generate_api_docs(report)
        self.assertIn("GET /question/my-questions", docs)
        self.assertIn("POST /question/add", docs)

    def test_replaces_placeholder_text_with_inferred_metadata(self):
        report = {
            "changes": [
                {
                    "file": "Back/routes/addressRoutes.js",
                    "language": "javascript",
                    "features": {
                        "api_endpoints": [
                            {"verb": "PATCH", "route": "/:id/default"}
                        ]
                    }
                }
            ]
        }
        docs = api_generator.generate_api_docs(report)
        self.assertNotIn("Not detected in impact report", docs)
        self.assertNotIn("Detected API endpoint from impact analysis of code changes.", docs)
        self.assertIn("Path params: id", docs)
        self.assertIn("curl -X PATCH", docs)


class TestAdrGenerator(unittest.TestCase):
    """Test ADR generation."""
    
    def get_sample_report(self):
        return {
            "context": {"repository": "test", "branch": "main", "commit_sha": "abc"},
            "analysis_summary": {"highest_severity": "MAJOR"},
            "changes": []
        }
    
    def test_adr_has_required_sections(self):
        """Test ADR has all required sections."""
        report = self.get_sample_report()
        adr = adr_generator.generate_adr(report, generated_at="2025-01-01")
        
        is_valid, errors, missing = validate_adr_document(adr)
        self.assertTrue(is_valid, f"ADR missing sections: {missing}")


class TestDiagramGenerator(unittest.TestCase):
    """Test Mermaid diagram generation."""
    
    def test_system_diagram_valid(self):
        """Test system diagram has valid Mermaid syntax."""
        diagram = diagram_generator.system_diagram()
        is_valid, errors = validate_mermaid_syntax(diagram, "system")
        self.assertTrue(is_valid, f"System diagram errors: {errors}")
    
    def test_sequence_diagram_valid(self):
        """Test sequence diagram has valid Mermaid syntax."""
        diagram = diagram_generator.sequence_diagram()
        is_valid, errors = validate_mermaid_syntax(diagram, "sequence")
        self.assertTrue(is_valid, f"Sequence diagram errors: {errors}")
    
    def test_er_diagram_valid(self):
        """Test ER diagram has valid Mermaid syntax."""
        diagram = diagram_generator.er_diagram()
        is_valid, errors = validate_mermaid_syntax(diagram, "er")
        self.assertTrue(is_valid, f"ER diagram errors: {errors}")


class TestTreeGenerator(unittest.TestCase):
    """Test file tree generation."""
    
    def test_generates_tree_structure(self):
        """Test tree generator produces output."""
        report = {
            "changes": [
                {"file": "src/main.py"},
                {"file": "src/utils/helpers.py"},
                {"file": "tests/test_main.py"}
            ]
        }
        
        tree = tree_generator.generate_tree(report)
        self.assertIn("src", tree)
        self.assertIn("main.py", tree)


class TestLoader(unittest.TestCase):
    """Test impact report loader."""
    
    def test_normalizes_report(self):
        """Test that loader normalizes report structure."""
        # Create a minimal report
        report = {
            "context": {"repository": "test"},
            "changes": []
        }
        
        # Save to temp file and load
        import tempfile
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            json.dump(report, f)
            temp_path = f.name
        
        try:
            result = loader.load_impact_report(temp_path)
            # Handle both tuple and dict return types
            if isinstance(result, tuple):
                loaded = result[0]
            else:
                loaded = result
            self.assertIn("context", loaded)
            self.assertIn("repository", loaded["context"])
        finally:
            os.unlink(temp_path)


class TestDocSnapshotSchema(unittest.TestCase):
    """Test doc_snapshot.json schema validation."""
    
    def test_valid_snapshot_passes(self):
        """Test that valid snapshot passes validation."""
        valid_snapshot = {
            "snapshot_id": "test123",
            "project_id": "proj_10234",
            "commit": "abc",
            "generated_at": "2025-01-01T00:00:00Z",
            "docs_bucket_path": "proj_10234/abc/docs/",
            "generated_files": [{"file": "README.md", "type": "markdown"}],
            "documentation_health": {
                "missing_sections": [],
                "template_followed": True
            }
        }
        
        is_valid, errors = validate_doc_snapshot_schema(valid_snapshot)
        self.assertTrue(is_valid, f"Valid snapshot failed: {errors}")
    
    def test_missing_required_field_fails(self):
        """Test that missing fields are caught."""
        invalid_snapshot = {
            "snapshot_id": "test123"
            # missing everything else
        }
        
        is_valid, errors = validate_doc_snapshot_schema(invalid_snapshot)
        self.assertFalse(is_valid)
        self.assertTrue(len(errors) > 0)


class TestBackendIntegrationContract(unittest.TestCase):
    """Test API contract compatibility with centralized orchestrator inputs."""

    def setUp(self):
        self.client = epic2_app.test_client()

    def test_missing_project_id_returns_validation_error(self):
        response = self.client.post(
            "/generate-docs",
            json={"commit_hash": "63d36c2b", "impact_report": {"context": {}, "changes": []}}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("project_id", response.get_json().get("error", ""))

    @patch("backend.app.subprocess.run")
    def test_propagates_project_and_commit_to_runner(self, mock_run):
        mock_result = MagicMock()
        mock_result.returncode = 0
        mock_result.stdout = "ok"
        mock_result.stderr = ""
        mock_run.return_value = mock_result

        os.makedirs("sprint1/artifacts/docs", exist_ok=True)
        with open("sprint1/artifacts/docs/doc_snapshot.json", "w", encoding="utf-8") as f:
            json.dump(
                {
                    "snapshot_id": "id",
                    "project_id": "proj_10234",
                    "commit": "63d36c2b",
                    "docs_bucket_path": "proj_10234/63d36c2b/docs/",
                    "generated_files": [],
                    "generated_at": "2025-01-01T00:00:00Z",
                    "documentation_health": {"missing_sections": [], "template_followed": True}
                },
                f
            )

        payload = {
            "project_id": "proj_10234",
            "commit_hash": "63d36c2b",
            "impact_report": {
                "context": {"repository": "repo", "commit_sha": "old"},
                "changes": [],
                "analysis_summary": {}
            }
        }
        response = self.client.post("/generate-docs", json=payload)

        self.assertEqual(response.status_code, 200)
        _, kwargs = mock_run.call_args
        self.assertEqual(kwargs["env"]["PROJECT_ID"], "proj_10234")
        self.assertEqual(kwargs["env"]["COMMIT_HASH"], "63d36c2b")


if __name__ == "__main__":
    print("=" * 60)
    print("EPIC-2 Documentation Generation Service Test Suite")
    print("=" * 60)
    
    # Run with verbosity
    unittest.main(verbosity=2)
