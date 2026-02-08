# Where to Set Environment Variables

This guide shows you **exactly where** to set your Epic-4 environment variables for different scenarios.

---

## 🏠 Option 1: Local Development (`.env` file)

**Best for:** Testing locally, development

### Steps:

1. **Create `.env` file** in the project root:
   ```bash
   cd /Users/kireeti/Downloads/software_project/ci-living-documentation/epic-4/epic-4
   cp .env.example .env
   ```

2. **Edit `.env`** with your values:
   ```bash
   nano .env  # or use your favorite editor
   ```

3. **Load the variables** before running:
   ```bash
   # Load .env file
   export $(cat .env | xargs)

   # Run Epic-4
   python -m epic4.run --commit abc123
   ```

### Using with Docker Compose:
```bash
# docker-compose automatically loads .env file
docker-compose up api
```

**Important:** Add `.env` to `.gitignore` to avoid committing secrets!

---

## 🔧 Option 2: Direct Terminal Export

**Best for:** Quick testing, one-time runs

```bash
# Set variables in your current terminal session
export GITHUB_TOKEN="ghp_your_token_here"
export REPO_OWNER="your-org"
export REPO_NAME="your-repo"
export COMMIT_SHA="abc123"

# R2 Configuration
export R2_ACCOUNT_ID="your_account_id"
export R2_ACCESS_KEY_ID="your_access_key"
export R2_SECRET_ACCESS_KEY="your_secret_key"
export DOCS_BUCKET_PATH="r2://bucket-name/path"

# Run Epic-4 (variables are now available)
python -m epic4.run --commit $COMMIT_SHA
```

### Make Permanent (Add to Shell Profile):
```bash
# Add to ~/.zshrc or ~/.bashrc
echo 'export R2_ACCOUNT_ID="your_account_id"' >> ~/.zshrc
echo 'export R2_ACCESS_KEY_ID="your_access_key"' >> ~/.zshrc
echo 'export R2_SECRET_ACCESS_KEY="your_secret_key"' >> ~/.zshrc

# Reload shell
source ~/.zshrc
```

---

## ☁️ Option 3: GitHub Actions (CI/CD)

**Best for:** Automated runs in GitHub

### Location: Repository Settings

1. **Go to your GitHub repository**
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret:

| Secret Name | Value |
|-------------|-------|
| `R2_ACCOUNT_ID` | Your Cloudflare account ID |
| `R2_ACCESS_KEY_ID` | Your R2 access key |
| `R2_SECRET_ACCESS_KEY` | Your R2 secret key |
| `DOCS_BUCKET_PATH` | `r2://bucket-name/path` |
| `GITHUB_TOKEN` | (Automatically provided by GitHub) |

### The workflow file already configured! ✅

See [`.github/workflows/epic4_workflow.yaml`](.github/workflows/epic4_workflow.yaml) - it's already set up to use these secrets:

```yaml
env:
  R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
  R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
  R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
  DOCS_BUCKET_PATH: ${{ secrets.DOCS_BUCKET_PATH }}
```

---

## 🦊 Option 4: GitLab CI/CD

**Best for:** GitLab projects

### Location: Project Settings

1. Go to **Settings** → **CI/CD** → **Variables**
2. Click **Add Variable** for each:

| Key | Value | Protected | Masked |
|-----|-------|-----------|--------|
| `R2_ACCOUNT_ID` | your_account_id | ✅ | ✅ |
| `R2_ACCESS_KEY_ID` | your_access_key | ✅ | ✅ |
| `R2_SECRET_ACCESS_KEY` | your_secret_key | ✅ | ✅ |
| `DOCS_BUCKET_PATH` | r2://bucket/path | ✅ | - |

### Example `.gitlab-ci.yml`:
```yaml
epic4-docs:
  stage: deploy
  image: python:3.10
  variables:
    REPO_OWNER: "your-org"
    REPO_NAME: "your-repo"
  script:
    - pip install -e .
    - python -m epic4.run --commit $CI_COMMIT_SHA
  only:
    - main
```

---

## 🐳 Option 5: Docker Compose

**Best for:** Containerized development

### Method A: Use `.env` file (Recommended)

1. Create `.env` file (as shown in Option 1)
2. Run docker-compose:
   ```bash
   docker-compose up api
   ```

Docker Compose automatically loads `.env` and passes variables to containers!

### Method B: Inline Environment Variables

```bash
R2_ACCOUNT_ID=xxx R2_ACCESS_KEY_ID=yyy docker-compose up api
```

### Method C: Environment File

```bash
# Create separate env file
cat > r2.env <<EOF
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
DOCS_BUCKET_PATH=r2://bucket/path
EOF

# Use with docker-compose
docker-compose --env-file r2.env up api
```

---

## 🐍 Option 6: Python Script / API Server

**Best for:** Running as a service

### Using python-dotenv:

```python
# At the top of your script
from dotenv import load_dotenv
load_dotenv()  # Loads .env file

# Now run Epic-4
from epic4.run import main
main()
```

### Using environment variables in Python:
```python
import os

# Set before importing epic4
os.environ['R2_ACCOUNT_ID'] = 'your_account_id'
os.environ['R2_ACCESS_KEY_ID'] = 'your_access_key'
os.environ['R2_SECRET_ACCESS_KEY'] = 'your_secret_key'
os.environ['DOCS_BUCKET_PATH'] = 'r2://bucket/path'

# Now import and use
from epic4.run import main
main()
```

---

## 🔍 Option 7: Kubernetes / Cloud Platforms

### Kubernetes Secret:
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: epic4-secrets
type: Opaque
stringData:
  R2_ACCOUNT_ID: "your_account_id"
  R2_ACCESS_KEY_ID: "your_access_key"
  R2_SECRET_ACCESS_KEY: "your_secret_key"
  DOCS_BUCKET_PATH: "r2://bucket/path"
```

### Deployment:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: epic4
spec:
  template:
    spec:
      containers:
      - name: epic4
        image: epic4:latest
        envFrom:
        - secretRef:
            name: epic4-secrets
```

### AWS ECS Task Definition:
```json
{
  "containerDefinitions": [{
    "name": "epic4",
    "environment": [
      {"name": "R2_ACCOUNT_ID", "value": "your_account_id"},
      {"name": "R2_ACCESS_KEY_ID", "value": "your_access_key"},
      {"name": "R2_SECRET_ACCESS_KEY", "value": "your_secret_key"},
      {"name": "DOCS_BUCKET_PATH", "value": "r2://bucket/path"}
    ]
  }]
}
```

---

## ✅ Quick Start Checklist

Choose your scenario and follow these steps:

### 🏠 Local Testing:
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in your R2 credentials
- [ ] Load with `export $(cat .env | xargs)`
- [ ] Run `python -m epic4.run --commit test123`

### ☁️ GitHub CI/CD:
- [ ] Go to repo Settings → Secrets and variables → Actions
- [ ] Add `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- [ ] Add `DOCS_BUCKET_PATH`
- [ ] Push code and check workflow runs

### 🐳 Docker:
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in your credentials
- [ ] Run `docker-compose up api`

---

## 🔐 Security Notes

**Never commit these to git:**
- `.env` file
- Any file containing credentials
- Shell history with credentials

**Add to `.gitignore`:**
```gitignore
.env
.env.local
*.env
r2.env
**/*.secret
```

**Use encryption for CI/CD secrets:**
- GitHub: Uses encrypted secrets
- GitLab: Mark as "Masked" and "Protected"
- Local: Use tools like `git-crypt` or `sops`

---

## 🆘 Troubleshooting

### "R2 client not available"
**Solution:** Check that all 3 R2 variables are set:
```bash
echo "R2_ACCOUNT_ID: ${R2_ACCOUNT_ID:0:8}..."
echo "R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID:0:8}..."
echo "R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY:0:8}..."
```

### Variables not loading
**Solution:** Ensure you're in the right directory and loading .env:
```bash
cd /path/to/epic-4
export $(cat .env | xargs)
env | grep R2  # Verify they're set
```

### Docker not picking up .env
**Solution:** Ensure `.env` is in same directory as `docker-compose.yml`:
```bash
ls -la .env docker-compose.yml
```

---

## 📚 Related Documentation

- [CLOUDFLARE_R2_SETUP.md](CLOUDFLARE_R2_SETUP.md) - Detailed R2 configuration
- [README.md](README.md) - General Epic-4 documentation
- [.env.example](.env.example) - Template for environment variables
