#!/usr/bin/env python3
"""
EPIC-2 Documentation Generator
Consumes EPIC-1 impact report and generates living documentation
"""

import os
import sys
import json
import requests

from sprint1.src.ci.r2_uploader import upload_docs_to_r2



from sprint1.src.loader import load_impact_report
from sprint1.src.readme_generator import generate_readme
from sprint1.src.api_generator import generate_api_docs
from sprint1.src.adr_generator import generate_adr
from sprint1.src.diagram_generator import system_diagram, sequence_diagram, er_diagram
from sprint1.src.tree_generator import generate_tree
from sprint1.src.snapshot_writer import write_snapshot

# ---------------- CONFIG ----------------
BACKEND_URL = os.getenv("BACKEND_URL", "https://code-detect.onrender.com/analyze")
INPUT_PATH = "sprint1/input/impact_report.json"
OUTPUT_BASE = "sprint1/artifacts/docs"

REPO_URL = os.getenv("REPO_URL")
REPO_BRANCH = os.getenv("REPO_BRANCH", "main")

# ---------------------------------------

def ensure_directories():
    for d in [
        OUTPUT_BASE,
        f"{OUTPUT_BASE}/api",
        f"{OUTPUT_BASE}/adr",
        f"{OUTPUT_BASE}/architecture",
    ]:
        os.makedirs(d, exist_ok=True)

def get_impact_report():
    """
    Auto-fetch impact report from EPIC-1 or load cached version
    """
    repo_url = os.getenv("TARGET_REPO_URL")
    branch = os.getenv("TARGET_REPO_BRANCH", "main")
    github_token = os.getenv("GITHUB_TOKEN")

    # 1️⃣ Use cached report if present
    if os.path.exists(INPUT_PATH):
        print(f"📂 Using cached impact report: {INPUT_PATH}")
        return load_impact_report()

    # 2️⃣ Otherwise fetch from EPIC-1
    if not repo_url:
        print("❌ TARGET_REPO_URL not set")
        sys.exit(1)

    payload = {
        "repo_url": repo_url,
        "branch": branch
    }

    if github_token:
        payload["github_token"] = github_token

    print("📡 Fetching impact report from EPIC-1...")
    response = requests.post(
        "https://code-detect.onrender.com/analyze",
        json=payload,
        timeout=60
    )

    response.raise_for_status()
    data = response.json()

    if data.get("status") != "success":
        print("❌ EPIC-1 analysis failed")
        sys.exit(1)

    report = data["report"]

    # 3️⃣ Save normalized report
    os.makedirs(os.path.dirname(INPUT_PATH), exist_ok=True)
    with open(INPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"✅ Impact report saved to {INPUT_PATH}")
    return report


def write_file(path, content):
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"✅ Generated {path}")

def generate_all_docs(report):
    write_file(f"{OUTPUT_BASE}/README.md", generate_readme(report))
    write_file(f"{OUTPUT_BASE}/api/api-reference.md", generate_api_docs(report))
    write_file(f"{OUTPUT_BASE}/adr/ADR-001.md", generate_adr(report))

    write_file(f"{OUTPUT_BASE}/architecture/system.mmd", system_diagram())
    write_file(f"{OUTPUT_BASE}/architecture/sequence.mmd", sequence_diagram())
    write_file(f"{OUTPUT_BASE}/architecture/er.mmd", er_diagram())

    write_file(f"{OUTPUT_BASE}/tree.txt", generate_tree(report))
    write_file(f"{OUTPUT_BASE}/doc_snapshot.json", write_snapshot(report))

def main():
    ensure_directories()
    report = get_impact_report()
    generate_all_docs(report)

    print("☁️ Uploading docs to R2...")
    upload_docs_to_r2(
        local_dir="sprint1/artifacts/docs",
        bucket=os.environ["R2_BUCKET_NAME"],
        prefix=f"{report['context']['repository']}/{report['context']['commit_sha']}"
    )

    print("✅ EPIC-2 completed")


if __name__ == "__main__":
    main()
