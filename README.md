# 📘 EPIC-2 — Documentation Generation Service

EPIC-2 is the **Living Documentation Engine** in a distributed multi-epic Documentation Intelligence Platform.

It consumes `impact_report.json` from **Epic-1**, generates documentation artifacts, uploads them to cloud storage, and produces a standardized `doc_snapshot.json` artifact for downstream epics.

This service is **artifact-driven** and does not directly couple with other services.

---

## 🏗 System Architecture Context

Epic-1 → impact_report.json
↓
EPIC-2 → Documentation Generation
↓
→ Cloud Storage (R2)
→ doc_snapshot.json
↓
Epic-3 / Epic-4 / Epic-5


EPIC-2 communicates strictly via:

- Input artifact → `impact_report.json`
- Output artifact → `doc_snapshot.json`
- Cloud storage path → `docs_bucket_path`

---

## 🎯 Responsibilities

EPIC-2 performs the following:

- ✅ Reads and validates `impact_report.json`
- ✅ Generates documentation artifacts:
  - `README.generated.md`
  - `api_reference.md`
  - `architecture.md`
  - ADR records
  - System / Sequence / ER diagrams
  - Folder tree snapshot
- ✅ Uploads generated docs to Cloudflare R2
- ✅ Produces `doc_snapshot.json`
- ✅ Maintains deterministic structure
- ✅ Handles optional failures gracefully

---

## 📂 Project Structure

sprint1/
│
├── input/
│ └── impact_report.json
│
├── output/
│ ├── docs/
│ │ ├── README.generated.md
│ │ ├── api_reference.md
│ │ ├── architecture.md
│ │ ├── adr_*.md
│ │ ├── system_diagram.md
│ │ └── tree_snapshot.md
│ │
│ └── doc_snapshot.json
│
├── src/
│ ├── run_epic2.py
│ ├── loader.py
│ ├── readme_generator.py
│ ├── api_generator.py
│ ├── adr_generator.py
│ ├── diagram_generator.py
│ ├── tree_generator.py
│ ├── snapshot_writer.py
│ └── ci/
│ └── r2_uploader.py
│
└── tests/


---

## 📥 Input Contract (From Epic-1)

EPIC-2 consumes:

```json
{
  "snapshot_id": "uuid-or-hash",
  "repo": "repo-name",
  "branch": "main",
  "commit": "commit_sha",
  "change_summary": "summary text",
  "changes": [],
  "affected_packages": []
}
Missing fields are handled gracefully with defaults.

📤 Output Contract (For Epic-3 / Epic-4 / Epic-5)
EPIC-2 produces:

{
  "snapshot_id": "uuid-or-hash",
  "repo": {
    "name": "repo-name",
    "branch": "main",
    "commit": "commit_sha"
  },
  "generated_at": "2026-02-08T10:20:30Z",
  "docs_bucket_path": "s3://docs-bucket/repo/commit/",
  "generated_files": [
    {
      "file": "README.generated.md",
      "type": "README"
    }
  ],
  "documentation_health": {
    "missing_sections": [],
    "template_followed": true
  },
  "upload_status": "UPLOADED | SKIPPED | FAILED"
}
This ensures compatibility with:

Epic-3 → Documentation Retrieval

Epic-4 → PR Packaging

Epic-5 → Dashboard Versioning

☁ Cloud Storage (Cloudflare R2)
Environment variables required:

R2_ENDPOINT
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
Upload path format:

s3://<bucket>/<repo>/<commit>/
If credentials are not provided → upload is skipped safely.

🚀 Running EPIC-2
Local Execution
cd sprint1/src
python run_epic2.py
Ensure this file exists:

sprint1/input/impact_report.json
CI Execution
In GitHub Actions:

Install dependencies

Run EPIC-2

Upload documentation to R2

Store doc_snapshot.json as artifact

🧪 Testing
EPIC-2 uses pytest.

Run tests:

pytest -v
With coverage:

pytest --cov=sprint1/src
Test coverage includes:

Input validation

Documentation generation

Snapshot schema validation

Upload behavior (mocked)

Deterministic structure validation

🛡 Reliability Guarantees
✔ Identical inputs → identical documentation structure
✔ Optional doc failures do not stop execution
✔ Upload status recorded in snapshot
✔ No direct service-to-service coupling
✔ CI-safe and local-safe execution

🔐 Security
Credentials are read strictly from environment variables

Secrets are never logged

No credentials written to output files

Artifact-only communication between epics

🧠 Design Principles
Artifact-first architecture

Deterministic outputs

Commit-versioned storage

Schema-stable integration contracts

Fail-soft generation strategy

📌 Summary
EPIC-2 transforms impact analysis into:

Structured documentation

Versioned cloud artifacts

Dashboard-compatible metadata

Integration-ready snapshots

It is the documentation intelligence layer of the platform.
