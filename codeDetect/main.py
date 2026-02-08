import sys
import json
import os
import datetime
from src.git_manager import GitManager
from src.file_filter import FileFilter
from src.scorers import SeverityCalculator
from src.syntax_checker import SyntaxChecker
from src.parsers.java_parser import JavaParser
from src.parsers.ts_parser import TSParser
from src.parsers.schema_detector import SchemaDetector

def _ask_new_user_interactive() -> bool:
    """Ask on TTY if the user is new to the tool.

    Returns True when the user confirms they are new. Defaults to False
    when stdin is not a TTY or on empty input.
    """
    try:
        if sys.stdin.isatty():
            answer = input("Are you new to this tool? [y/N]: ").strip().lower()
            return answer in ("y", "yes")
    except Exception:
        pass
    return False


def _is_new_user_flag(argv: list[str]) -> bool:
    """Detect `--new-user` flag in argv or env var CODE_DETECT_NEW_USER.

    Accepts values like: --new-user, --new-user=true, --new-user=yes.
    Env var: CODE_DETECT_NEW_USER=1|true|yes
    """
    truthy = {"1", "true", "yes", "y"}
    # Check CLI
    for a in argv:
        if a == "--new-user":
            return True
        if a.startswith("--new-user="):
            val = a.split("=", 1)[1].strip().lower()
            return val in truthy
    # Check env
    env_val = os.environ.get("CODE_DETECT_NEW_USER", "").strip().lower()
    return env_val in truthy


def main():
    usage_error = {"error": "Usage: python main.py <repo_path_or_url> [github_token] [branch] [--new-user]"}

    if len(sys.argv) < 2:
        print(json.dumps(usage_error))
        sys.exit(1)

    # Extract positional args (ignore known flags we handle separately)
    args = [a for a in sys.argv[1:] if not a.startswith("--new-user")]
    if not args:
        print(json.dumps(usage_error))
        sys.exit(1)

    repo_path = args[0]
    github_token = args[1] if len(args) > 1 else os.environ.get('GITHUB_TOKEN')
    branch = args[2] if len(args) > 2 else "main"

    new_user = _is_new_user_flag(sys.argv[1:]) or _ask_new_user_interactive()

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
        # Use context manager to ensure cleanup
        with GitManager(repo_path, github_token, branch) as git_mgr:
            report["context"] = git_mgr.get_metadata()

            # New users: analyze the full repository once for baseline.
            changes_list = git_mgr.list_all_files() if new_user else git_mgr.get_changed_files()
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

                # Handle JS and TS files using the TSParser
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

                record["features"] = features

                # E. Schema & Scoring
                schema_tags = SchemaDetector.analyze(file_path, content)
                severity = SeverityCalculator.assess(ext, features, schema_tags)

                record["severity"] = severity

                # F. Update Summary Stats
                if severity_rank[severity] > max_severity:
                    max_severity = severity_rank[severity]
                    report["analysis_summary"]["highest_severity"] = severity

                if severity == "MAJOR":
                    report["analysis_summary"]["breaking_changes_detected"] = True

                report["changes"].append(record)

            # Save to file
            output_path = os.path.join(os.path.dirname(__file__), 'impact_report.json')
            with open(output_path, 'w') as f:
                json.dump(report, f, indent=2)

            # Print to stdout
            print(json.dumps(report, indent=2))

    except Exception as e:
        error_report = {"status": "error", "message": str(e)}

        # Save error to file
        output_path = os.path.join(os.path.dirname(__file__), 'impact_report.json')
        with open(output_path, 'w') as f:
            json.dump(error_report, f, indent=2)

        print(json.dumps(error_report))
        sys.exit(1)

if __name__ == "__main__":
    main()
