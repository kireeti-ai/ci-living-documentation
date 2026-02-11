# Code Change Detector

Automated code change analysis tool that generates detailed impact reports from Git repositories.

## Features

- **Smart Change Detection** - Analyzes code changes using Git diffs and AST parsing
- **GitHub Integration** - Works with both local repos and remote GitHub repositories
- **Token Authentication** - Secure access to private repositories
- **Detailed Analysis** - Extracts functions, components, APIs, and dependencies
- **Severity Scoring** - Automatic severity assessment (PATCH/MINOR/MAJOR)
- **Breaking Change Detection** - Identifies potential breaking changes
- **Complexity Metrics** - Calculates code complexity scores

## Usage

### Analyze Local Repository
```bash
python codeDetect/main.py /path/to/local/repo
```

### Analyze GitHub Repository

```bash
export GITHUB_TOKEN=your_github_personal_access_token
python codeDetect/main.py https://github.com/owner/repo
```

### Start API Service
```bash
python codeDetect/api.py
```
The API will be available at `http://localhost:5000`.

## Output

The tool generates `codeDetect/impact_report.json` with detailed analysis of the changes, including:
- Metadata about the commit and repository.
- Summary of analysis (total files, highest severity).
- Detailed changes per file with extracted features and complexity scores.

## Supported Languages

- JavaScript/TypeScript (.js, .jsx, .ts, .tsx)
- Java (.java)
- Python (.py)

## API Endpoints

The service provides REST API endpoints for analysis:

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/analyze` | Analyze GitHub repository |
| POST | `/analyze/local` | Analyze local repository |

**Example API Request:**
```bash
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/owner/repo",
    "branch": "main"
  }'
```

For requirements, please install dependencies:
```bash
pip install -r codeDetect/requirements.txt
```
