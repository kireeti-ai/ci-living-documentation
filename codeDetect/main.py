import sys
import json
import os
import datetime
from src.git_manager import GitManager
from src.file_filter import FileFilter
from src.scorers import SeverityCalculator, ComplexityScorer
from src.syntax_checker import SyntaxChecker
from src.parsers.java_parser import JavaParser
from src.parsers.ts_parser import TSParser
from src.parsers.schema_detector import SchemaDetector

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python main.py <repo_path>"}))
        sys.exit(1)

    repo_path = sys.argv[1]

    report = {
        "meta": {
            "generated_at": datetime.datetime.utcnow().isoformat() + "Z",
            "tool_version": "1.0.0"
        },
        "context": {},
        "analysis_summary": {
            "total_files": 0,
            "highest_severity": "PATCH",
            "breaking_changes_detected": False
        },
        "changes": []
    }

    try:
        git_mgr = GitManager(repo_path)
        report["context"] = git_mgr.get_metadata()

        changes_list = git_mgr.get_changed_files()
        report["analysis_summary"]["total_files"] = len(changes_list)

        severity_rank = {"PATCH": 1, "MINOR": 2, "MAJOR": 3}
        max_severity = 0

        for change in changes_list:
            file_path = change["path"]

            record = {
                "file": file_path,
                "change_type": change["change_type"],
                "language": None,
                "severity": "PATCH",
                "complexity_score": 0,
                "is_binary": False,
                "syntax_error": False,
                "features": {}
            }

            # A. Binary/Safety Check
            if not FileFilter.is_safe_to_read(file_path):
                record["is_binary"] = True
                record["note"] = "Skipped binary file analysis"
                report["changes"].append(record)
                continue

            # B. Read Content
            content = git_mgr.get_file_content(file_path)
            ext = os.path.splitext(file_path)[1].lower()

            # C. Syntax Check
            if SyntaxChecker.check(file_path, content):
                record["syntax_error"] = True
                record["features"]["note"] = "Partial extraction due to syntax error"

            # D. Parse Features
            features = {}
            if ext == '.java':
                record["language"] = "java"
                features = JavaParser.analyze(content)
                if features.get("comments"):
                    record["comments"] = features["comments"]

            # UPDATED: Handle JS and TS files using the TSParser
            elif ext in ['.ts', '.tsx', '.js', '.jsx']:
                record["language"] = "typescript" if 'ts' in ext else "javascript"
                features = TSParser.analyze(content)

            elif ext == '.py':
                record["language"] = "python"
                import re
                features["functions"] = re.findall(r'def\s+(\w+)', content)

            # Merge notes if syntax error existed
            if record["syntax_error"]:
                features["note"] = record["features"]["note"]

            # Remove comments from features to avoid duplication (they're already at record level)
            if "comments" in features:
                del features["comments"]

            record["features"] = features

            # E. Schema & Scoring
            schema_tags = SchemaDetector.analyze(file_path, content)
            severity = SeverityCalculator.assess(ext, features, schema_tags)
            complexity = ComplexityScorer.calculate(features)

            record["severity"] = severity
            record["complexity_score"] = complexity

            # F. Update Summary Stats
            if severity_rank[severity] > max_severity:
                max_severity = severity_rank[severity]
                report["analysis_summary"]["highest_severity"] = severity

            if severity == "MAJOR":
                report["analysis_summary"]["breaking_changes_detected"] = True

            report["changes"].append(record)

        # Save to file
        output_path = os.path.join(os.path.dirname(__file__), 'change_report.json')
        with open(output_path, 'w') as f:
            json.dump(report, f, indent=2)

        # Print to stdout
        print(json.dumps(report, indent=2))

    except Exception as e:
        error_report = {"status": "error", "message": str(e)}

        # Save error to file
        output_path = os.path.join(os.path.dirname(__file__), 'change_report.json')
        with open(output_path, 'w') as f:
            json.dump(error_report, f, indent=2)

        print(json.dumps(error_report))
        sys.exit(1)

if __name__ == "__main__":
    main()