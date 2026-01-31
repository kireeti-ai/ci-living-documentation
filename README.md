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

## Installation

```bash
# Install dependencies
pip install -r requirements.txt
```

## Usage

### Analyze Local Repository
```bash
python main.py /path/to/local/repo
```

### Analyze GitHub Repository

**Using environment variable (recommended):**
```bash
export GITHUB_TOKEN=your_github_personal_access_token
python main.py https://github.com/owner/repo
```

**Using command line arguments:**
```bash
python main.py https://github.com/owner/repo YOUR_GITHUB_TOKEN main
```

**Specify branch (optional, defaults to 'main'):**
```bash
python main.py https://github.com/owner/repo YOUR_GITHUB_TOKEN develop
```

**Private vs Public Repos:**
- Public repos: No token required.
- Private repos: Token required (use `GITHUB_TOKEN` or pass as argument).

## Output

The tool generates `impact_report.json` with:

```json
{
  "meta": {
    "generated_at": "2026-01-31T12:00:00Z",
    "tool_version": "1.0.0"
  },
  "context": {
    "repository": "repo-name",
    "branch": "main",
    "commit_sha": "abc123",
    "author": "username",
    "intent": {
      "message": "commit message",
      "timestamp": "2026-01-31T12:00:00"
    }
  },
  "analysis_summary": {
    "total_files": 5,
    "highest_severity": "MINOR",
    "breaking_changes_detected": false
  },
  "changes": [
    {
      "file": "src/app.js",
      "change_type": "MODIFIED",
      "language": "javascript",
      "severity": "MINOR",
      "complexity_score": 10,
      "features": {
        "functions": ["init", "handleClick"],
        "react_components": ["App"],
        "api_endpoints": [],
        "dependencies": ["react", "axios"]
      }
    }
  ]
}
```

## GitHub Token Setup

1. Go to [GitHub Settings → Developer Settings → Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` - Full control of private repositories
   - `public_repo` - For public repositories only
4. Copy the token and use it as shown above

**Security:** Never commit tokens to version control. Use environment variables or CI/CD secrets.



## Supported Languages

- JavaScript/TypeScript (.js, .jsx, .ts, .tsx)
- Java (.java)
- Python (.py)



## Requirements

- Python 3.9+
- Git
- GitPython
- tree-sitter
- PyYAML

See `requirements.txt` for full list.

## License

MIT License

## Support

For issues or questions, please open an issue in the repository.

---

# Deployment

## Docker Deployment

### Build the Docker image
```bash
docker build -t code-detector .
```

### Run with Docker Compose (Recommended)
```bash
# Start the service
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the service
docker-compose down
```

### Run standalone Docker
```bash
docker run -p 5000:5000 \
  -e GITHUB_TOKEN=your_token \
  code-detector
```

**Note:** In this workspace, docker-compose maps the service to port **8080** to avoid macOS ControlCenter using 5000.

## REST API Usage

The service runs on:
- Docker Compose: `http://localhost:8080`
- Standalone Docker: `http://localhost:5000`

### Health Check
```bash
curl http://localhost:8080/health
```

### Analyze GitHub Repository
```bash
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/owner/repo",
    "github_token": "your_github_token",
    "branch": "main"
  }'
```

**Private repo example:**
```bash
curl -X POST http://localhost:8080/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/your-org/your-private-repo.git",
    "github_token": "YOUR_TOKEN",
    "branch": "main"
  }'
```

### Analyze Local Repository
```bash
curl -X POST http://localhost:8080/analyze/local \
  -H "Content-Type: application/json" \
  -d '{
    "repo_path": "/path/to/local/repo"
  }'
```

**Local path inside container:** For local analysis with Docker, you must mount a host path into the container and use the container path in `repo_path`. Example:
```bash
docker run -p 5000:5000 \
  -v /absolute/path/on/host:/app/local-repo \
  code-detector

curl -X POST http://localhost:5000/analyze/local \
  -H "Content-Type: application/json" \
  -d '{ "repo_path": "/app/local-repo" }'
```

### Response
```json
{
  "status": "success",
  "report": {
    "meta": {...},
    "context": {...},
    "analysis_summary": {...},
    "changes": [...]
  }
}
```

## Cloud Deployment

### Render (Live)
- Base URL: https://code-detect.onrender.com
- Health: https://code-detect.onrender.com/health

**Render setup:**
1. Create a new Web Service (Docker)
2. Root Directory: `codeDetect`
3. Dockerfile Path: `Dockerfile`
4. Set `GITHUB_TOKEN` in Render env **or** send `github_token` in each request

**Render API example:**
```bash
curl -X POST https://code-detect.onrender.com/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/owner/repo.git",
    "branch": "main",
    "github_token": "YOUR_TOKEN_IF_PRIVATE"
  }'
```




## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/analyze` | Analyze GitHub repository |
| POST | `/analyze/local` | Analyze local repository |

## Environment Variables

- `GITHUB_TOKEN` - GitHub personal access token (required for private repos)
- `PYTHONUNBUFFERED` - Set to 1 (already configured in Docker)

## Files

- `Dockerfile` - Container configuration
- `docker-compose.yml` - Multi-container orchestration (maps 8080:5000 in this workspace)
- `api.py` - Flask REST API
- `main.py` - Core analysis engine
- `DOCKER_COMMANDS.sh` - Example commands
