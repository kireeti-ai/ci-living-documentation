# Epic-4: Automated Documentation & Change Summary Service

Epic-4 is a production-grade CI automation tool designed to generate deterministic change summaries and deliver documentation updates via automated Pull Requests. It bridges the gap between analysis artifacts (impact reports, drift reports) and developer workflow by ensuring every change is documented and visible.

## Features

- **Deterministic Summaries**: Generates Markdown summaries from `impact_report.json` and `drift_report.json`.
- **Cloud Storage Integration**: Downloads documentation artifacts from GCS or S3 buckets (Epic-2 integration).
- **Automated Delivery**: Commits generated artifacts (docs, summaries) to a dedicated `auto/docs/<commit_sha>` branch.
- **PR Automation**: Automatically creates or updates a Pull Request with the summary and artifacts, keeping your documentation in sync with code changes.
- **Security Hardened**: Token sanitization and secure credential management prevent credential leakage.
- **Fault Tolerant**: Continues with degraded artifacts on failures; retry logic for network operations.
- **CI-Native**: Designed to run within GitHub Actions or other CI providers.
- **Reliable**: Includes retry logic, idempotency checks, and structured JSON logging.

## Installation

### Basic Installation

```bash
pip install .
```

### With Cloud Storage Support

For integration with Epic-2 cloud-stored documentation:

```bash
# Google Cloud Storage
pip install .[gcs]

# Amazon S3
pip install .[s3]

# Both providers
pip install .[cloud]
```

## Usage

### CLI Execution

The primary entry point is the CLI, intended to be run in a CI pipeline step.

```bash
python -m epic4.run \
    --impact artifacts/impact_report.json \
    --drift artifacts/drift_report.json \
    --docs artifacts/docs \
    --commit <commit_sha>
```

### FastAPI Service

Detailed API documentation is available at `/docs` when running the server.

```bash
uvicorn epic4.api:app --host 0.0.0.0 --port 8000
```

- `POST /generate-summary`: Generate summary markdown.
- `POST /deliver-docs-pr`: Trigger background PR delivery.

## Output Artifacts

Epic-4 produces the following artifacts (contract-compliant for Epic-5 dashboard):

```
artifacts/
├── summaries/
│   └── summary.md          # Contract-mandated filename
├── docs/                   # Downloaded from Epic-2 or local
│   └── [generated docs]
└── logs/
    └── epic4_execution.json
```

**Note:** The output summary is always named `summary.md` (not `change_summary_*.md`) to comply with the Epic-5 integration contract.

## Configuration

The system is configured via Environment Variables:

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `GITHUB_TOKEN` | GitHub Personal Access Token or Actions Token | Yes | - |
| `REPO_OWNER` | Owner of the target repository | Yes | - |
| `REPO_NAME` | Name of the target repository | Yes | - |
| `TARGET_BRANCH` | Base branch for PRs | No | `main` |
| `COMMIT_SHA` | SHA of the commit being processed | Yes (or via CLI) | - |
| `DOCS_BUCKET_PATH` | Cloud storage path for Epic-2 docs (gs:// or s3:// or r2://) | No | - |
| `ARTIFACTS_DIR` | Local artifacts directory | No | `artifacts` |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | No (required for R2) | - |
| `R2_ACCESS_KEY_ID` | Cloudflare R2 Access Key ID | No (required for R2) | - |
| `R2_SECRET_ACCESS_KEY` | Cloudflare R2 Secret Access Key | No (required for R2) | - |

### Cloud Storage Configuration

To integrate with Epic-2's cloud-stored documentation:

```bash
# Google Cloud Storage
export DOCS_BUCKET_PATH="gs://my-bucket/docs/path"

# Amazon S3
export DOCS_BUCKET_PATH="s3://my-bucket/docs/path"

# Cloudflare R2 (S3-compatible)
export DOCS_BUCKET_PATH="r2://my-bucket/docs/path"
export R2_ACCOUNT_ID="your-account-id"
export R2_ACCESS_KEY_ID="your-access-key-id"
export R2_SECRET_ACCESS_KEY="your-secret-access-key"
```

**Authentication:**
- **GCS**: Uses Application Default Credentials or `GOOGLE_APPLICATION_CREDENTIALS`
- **S3**: Uses AWS credentials from `~/.aws/credentials` or IAM role
- **R2**: Uses R2-specific credentials (Account ID, Access Key ID, Secret Access Key)

### Security Best Practices

- **Never log or commit** the `GITHUB_TOKEN` value
- Use GitHub Actions secrets or CI provider secret management
- Tokens are automatically sanitized from logs by Epic-4
- Git operations use secure credential helpers (no tokens in URLs)

## Docker

### Using Docker Compose (Recommended)

The easiest way to run Epic-4 is using Docker Compose.

1. **Set Environment Variables**:
   Create a `.env` file or export your variables:
   ```bash
   export GITHUB_TOKEN=your_token
   ```

2. **Run the API**:
   ```bash
   docker-compose up api
   ```
   The API will be available at `http://localhost:8000/docs`.

3. **Run the CLI**:
   ```bash
   docker-compose run cli --commit <sha> ...
   ```

### Using Docker Directly

1. **Build the Image**:
   ```bash
   docker build -t epic4 .
   ```

2. **Run the Container**:
   ```bash
   docker run -p 8000:8000 -e GITHUB_TOKEN=$GITHUB_TOKEN epic4
   ```

## Development

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run tests:
   ```bash
   python -m unittest discover tests
   ```
