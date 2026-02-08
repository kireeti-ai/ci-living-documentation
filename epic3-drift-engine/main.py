"""
EPIC-3 Drift Detection FastAPI Server
Provides REST API endpoints for drift detection and validation.
"""
import logging
import os
import sys
from typing import Dict, Any, Optional
from contextlib import asynccontextmanager
import httpx
import json

from fastapi import FastAPI, HTTPException, UploadFile, File, BackgroundTasks, status
from fastapi.responses import JSONResponse, FileResponse
from pydantic import BaseModel, Field
import uvicorn

from run_drift import run_drift_analysis
from config import settings


# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger(__name__)


# Request/Response Models
class DriftAnalysisRequest(BaseModel):
    """Request model for triggering drift analysis."""
    impact_report_url: Optional[str] = Field(
        default=None,
        description="URL to fetch impact_report.json from Epic-1 code-detect server"
    )
    doc_snapshot_url: Optional[str] = Field(
        default=None,
        description="URL to fetch doc_snapshot.json from Epic-2 server"
    )
    impact_report_path: Optional[str] = Field(
        default="inputs/impact_report.json",
        description="Local path to impact_report.json (used if URL not provided)"
    )
    doc_snapshot_path: Optional[str] = Field(
        default="inputs/doc_snapshot.json",
        description="Local path to doc_snapshot.json (used if URL not provided)"
    )
    output_report_path: str = Field(
        default="outputs/drift_report.json",
        description="Path to write drift_report.json"
    )
    use_r2_storage: bool = Field(
        default=True,
        description="Whether to retrieve docs from R2 storage"
    )


class DriftAnalysisResponse(BaseModel):
    """Response model for drift analysis results."""
    status: str
    message: str
    report_id: Optional[str] = None
    drift_detected: Optional[bool] = None
    overall_severity: Optional[str] = None
    report_path: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    service: str
    version: str
    storage_configured: bool


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for FastAPI app."""
    logger.info("=" * 60)
    logger.info("EPIC-3 Drift Detection Engine Starting")
    logger.info("=" * 60)
    logger.info(f"Log Level: {settings.log_level}")
    logger.info(f"R2 Endpoint: {settings.r2_endpoint_url or 'Not configured'}")
    logger.info(f"R2 Bucket: {settings.r2_bucket_name or 'Not configured'}")
    logger.info("=" * 60)
    yield
    logger.info("EPIC-3 Drift Detection Engine Shutting Down")


# Initialize FastAPI app
app = FastAPI(
    title="EPIC-3 Drift Detection & Validation Engine",
    description="Detects drift between code artifacts and documentation",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint with API information."""
    return {
        "service": "EPIC-3 Drift Detection Engine",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "analyze": "/analyze (POST)",
            "report": "/report/{report_id} (GET)",
            "latest_report": "/report/latest (GET)"
        }
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    storage_configured = bool(
        settings.r2_access_key_id and
        settings.r2_secret_access_key and
        settings.r2_endpoint_url
    )

    return HealthResponse(
        status="healthy",
        service="epic3-drift-engine",
        version="1.0.0",
        storage_configured=storage_configured
    )


@app.post("/analyze", response_model=DriftAnalysisResponse)
async def analyze_drift(request: DriftAnalysisRequest):
    """
    Trigger drift analysis.

    Fetches or reads impact_report.json and doc_snapshot.json, retrieves documentation
    from R2 storage, performs drift detection, and generates drift_report.json.
    """
    try:
        logger.info(f"Received drift analysis request")

        # Ensure inputs directory exists
        os.makedirs("inputs", exist_ok=True)

        # Handle impact_report - fetch from URL or use local file
        if request.impact_report_url:
            logger.info(f"Fetching impact report from: {request.impact_report_url}")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(request.impact_report_url)
                response.raise_for_status()
                impact_data = response.json()

            # Save to local file
            impact_report_path = "inputs/impact_report.json"
            with open(impact_report_path, 'w') as f:
                json.dump(impact_data, f, indent=2)
            logger.info(f"Saved impact report to {impact_report_path}")
        else:
            impact_report_path = request.impact_report_path
            if not os.path.exists(impact_report_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Impact report not found: {impact_report_path}"
                )

        # Handle doc_snapshot - fetch from URL or use local file
        if request.doc_snapshot_url:
            logger.info(f"Fetching doc snapshot from: {request.doc_snapshot_url}")
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(request.doc_snapshot_url)
                response.raise_for_status()
                doc_data = response.json()

            # Save to local file
            doc_snapshot_path = "inputs/doc_snapshot.json"
            with open(doc_snapshot_path, 'w') as f:
                json.dump(doc_data, f, indent=2)
            logger.info(f"Saved doc snapshot to {doc_snapshot_path}")
        else:
            doc_snapshot_path = request.doc_snapshot_path
            if request.use_r2_storage and not os.path.exists(doc_snapshot_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Doc snapshot not found: {doc_snapshot_path}"
                )

        logger.info(f"Impact report: {impact_report_path}")
        logger.info(f"Doc snapshot: {doc_snapshot_path}")
        logger.info(f"Use R2 storage: {request.use_r2_storage}")

        # Run drift analysis
        drift_report = run_drift_analysis(
            impact_report_path=impact_report_path,
            doc_snapshot_path=doc_snapshot_path,
            output_report_path=request.output_report_path,
            use_r2_storage=request.use_r2_storage
        )

        return DriftAnalysisResponse(
            status="success",
            message="Drift analysis completed successfully",
            report_id=drift_report["report_id"],
            drift_detected=drift_report["drift_detected"],
            overall_severity=drift_report["overall_severity"],
            report_path=request.output_report_path
        )

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Drift analysis failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Drift analysis failed: {str(e)}"
        )


@app.post("/upload/impact-report")
async def upload_impact_report(file: UploadFile = File(...)):
    """
    Upload impact_report.json from Epic-1.
    """
    try:
        os.makedirs("inputs", exist_ok=True)
        file_path = os.path.join("inputs", "impact_report.json")

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        logger.info(f"Uploaded impact_report.json ({len(content)} bytes)")

        return {
            "status": "success",
            "message": "Impact report uploaded successfully",
            "path": file_path,
            "size": len(content)
        }
    except Exception as e:
        logger.error(f"Failed to upload impact report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@app.post("/upload/doc-snapshot")
async def upload_doc_snapshot(file: UploadFile = File(...)):
    """
    Upload doc_snapshot.json from Epic-2.
    """
    try:
        os.makedirs("inputs", exist_ok=True)
        file_path = os.path.join("inputs", "doc_snapshot.json")

        content = await file.read()
        with open(file_path, "wb") as f:
            f.write(content)

        logger.info(f"Uploaded doc_snapshot.json ({len(content)} bytes)")

        return {
            "status": "success",
            "message": "Doc snapshot uploaded successfully",
            "path": file_path,
            "size": len(content)
        }
    except Exception as e:
        logger.error(f"Failed to upload doc snapshot: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@app.get("/report/latest")
async def get_latest_report():
    """
    Retrieve the latest drift_report.json.
    """
    report_path = settings.output_report_path

    if not os.path.exists(report_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No drift report found. Run analysis first."
        )

    return FileResponse(
        report_path,
        media_type="application/json",
        filename="drift_report.json"
    )


@app.get("/report/{report_id}")
async def get_report_by_id(report_id: str):
    """
    Retrieve a specific drift report by ID.

    Note: This implementation returns the latest report.
    For production, implement proper report storage/retrieval by ID.
    """
    # For now, just return latest report
    # In production, you'd query a database or storage by report_id
    return await get_latest_report()


@app.delete("/report/latest")
async def delete_latest_report():
    """
    Delete the latest drift report.
    """
    report_path = settings.output_report_path

    if not os.path.exists(report_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No drift report found"
        )

    try:
        os.remove(report_path)
        logger.info(f"Deleted drift report: {report_path}")
        return {
            "status": "success",
            "message": "Drift report deleted successfully"
        }
    except Exception as e:
        logger.error(f"Failed to delete report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Delete failed: {str(e)}"
        )


@app.get("/config")
async def get_configuration():
    """
    Get current configuration (excluding secrets).
    """
    return {
        "log_level": settings.log_level,
        "r2_endpoint_configured": bool(settings.r2_endpoint_url),
        "r2_bucket_name": settings.r2_bucket_name or "Not configured",
        "impact_report_path": settings.impact_report_path,
        "doc_snapshot_path": settings.doc_snapshot_path,
        "output_report_path": settings.output_report_path
    }


def start_server():
    """Start the FastAPI server."""
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.log_level.lower()
    )


if __name__ == "__main__":
    start_server()
