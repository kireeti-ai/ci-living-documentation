## Deployment Guide

### Docker Deployment

1.  **Build the Image**:
    ```bash
    ./build_image.sh
    ```

2.  **Run the Container**:
    Edit `run_container.sh` to include your valid `GITHUB_TOKEN`, `REPO_OWNER`, and `REPO_NAME`.
    ```bash
    ./run_container.sh
    ```

### CLI Execution via Docker

If you want to run the CLI tool inside docker (e.g. for CI pipelines using this image):

```bash
docker run --rm \
  -v $(pwd)/artifacts:/app/artifacts \
  -e GITHUB_TOKEN=$GITHUB_TOKEN \
  -e REPO_OWNER="owner" \
  -e REPO_NAME="repo" \
  epic4-service:latest \
  python -m epic4.run --commit <SHA>
```

### Render Deployment

Epic-4 can be easily deployed on Render using the included `render.yaml` Blueprint configuration.

#### Prerequisites
1. A GitHub account with your code pushed to a repository
2. A Render account (free tier available at https://render.com)
3. A GitHub Personal Access Token with `repo` scope

#### Option 1: Deploy with Blueprint (Recommended)

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add Epic-4 documentation automation service"
   git push origin main
   ```

2. **Create a GitHub Personal Access Token**:
   - Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token with `repo` scope
   - Save the token securely

3. **Deploy to Render**:
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Blueprint"
   - Connect your GitHub repository
   - Render will automatically detect `render.yaml`
   - Configure the following environment variables when prompted:

     **Required:**
     - `GITHUB_TOKEN`: Your GitHub Personal Access Token
     - `REPO_OWNER`: Your GitHub username or organization
     - `REPO_NAME`: The repository name where PRs will be created

     **Optional (for Cloudflare R2 cloud storage):**
     - `R2_ACCOUNT_ID`: Your Cloudflare account ID
     - `R2_ACCESS_KEY_ID`: Your R2 API access key
     - `R2_SECRET_ACCESS_KEY`: Your R2 API secret key
     - `DOCS_BUCKET_PATH`: R2 bucket path (e.g., `r2://bucket-name/path`)

   - Click "Apply" to deploy

4. **Verify Deployment**:
   - Once deployed, visit `https://your-service-name.onrender.com/docs`
   - Test the health endpoint: `https://your-service-name.onrender.com/health`

#### Option 2: Manual Setup

1. Go to Render Dashboard → New + → Web Service
2. Connect your GitHub repository
3. Configure:
   - **Name**: `epic4-docs-automation` (or your preferred name)
   - **Runtime**: Docker
   - **Plan**: Free
   - **Dockerfile Path**: `./Dockerfile`
4. Add environment variables:

   **Required:**
   - `GITHUB_TOKEN`: Your GitHub token
   - `REPO_OWNER`: Your GitHub username/org
   - `REPO_NAME`: Target repository name
   - `TARGET_BRANCH`: `main` (or your default branch)

   **Optional (for Cloudflare R2):**
   - `R2_ACCOUNT_ID`: Your Cloudflare account ID
   - `R2_ACCESS_KEY_ID`: R2 access key
   - `R2_SECRET_ACCESS_KEY`: R2 secret key
   - `DOCS_BUCKET_PATH`: e.g., `r2://bucket-name/docs`

5. Add persistent disk (optional but recommended):
   - **Name**: `artifacts`
   - **Mount Path**: `/app/artifacts`
   - **Size**: 1 GB
6. Click "Create Web Service"

#### Using the Deployed Service

Once deployed, you can:
- Access the API documentation at `/docs`
- Call the `/generate-summary` endpoint to create documentation summaries
- Use `/deliver-docs-pr` to trigger automated PR creation
- Monitor the `/health` endpoint for service status

#### Configuring Cloudflare R2 on Render

If you want Epic-4 to download documentation artifacts from Cloudflare R2:

1. **Get your R2 credentials** from Cloudflare Dashboard → R2 → Manage API Tokens
2. **In Render Dashboard**, go to your Epic-4 service
3. **Navigate to Environment** tab
4. **Add the following secret variables**:
   - Click "Add Environment Variable"
   - Add each R2 credential:
     - Key: `R2_ACCOUNT_ID`, Value: `your-account-id`
     - Key: `R2_ACCESS_KEY_ID`, Value: `your-access-key`
     - Key: `R2_SECRET_ACCESS_KEY`, Value: `your-secret-key`
     - Key: `DOCS_BUCKET_PATH`, Value: `r2://your-bucket/path`
5. **Click "Save Changes"** - Render will automatically redeploy

**Note:** All R2 variables are optional. If not set, Epic-4 will only use local artifact storage.

#### Render Deployment Checklist

✅ **Before Deploying:**
- [ ] Code pushed to GitHub
- [ ] GitHub Personal Access Token created with `repo` scope
- [ ] (Optional) R2 bucket created and credentials ready
- [ ] `render.yaml` reviewed and updated if needed

✅ **After Deploy:**
- [ ] Service starts successfully (check Render logs)
- [ ] Health endpoint responds: `https://your-service.onrender.com/health`
- [ ] API docs accessible: `https://your-service.onrender.com/docs`
- [ ] Environment variables set correctly
- [ ] Test summary generation endpoint

#### Troubleshooting Render Deployment

**Build Fails:**
- Check Render build logs
- Verify Dockerfile builds locally: `docker build -t epic4-test .`
- Ensure all dependencies in `requirements.txt`

**Service Crashes:**
- Check Render logs for errors
- Verify all required env vars are set (`GITHUB_TOKEN`, `REPO_OWNER`, `REPO_NAME`)
- Test locally with same configuration

**R2 Connection Issues:**
- Verify all 3 R2 credentials are set in Render
- Check R2 bucket name and path are correct
- Test R2 credentials locally first

**Health Check Failing:**
- Ensure `/health` endpoint is accessible
- Check if service is listening on port 8000
- Review Render service logs for startup errors

#### Render Free Tier Limitations

- Service sleeps after 15 minutes of inactivity (first request may be slow)
- 750 hours/month of runtime
- 100 GB bandwidth/month
- Persistent disk required for artifacts between restarts

**Tip:** For production, consider upgrading to a paid plan for:
- No sleep on inactivity
- More compute resources
- Faster builds
- Higher bandwidth

**Example API Call**:
```bash
curl -X POST "https://your-service-name.onrender.com/generate-summary" \
  -H "Content-Type: application/json" \
  -d '{
    "impact_report": {...},
    "drift_report": {...},
    "commit_sha": "abc123"
  }'
```

### Kubernetes


A sample `deployment.yaml` can be created if you need to deploy this to a K8s cluster.
