from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, List, Any, Optional
from epic4.summary import generate_summary, SummaryGenerator
from epic4.storage_client import StorageClient
from epic4.config import config
from epic4.utils import logger
import os

# Comprehensive API metadata for Swagger documentation
app = FastAPI(
    title="Epic-4 Summary Generation Service",
    description="""
## 🚀 CI Living Documentation - Summary Generation API

Production-grade service for generating deterministic change summaries from impact and drift analysis reports.

### Features
- **Deterministic Summaries**: Consistent Markdown and JSON summaries
- **Cloud Storage Integration**: Automatic upload to R2/S3/GCS
- **Fault Tolerant**: Handles missing drift reports gracefully
- **Security Hardened**: No credential logging

### Workflow
1. **Generate Summary**: Process impact and drift reports
2. **Upload Artifacts**: Store summaries in cloud storage
3. **Deliver Docs**: Optional PR creation (SUMMARY_ONLY mode)

### Links
- [GitHub Repository](https://github.com/kireeti-ai/ci-living-documentation)
- [Documentation](https://github.com/kireeti-ai/ci-living-documentation/tree/main/epic-4)
    """,
    version="1.0.0",
    contact={
        "name": "Epic-4 Team",
        "url": "https://github.com/kireeti-ai/ci-living-documentation",
        "email": "support@example.com"
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT"
    },
    openapi_tags=[
        {
            "name": "health",
            "description": "Health check and service status endpoints"
        },
        {
            "name": "summary",
            "description": "Summary generation operations"
        },
        {
            "name": "delivery",
            "description": "Documentation delivery and PR operations"
        }
    ]
)

# ==================== Pydantic Models with Examples ====================

class HealthCheck(BaseModel):
    """Health check response model"""
    status: str = Field(
        ..., 
        description="Service health status",
        example="ok"
    )
    storage_configured: Optional[bool] = Field(
        None,
        description="Whether cloud storage is configured",
        example=True
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "status": "ok",
                "storage_configured": True
            }
        }

class ImpactReport(BaseModel):
    """Impact report structure"""
    report: Dict[str, Any] = Field(
        ...,
        description="Nested impact analysis report",
        example={
            "report": {
                "analysis_summary": {
                    "severity": "MAJOR",
                    "breaking_changes": True,
                    "files_changed": 114
                }
            }
        }
    )

class DriftReport(BaseModel):
    """Drift report structure"""
    findings: List[Dict[str, Any]] = Field(
        default=[],
        description="List of drift findings",
        example=[]
    )
    statistics: Optional[Dict[str, Any]] = Field(
        None,
        description="Drift statistics",
        example={"total_issues": 0}
    )

class GenerateSummaryRequest(BaseModel):
    """Request model for summary generation"""
    impact_report: Dict[str, Any] = Field(
        ...,
        description="Impact analysis report containing severity, changed files, and affected symbols",
        example={
            "report": {
                "analysis_summary": {
                    "severity": "MAJOR",
                    "breaking_changes": True,
                    "files_changed": 114,
                    "affected_symbols": ["./config", "./middleware"],
                    "api_endpoints": 46
                }
            }
        }
    )
    drift_report: Dict[str, Any] = Field(
        ...,
        description="Documentation drift analysis report",
        example={
            "findings": [],
            "statistics": {"total_issues": 0}
        }
    )
    doc_snapshot: Dict[str, Any] = Field(
        default={},
        description="Documentation snapshot metadata (optional but recommended for commit details)",
        example={
            "project_id": "quiz-app-java",
            "generated_at": "2026-02-11T10:59:22Z",
            "commit": "63d36c2b"
        }
    )
    commit_sha: str = Field(
        ...,
        description="Git commit SHA (8+ characters)",
        example="63d36c2b",
        min_length=8
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "impact_report": {
                    "report": {
                        "analysis_summary": {
                            "severity": "MAJOR",
                            "breaking_changes": True,
                            "files_changed": 114
                        }
                    }
                },
                "drift_report": {
                    "findings": [],
                    "statistics": {"total_issues": 0}
                },
                "doc_snapshot": {
                    "project_id": "quiz-app-java",
                    "generated_at": "2026-02-11T10:59:22Z"
                },
                "commit_sha": "63d36c2b"
            }
        }

class SummaryResponse(BaseModel):
    """Response model for summary generation"""
    summary_markdown: str = Field(
        ...,
        description="Generated summary in Markdown format",
        example="# Change Summary\n\n**Commit SHA:** `63d36c2b`\n**Severity:** MAJOR\n\n## Impact Analysis\n..."
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "summary_markdown": "# Change Summary\n\n**Commit SHA:** `63d36c2b`\n**Severity:** MAJOR\n\n## Impact Analysis\n### Changed Modules/Files (114)\n..."
            }
        }

class DeliverDocsRequest(BaseModel):
    """Request model for documentation delivery"""
    commit_sha: str = Field(
        ...,
        description="Git commit SHA",
        example="63d36c2b",
        min_length=8
    )
    target_branch: str = Field(
        ...,
        description="Target branch for PR creation",
        example="main"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "commit_sha": "63d36c2b",
                "target_branch": "main"
            }
        }

class DeliverDocsResponse(BaseModel):
    """Response model for documentation delivery"""
    message: str = Field(
        ...,
        description="Status message",
        example="Summary-only task accepted (PR creation disabled for now)"
    )
    status: str = Field(
        default="accepted",
        description="Task status",
        example="accepted"
    )
    
    class Config:
        json_schema_extra = {
            "example": {
                "message": "Summary-only task accepted (PR creation disabled for now)",
                "status": "accepted"
            }
        }

# ==================== API Endpoints ====================

@app.get(
    "/health",
    response_model=HealthCheck,
    tags=["health"],
    summary="Health Check",
    description="""
    Check the health status of the Epic-4 Summary Generation Service.
    
    Returns:
    - Service status (ok/degraded)
    - Storage configuration status
    
    This endpoint is used by monitoring systems and load balancers.
    """,
    responses={
        200: {
            "description": "Service is healthy",
            "content": {
                "application/json": {
                    "example": {
                        "status": "ok",
                        "storage_configured": True
                    }
                }
            }
        }
    }
)
def health():
    """Health check endpoint for monitoring and load balancers"""
    storage_configured = bool(
        config.R2_ACCOUNT_ID and 
        config.R2_ACCESS_KEY_ID and 
        config.R2_SECRET_ACCESS_KEY
    )
    return {
        "status": "ok",
        "storage_configured": storage_configured
    }

@app.post(
    "/generate-summary",
    response_model=SummaryResponse,
    tags=["summary"],
    summary="Generate Change Summary",
    description="""
    Generate a deterministic change summary from impact and drift analysis reports.
    
    ### Process Flow:
    1. Accepts impact_report, drift_report, and optional doc_snapshot as JSON
    2. Generates comprehensive Markdown summary
    3. Returns formatted summary content
    
    ### Input Requirements:
    - **impact_report**: Must contain nested structure with analysis_summary
    - **drift_report**: Optional drift findings and statistics
    - **doc_snapshot**: Optional metadata (project_id, timestamp) for richer summary
    - **commit_sha**: 8+ character Git commit hash
    
    ### Output:
    - Human-readable Markdown summary with:
      - Commit metadata (Author, Time, Message)
      - Impact analysis (severity, changed files, affected symbols)
      - API impact summary
      - Risk assessment
      - Recommended actions
      - Drift findings (if available)
    
    ### Error Handling:
    - Returns 500 if summary generation fails
    - Validates input schema before processing
    """,
    responses={
        200: {
            "description": "Summary generated successfully",
            "content": {
                "application/json": {
                    "example": {
                        "summary_markdown": "# Change Summary\n\n**Commit SHA:** `63d36c2b`\n**Severity:** MAJOR\n\n## Impact Analysis\n### Changed Modules/Files (114)\n..."
                    }
                }
            }
        },
        422: {
            "description": "Validation error - invalid input format"
        },
        500: {
            "description": "Internal server error - summary generation failed"
        }
    }
)
def api_generate_summary(req: GenerateSummaryRequest):
    """
    Generate a comprehensive change summary from impact and drift reports.
    
    This endpoint processes the provided reports and generates a deterministic
    Markdown summary suitable for PR comments and documentation.
    """
    try:
        import tempfile
        import json

        with tempfile.TemporaryDirectory() as tmpdir:
            impact_path = os.path.join(tmpdir, "impact.json")
            drift_path = os.path.join(tmpdir, "drift.json")

            with open(impact_path, 'w') as f:
                json.dump(req.impact_report, f)
            with open(drift_path, 'w') as f:
                json.dump(req.drift_report, f)

            generator = SummaryGenerator(
                impact_report_path=impact_path, 
                drift_report_path=drift_path, 
                commit_sha=req.commit_sha, 
                output_dir=tmpdir,
                doc_snapshot=req.doc_snapshot
            )
            output_path_md, output_path_json = generator.generate()
            
            with open(output_path_md, 'r') as f:
                content = f.read()

            return {"summary_markdown": content}

    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Summary generation failed: {str(e)}"
        )

@app.post(
    "/deliver-docs-pr",
    response_model=DeliverDocsResponse,
    tags=["delivery"],
    summary="Deliver Documentation (Summary-Only Mode)",
    description="""
    Trigger the documentation delivery process in SUMMARY-ONLY mode.
    
    ### Current Mode: SUMMARY_ONLY
    - Generates summary artifacts
    - Uploads to cloud storage
    - **PR creation is disabled**
    
    ### Process Flow:
    1. Validates commit SHA and target branch
    2. Queues background task for summary generation
    3. Returns immediately with task acceptance status
    4. Background task:
       - Downloads artifacts from cloud (if configured)
       - Generates summary from local impact/drift reports
       - Uploads summary artifacts to cloud storage
    
    ### Requirements:
    - Artifacts must be available at configured paths
    - Cloud storage must be configured (R2/S3/GCS)
    - Valid commit SHA and target branch
    
    ### Response:
    - Immediate acknowledgment of task acceptance
    - Actual processing happens in background
    - Check logs for completion status
    
    ### Note:
    This endpoint is designed for CI/CD integration. PR creation will be
    enabled in future versions (FULL_MODE).
    """,
    responses={
        200: {
            "description": "Task accepted and queued for background processing",
            "content": {
                "application/json": {
                    "example": {
                        "message": "Summary-only task accepted (PR creation disabled for now)",
                        "status": "accepted"
                    }
                }
            }
        },
        422: {
            "description": "Validation error - invalid commit SHA or target branch"
        },
        500: {
            "description": "Internal server error - task queueing failed"
        }
    }
)
def deliver_docs_pr(req: DeliverDocsRequest, background_tasks: BackgroundTasks):
    """
    Trigger documentation delivery in SUMMARY-ONLY mode.
    
    Queues a background task to generate and upload summary artifacts.
    PR creation is currently disabled.
    """
    logger.info(f"Received deliver-docs-pr request for commit {req.commit_sha}")
    
    background_tasks.add_task(run_pr_delivery, req.commit_sha, req.target_branch)
    return {
        "message": "Summary-only task accepted (PR creation disabled for now)",
        "status": "accepted"
    }

def run_pr_delivery(commit_sha: str, target_branch: str):
    logger.info(f"Starting summary-only delivery task for {commit_sha}")
    try:
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

        if config.DOCS_BUCKET_PATH:
            storage_client = StorageClient()
            storage_client.upload_file(summary_md_path, config.DOCS_BUCKET_PATH)
            storage_client.upload_file(summary_json_path, config.DOCS_BUCKET_PATH)
            logger.info("Summary-only delivery task completed")
        else:
            logger.info("Summary-only delivery task completed (no cloud upload configured)")

    except Exception as e:
        logger.error(f"Summary-only delivery task failed: {e}")
