# Build the Docker image
docker build -t code-detector .

# Run with Docker Compose
docker-compose up -d

# Run standalone (without compose)
docker run -p 5000:5000 \
  -e GITHUB_TOKEN=your_token \
  code-detector

# Run with volume mount (for local repos)
docker run -p 5000:5000 \
  -v /path/to/repos:/repos \
  code-detector

# Test health
curl http://localhost:5000/health

# Analyze GitHub repo
curl -X POST http://localhost:5000/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "repo_url": "https://github.com/owner/repo",
    "github_token": "your_token",
    "branch": "main"
  }'

# Analyze local repo
curl -X POST http://localhost:5000/analyze/local \
  -H "Content-Type: application/json" \
  -d '{
    "repo_path": "/repos/my-project"
  }'
