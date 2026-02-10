# EPIC-3: Drift Detection & Validation Engine

FastAPI-based service for detecting drift between code artifacts and documentation in a distributed multi-epic documentation intelligence platform.

## Architecture

**Epic-3** communicates exclusively through artifacts and cloud storage:
- **Consumes**: `impact_report.json` (Epic-1), `doc_snapshot.json` (Epic-2)
- **Retrieves**: Documentation from Cloudflare R2 storage
- **Produces**: `drift_report.json` (for Epic-4)

## Features

✅ **Artifact-Based Integration**: No direct service-to-service calls
✅ **R2 Cloud Storage**: Retrieves documentation from Cloudflare R2 (S3-compatible)
✅ **Comprehensive Drift Detection**: Symbols, APIs, Schemas
✅ **REST API**: FastAPI server with complete endpoints
✅ **Deterministic Output**: Compatible with Epic-4 requirements
✅ **Production Ready**: Logging, error handling, retry logic

## Quick Start

### 1. Installation

```bash
# Clone or navigate to the repository
cd epic3-drift-engine

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

Edit `.env` with your R2 credentials:

```bash
# R2 Storage Configuration
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_ENDPOINT_URL=https://your-account-id.r2.cloudflarestorage.com
R2_BUCKET_NAME=your-bucket-name

# Application Configuration
LOG_LEVEL=INFO
```

### 3. Run the Server

```bash
# Start FastAPI server
python main.py

# Or use uvicorn directly
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The server will start at `http://localhost:8000`

### 4. Standalone CLI Mode

```bash
# Run drift analysis from command line
python run_drift.py
```

## API Endpoints

### Health Check
```bash
GET /health
```

Returns service health status and configuration.

### Trigger Drift Analysis
```bash
POST /analyze
Content-Type: application/json

{
  "impact_report_path": "inputs/impact_report.json",
  "doc_snapshot_path": "inputs/doc_snapshot.json",
  "output_report_path": "outputs/drift_report.json",
  "use_r2_storage": true
}
```

### Upload Artifacts
```bash
# Upload impact_report.json
POST /upload/impact-report
Content-Type: multipart/form-data
file: impact_report.json

# Upload doc_snapshot.json
POST /upload/doc-snapshot
Content-Type: multipart/form-data
file: doc_snapshot.json
```

### Retrieve Reports
```bash
# Get latest drift report
GET /report/latest

# Get specific report by ID
GET /report/{report_id}

# Delete latest report
DELETE /report/latest
```

### Configuration
```bash
GET /config
```

## Input Artifacts

### impact_report.json (from Epic-1)
```json
{
  "repo": {
    "name": "sample-repo",
    "branch": "main",
    "commit": "abc123"
  },
  "files": [
    {
      "path": "api/users.py",
      "language": "python",
      "symbols": ["create_user", "delete_user"],
      "impacts": ["API_IMPACT"]
    }
  ]
}
```

### doc_snapshot.json (from Epic-2)
```json
{
  "snapshot_id": "snap_abc123_20260208",
  "commit": "abc123def456",
  "docs_bucket_path": "docs/v1.2.0/snapshot_abc123",
  "documentation_files": ["api.md", "README.md"]
}
```

## Output Artifact

### drift_report.json (for Epic-4)
```json
{
  "report_id": "uuid-here",
  "generated_at": "2026-02-08T10:30:00Z",
  "repo": { "name": "sample-repo", "commit": "abc123" },
  "drift_detected": true,
  "overall_severity": "MAJOR",
  "severity_summary": {
    "MAJOR": 2,
    "MINOR": 1,
    "PATCH": 5
  },
  "issues": [
    {
      "type": "API_UNDOCUMENTED",
      "severity": "MAJOR",
      "symbol": "create_user",
      "description": "API symbol 'create_user' is not documented"
    }
  ],
  "validated_docs_bucket_path": "docs/v1.2.0/snapshot_abc123",
  "statistics": {
    "total_code_symbols": 10,
    "total_drift_issues": 8,
    "api_drift_count": 2,
    "schema_drift_count": 1,
    "undocumented_count": 5,
    "obsolete_documentation_count": 3
  }
}
```

## Drift Detection Logic

### Severity Levels
- **MAJOR**: Undocumented API symbols (breaking changes)
- **MINOR**: Undocumented schema symbols
- **PATCH**: Undocumented regular symbols or obsolete documentation
- **NONE**: No drift detected

### Detection Types
1. **Symbol Drift**: Compares all code symbols with documentation
2. **API Drift**: Checks API-impacted symbols are documented
3. **Schema Drift**: Validates schema changes are documented

## Testing

### Local Mode (without R2)
```bash
# Run with local documentation files
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "use_r2_storage": false
  }'
```

### R2 Storage Mode
```bash
# Run with R2 storage retrieval
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "use_r2_storage": true
  }'
```

## Project Structure

```
epic3-drift-engine/
├── main.py                     # FastAPI server
├── run_drift.py                # Drift analysis orchestrator
├── config.py                   # Configuration management
├── requirements.txt            # Python dependencies
├── .env.example                # Environment template
├── drift/
│   ├── code_index.py          # Parse impact_report.json
│   ├── doc_index.py           # Extract symbols from markdown
│   ├── report.py              # Generate drift_report.json
│   ├── severity.py            # Assign severity levels
│   ├── storage.py             # R2 storage client
│   └── comparators/
│       ├── symbol_drift.py    # Symbol drift detection
│       ├── api_drift.py       # API drift detection
│       └── schema_drift.py    # Schema drift detection
├── inputs/
│   ├── impact_report.json     # From Epic-1
│   ├── doc_snapshot.json      # From Epic-2
│   └── docs/                  # Local docs (fallback)
└── outputs/
    └── drift_report.json      # Generated output
```

## Production Deployment

### Docker
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Environment Variables
Required for production:
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_ENDPOINT_URL`
- `R2_BUCKET_NAME`

Optional:
- `LOG_LEVEL` (default: INFO)

## Security

✅ Credentials loaded from environment variables only
✅ Secrets never logged or written to artifacts
✅ R2 client uses secure connections (HTTPS)
✅ Input validation on all endpoints

## Troubleshooting

### R2 Connection Issues
```bash
# Check credentials
curl http://localhost:8000/config

# Verify health
curl http://localhost:8000/health
```

### Missing Input Files
```bash
# Upload via API
curl -X POST http://localhost:8000/upload/impact-report \
  -F "file=@inputs/impact_report.json"

curl -X POST http://localhost:8000/upload/doc-snapshot \
  -F "file=@inputs/doc_snapshot.json"
```

### View Logs
```bash
# Server logs show detailed execution
tail -f logs/epic3.log
```

## License

Proprietary - Multi-Epic Documentation Intelligence Platform

## Support

For issues or questions, contact the platform team.
