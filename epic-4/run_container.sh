docker run -d \
  -p 8000:8000 \
  -e GITHUB_TOKEN="<REPLACE_WITH_YOUR_TOKEN>" \
  -e REPO_OWNER="<REPLACE>" \
  -e REPO_NAME="<REPLACE>" \
  -e COMMIT_SHA="HEAD" \
  -v $(pwd)/artifacts:/app/artifacts \
  --name epic4-app \
  epic4-service:latest
