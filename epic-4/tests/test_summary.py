import unittest
import os
import json
import tempfile
import shutil
from epic4.summary import generate_summary

class TestSummaryGeneration(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.impact_path = os.path.join(self.test_dir, "impact.json")
        self.drift_path = os.path.join(self.test_dir, "drift.json")
        self.output_dir = os.path.join(self.test_dir, "output")
        os.makedirs(self.output_dir)

    def tearDown(self):
        shutil.rmtree(self.test_dir)

    def test_deterministic_generation(self):
        impact_data = {
            "severity": "HIGH",
            "changed_files": ["b_module.py", "a_module.py"], # Unsorted
            "affected_symbols": ["func_b", "func_a"] # Unsorted
        }
        drift_data = {
            "issues": [{"description": "Issue Y", "severity": "LOW"}, {"description": "Issue X", "severity": "HIGH"}]
        }

        with open(self.impact_path, 'w') as f:
            json.dump(impact_data, f)
        with open(self.drift_path, 'w') as f:
            json.dump(drift_data, f)

        summary_path = generate_summary(self.impact_path, self.drift_path, "sha123", self.output_dir)

        # Verify contract-compliant filename
        self.assertEqual(os.path.basename(summary_path), "summary.md")

        with open(summary_path, 'r') as f:
            content = f.read()

        # Check content and ordering
        self.assertIn("a_module.py", content)
        self.assertIn("b_module.py", content)
        # Verify deterministic order (a before b)
        self.assertLess(content.index("a_module.py"), content.index("b_module.py"))
        self.assertLess(content.index("func_a"), content.index("func_b"))

        # Verify drift issues are sorted by severity then description
        self.assertIn("Issue X", content)
        self.assertIn("Issue Y", content)
        # HIGH severity should appear before LOW
        self.assertLess(content.index("Issue X"), content.index("Issue Y"))

    def test_empty_generation(self):
        with open(self.impact_path, 'w') as f:
            json.dump({}, f)
        with open(self.drift_path, 'w') as f:
            json.dump({}, f)

        summary_path = generate_summary(self.impact_path, self.drift_path, "sha123", self.output_dir)
        with open(summary_path, 'r') as f:
            content = f.read()

        self.assertIn("No changed files detected", content)
