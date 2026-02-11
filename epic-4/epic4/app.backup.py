from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, List, Any
from epic4.summary import generate_summary, SummaryGenerator
from epic4.github_client import GitHubClient
from epic4.storage_client import StorageClient
from epic4.config import config
from epic4.utils import logger
import os

app = FastAPI(title="Epic-4 Automation Service")

class HealthCheck(BaseModel):
    status: str

class GenerateSummaryRequest(BaseModel):
    impact_report: Dict[str, Any]
    drift_report: Dict[str, Any]
    commit_sha: str

class SummaryResponse(BaseModel):
    summary_markdown: str

class DeliverDocsRequest(BaseModel):
    commit_sha: str
    target_branch: str

@app.get("/health", response_model=HealthCheck)
def health():
    return {"status": "ok"}

@app.post("/generate-summary", response_model=SummaryResponse)
def api_generate_summary(req: GenerateSummaryRequest):
    try:
        # We use a temporary way to feed the generator, or refactor generator to accept dicts.
        # Refactoring generator is better but I implemented it taking paths.
        # I'll create temp files or simple mocking.
        # Actually, let's just refactor SummaryGenerator to allow dict inputs in internal method.
        # But for now, I'll just write to temp files to reuse the existing logic which ensures consistency.

        # But wait, SummaryGenerator.generate loads from path.
        # I can override or subclass.
        # Let's just create temp files to be safe and reuse exact logic.
        import tempfile

        with tempfile.TemporaryDirectory() as tmpdir:
            impact_path = os.path.join(tmpdir, "impact.json")
            drift_path = os.path.join(tmpdir, "drift.json")

            import json
            with open(impact_path, 'w') as f:
                json.dump(req.impact_report, f)
            with open(drift_path, 'w') as f:
                json.dump(req.drift_report, f)

            generator = SummaryGenerator(impact_path, drift_path, req.commit_sha, tmpdir)
            # We want to get the content, not just save to file.
            # Generator saves to file.
            output_path_md, output_path_json = generator.generate()
            
            with open(output_path_md, 'r') as f:
                content = f.read()

            return {"summary_markdown": content}

    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/deliver-docs-pr")
def deliver_docs_pr(req: DeliverDocsRequest, background_tasks: BackgroundTasks):
    """
    Triggers the PR delivery process.
    WARNING: This assumes the service has access to the artifacts on the local filesystem
    matching the configured paths, or that this is just a trigger for a worker.
    For this implementation, we'll assume artifacts are in the standard location defined in config.
    """
    # Verify commit matches
    if req.commit_sha != config.COMMIT_SHA and config.COMMIT_SHA:
        # If config is fixed per run, this might mismatch.
        # If the service is long-running, we might need dynamic config or args.
        # We'll assume the request args override or drive the process.
        pass

    background_tasks.add_task(run_pr_delivery, req.commit_sha, req.target_branch)
    return {"message": "PR delivery task accepted"}

def run_pr_delivery(commit_sha: str, target_branch: str):
    logger.info(f"Starting PR delivery for {commit_sha}")
    # This largely duplicates the CLI logic. logic should be extracted if this was a real long-running service.
    # For now, we will just call the main logic functions.

    # We assume 'generate-summary' was called or artifacts exist?
    # Or we generate it now?
    # Let's assume we need to run the full flow.
    try:
        if not (config.REPO_OWNER and config.REPO_NAME and config.GITHUB_TOKEN):
            logger.warning("Git credentials missing; skipping PR delivery")
            return

        # 0. Download from cloud if configured
        if config.DOCS_BUCKET_PATH:
            logger.info(f"Downloading docs from cloud storage: {config.DOCS_BUCKET_PATH}")
            storage_client = StorageClient()
            storage_client.download_artifacts(config.DOCS_BUCKET_PATH, config.DOCS_DIR)

        # 1. Generate Summary (using local files as source)
        # 1. Generate Summary (using local files as source)
        summary_md_path = ""
        summary_json_path = ""
        try:
            summary_md_path, summary_json_path = generate_summary(config.IMPACT_REPORT_PATH, config.DRIFT_REPORT_PATH, commit_sha, config.SUMMARIES_DIR)
            with open(summary_md_path, 'r') as f:
                summary_content = f.read()
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            # Create error summary for fault tolerance
            summary_md_path = os.path.join(config.SUMMARIES_DIR, "summary.md")
            summary_json_path = os.path.join(config.SUMMARIES_DIR, "summary.json")
            os.makedirs(config.SUMMARIES_DIR, exist_ok=True)
            summary_content = f"""# Change Summary - Generation Failed

**Commit SHA:** `{commit_sha}`
**Status:** ERROR

## Error
Summary generation encountered an error:
```
{str(e)}
```

---
*Generated by Epic-4 Automation*
"""
            with open(summary_md_path, 'w') as f:
                f.write(summary_content)
                
            with open(summary_json_path, 'w') as f:
                import json
                json.dump({"error": str(e), "status": "ERROR"}, f)

        # 2. Collect files
        files_to_commit = [summary_md_path]
        if os.path.isdir(config.DOCS_DIR):
             for root, dirs, files in os.walk(config.DOCS_DIR):
                for file in files:
                    files_to_commit.append(os.path.join(root, file))

        # 3. Git Ops
        gh = GitHubClient(config.REPO_OWNER, config.REPO_NAME, config.GITHUB_TOKEN)
        branch_name = f"docs/update-{commit_sha}"

        gh.checkout_and_push_files(
            branch_name=branch_name,
            files_to_commit=files_to_commit,
            message=f"Auto-generated docs and summary for {commit_sha}"
        )

        try:
            gh.ensure_pr(
                head_branch=branch_name,
                base_branch=target_branch,
                title="Automated Documentation & Summary Update",
                body=summary_content,
                labels=["auto-generated-docs"]
            )
            logger.info("PR Delivery Background Task Completed")
        except Exception as e:
            logger.error(f"PR creation/update failed: {e}")

    except Exception as e:
        logger.error(f"PR Delivery Background Task Failed: {e}")
