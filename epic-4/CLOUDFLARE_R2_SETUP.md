# Cloudflare R2 Setup Guide

This guide explains how to configure Epic-4 to use Cloudflare R2 for cloud-stored documentation artifacts.

## What is Cloudflare R2?

Cloudflare R2 is an S3-compatible object storage service that offers zero egress fees. It's fully compatible with the AWS S3 API, making it a cost-effective alternative for storing and retrieving documentation artifacts.

## Prerequisites

1. A Cloudflare account with R2 enabled
2. An R2 bucket created for your documentation
3. API credentials (Access Key ID and Secret Access Key)

## Getting Your R2 Credentials

### 1. Find Your Account ID

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** from the sidebar
3. Your Account ID is displayed in the R2 overview page
   - Format: `1234567890abcdef1234567890abcdef`

### 2. Create API Token

1. In the R2 section, click **Manage R2 API Tokens**
2. Click **Create API Token**
3. Configure permissions:
   - **Token Name**: `epic4-docs-access`
   - **Permissions**: Read & Write (or Read if Epic-4 only downloads)
   - **TTL**: Set according to your security policy
4. Click **Create API Token**
5. **Important**: Save the following credentials immediately (shown only once):
   - Access Key ID (e.g., `abc123...`)
   - Secret Access Key (e.g., `xyz789...`)

### 3. Create R2 Bucket

1. In R2 dashboard, click **Create Bucket**
2. Configure:
   - **Bucket Name**: `epic-docs` (or your preferred name)
   - **Location**: Choose closest to your CI/CD infrastructure
3. Click **Create Bucket**

## Configuration

### Environment Variables

Set the following environment variables in your CI/CD pipeline or local environment:

```bash
# Required for R2
export R2_ACCOUNT_ID="your-account-id-here"
export R2_ACCESS_KEY_ID="your-access-key-id-here"
export R2_SECRET_ACCESS_KEY="your-secret-access-key-here"

# Bucket path using r2:// scheme
export DOCS_BUCKET_PATH="r2://epic-docs/documentation"

# Standard Epic-4 configuration
export GITHUB_TOKEN="your-github-token"
export REPO_OWNER="your-org"
export REPO_NAME="your-repo"
export COMMIT_SHA="${GITHUB_SHA}"  # In GitHub Actions
```

### GitHub Actions Example

```yaml
name: Documentation CI

on:
  push:
    branches: [main]

jobs:
  generate-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'

      - name: Install Epic-4
        run: |
          pip install -e git+https://github.com/your-org/epic-4.git#egg=epic4

      - name: Run Epic-4
        env:
          # R2 Configuration
          R2_ACCOUNT_ID: ${{ secrets.R2_ACCOUNT_ID }}
          R2_ACCESS_KEY_ID: ${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY: ${{ secrets.R2_SECRET_ACCESS_KEY }}
          DOCS_BUCKET_PATH: "r2://epic-docs/docs/${{ github.ref_name }}"

          # GitHub Configuration
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPO_OWNER: ${{ github.repository_owner }}
          REPO_NAME: ${{ github.event.repository.name }}
          COMMIT_SHA: ${{ github.sha }}
        run: |
          python -m epic4.run \
            --impact artifacts/impact_report.json \
            --drift artifacts/drift_report.json \
            --commit ${{ github.sha }}
```

### GitLab CI Example

```yaml
documentation:
  stage: deploy
  image: python:3.10
  variables:
    DOCS_BUCKET_PATH: "r2://epic-docs/docs/${CI_COMMIT_REF_NAME}"
  script:
    - pip install epic4
    - python -m epic4.run --commit ${CI_COMMIT_SHA}
  only:
    - main
  environment:
    name: documentation
```

## Bucket Path Format

The `DOCS_BUCKET_PATH` follows this format:

```
r2://<bucket-name>/<path>/<to>/<docs>
```

Examples:
- `r2://epic-docs/documentation` - Root of bucket path
- `r2://epic-docs/projects/my-project` - Organized by project
- `r2://epic-docs/docs/${BRANCH}` - Organized by branch
- `r2://my-docs/v1.0/artifacts` - Versioned storage

## Security Best Practices

### 1. Use CI/CD Secrets Management

**Never** commit credentials to your repository. Always use your CI platform's secrets management:

- **GitHub Actions**: Repository Secrets
- **GitLab CI**: CI/CD Variables (masked & protected)
- **CircleCI**: Project Environment Variables
- **Jenkins**: Credentials Plugin

### 2. Rotate Credentials Regularly

1. Create a new API token in Cloudflare
2. Update secrets in your CI/CD platform
3. Delete the old token after verifying the new one works
4. Recommended rotation: Every 90 days

### 3. Limit Token Permissions

- Use **Read-only** tokens if Epic-4 only downloads artifacts
- Create separate tokens for different environments (dev/staging/prod)
- Enable IP restrictions if your CI has static IPs

### 4. Enable Bucket Access Logs

1. In R2 dashboard, select your bucket
2. Navigate to **Settings** → **Logging**
3. Enable access logs to monitor usage

## Testing Your Configuration

### 1. Verify Credentials

```bash
# Set your credentials
export R2_ACCOUNT_ID="your-account-id"
export R2_ACCESS_KEY_ID="your-access-key-id"
export R2_SECRET_ACCESS_KEY="your-secret-access-key"

# Test with Python
python3 << EOF
import boto3
import os

client = boto3.client(
    's3',
    endpoint_url=f"https://{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com",
    aws_access_key_id=os.environ['R2_ACCESS_KEY_ID'],
    aws_secret_access_key=os.environ['R2_SECRET_ACCESS_KEY'],
    region_name='auto'
)

# List buckets
response = client.list_buckets()
print("Available buckets:")
for bucket in response['Buckets']:
    print(f"  - {bucket['Name']}")
EOF
```

### 2. Test Epic-4 Integration

```bash
# Create test artifacts
mkdir -p artifacts
echo '{"severity": "LOW", "changed_files": [], "affected_symbols": []}' > artifacts/impact_report.json
echo '{"issues": []}' > artifacts/drift_report.json

# Run Epic-4 with R2
export DOCS_BUCKET_PATH="r2://your-bucket/test"
python -m epic4.run --commit test123
```

## Troubleshooting

### Error: "R2 client not available"

**Cause**: Missing R2 credentials or boto3 not installed

**Solution**:
```bash
# Install boto3
pip install boto3

# Verify all credentials are set
echo "R2_ACCOUNT_ID: ${R2_ACCOUNT_ID:0:8}..."
echo "R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID:0:8}..."
echo "R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY:0:8}..."
```

### Error: "Failed to download from cloud storage"

**Cause**: Invalid credentials, wrong bucket name, or network issue

**Solution**:
1. Verify bucket exists: Check Cloudflare R2 dashboard
2. Test credentials with AWS CLI:
   ```bash
   aws s3 ls --endpoint-url https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com \
     --profile r2
   ```
3. Check bucket path format: `r2://bucket-name/path`

### Error: "Access Denied"

**Cause**: API token lacks required permissions

**Solution**:
1. Verify token permissions in Cloudflare dashboard
2. Ensure token has Read permissions (minimum) for the bucket
3. Create a new token with correct permissions if needed

### Slow Downloads

**Cause**: Large artifacts or network latency

**Solutions**:
1. Use Cloudflare's closest region for your CI
2. Enable R2 bucket compression for documentation files
3. Consider CDN caching for frequently accessed artifacts

## Cost Optimization

Cloudflare R2 advantages:
- **Zero egress fees**: No charges for data transfer out
- **$0.015/GB/month storage**: Competitive pricing
- **Free tier**: 10 GB storage included

Tips:
1. Archive old documentation versions after 90 days
2. Use lifecycle policies to delete temp artifacts
3. Enable compression for Markdown and JSON files

## Comparison with Other Storage Providers

| Feature | Cloudflare R2 | AWS S3 | Google Cloud Storage |
|---------|---------------|--------|---------------------|
| Egress Fees | **$0** | $0.09/GB | $0.12/GB |
| Storage | $0.015/GB/mo | $0.023/GB/mo | $0.020/GB/mo |
| API | S3-compatible | Native S3 | GCS API |
| Setup in Epic-4 | `r2://` scheme | `s3://` scheme | `gs://` scheme |

R2 is particularly cost-effective for CI/CD pipelines with frequent artifact downloads.

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [R2 API Reference](https://developers.cloudflare.com/r2/api/)
- [S3-Compatible API Guide](https://developers.cloudflare.com/r2/api/s3/)
- [Epic-4 Documentation](./README.md)

## Support

For issues related to:
- **R2 service**: Contact Cloudflare Support
- **Epic-4 integration**: Open an issue in the Epic-4 repository
- **Credentials/access**: Verify in Cloudflare R2 dashboard
