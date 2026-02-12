"""
EPIC-3 Drift Detection & Validation Engine
Orchestrates drift detection between code artifacts and documentation.
"""
import json
import logging
import os
import sys
import tempfile
from pathlib import Path
from typing import Dict, Any, Optional

from drift.code_index import load_code_index
from drift.doc_index import extract_symbols_from_markdown
from drift.comparators.symbol_drift import detect_symbol_drift
from drift.comparators.api_drift import detect_api_drift
from drift.comparators.schema_drift import detect_schema_drift
from drift.severity import assign_severity
from drift.report import build_drift_report
from drift.storage import R2StorageClient
from config import settings


# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)


def load_doc_snapshot(path: str) -> Optional[Dict[str, Any]]:
    """
    Load doc_snapshot.json from Epic-2.

    Args:
        path: Path to doc_snapshot.json

    Returns:
        Dictionary containing snapshot_id, commit, docs_bucket_path or None
    """
    try:
        with open(path, 'r', encoding='utf-8') as f:
            snapshot = json.load(f)

        required_fields = ['snapshot_id', 'commit', 'docs_bucket_path']
        for field in required_fields:
            if field not in snapshot:
                logger.error(f"Missing required field in doc_snapshot.json: {field}")
                return None

        logger.info(f"Loaded doc_snapshot: {snapshot['snapshot_id']}")
        return snapshot
    except FileNotFoundError:
        logger.error(f"doc_snapshot.json not found at: {path}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in doc_snapshot.json: {e}")
        return None
    except Exception as e:
        logger.error(f"Error loading doc_snapshot.json: {e}")
        return None


def retrieve_documentation_from_storage(
    docs_bucket_path: str,
    storage_client: R2StorageClient
) -> tuple[str, list[str]]:
    """
    Retrieve documentation files from R2 storage.

    Args:
        docs_bucket_path: Path/prefix in R2 bucket
        storage_client: Initialized R2 storage client

    Returns:
        Tuple of (local_temp_dir, list of failed files)
    """
    temp_dir = tempfile.mkdtemp(prefix="epic3_docs_")
    logger.info(f"Downloading documentation from R2: {docs_bucket_path}")

    downloaded_files, failed_files = storage_client.download_directory(
        prefix=docs_bucket_path,
        local_dir=temp_dir,
        file_extensions=[".md"]
    )

    logger.info(f"Downloaded {len(downloaded_files)} documentation files")
    if failed_files:
        logger.warning(f"Failed to download {len(failed_files)} files: {failed_files}")

    return temp_dir, failed_files


def run_drift_analysis(
    impact_report_path: str,
    doc_snapshot_path: str,
    output_report_path: str,
    use_r2_storage: bool = True
) -> Dict[str, Any]:
    """
    Execute complete drift analysis pipeline.

    Args:
        impact_report_path: Path to impact_report.json from Epic-1
        doc_snapshot_path: Path to doc_snapshot.json from Epic-2
        output_report_path: Path to write drift_report.json
        use_r2_storage: Whether to use R2 storage (True) or local docs (False)

    Returns:
        Drift report dictionary
    """
    logger.info("=" * 60)
    logger.info("Starting EPIC-3 Drift Detection Analysis")
    logger.info("=" * 60)

    # Step 1: Load code symbols from impact report
    logger.info(f"Loading impact report from: {impact_report_path}")
    code_data = load_code_index(impact_report_path)
    all_symbols = code_data["all_symbols"]
    api_symbols = code_data["api_symbols"]
    schema_symbols = code_data["schema_symbols"]
    logger.info(f"Loaded {len(all_symbols)} code symbols ({len(api_symbols)} API, {len(schema_symbols)} schema)")

    # Load repo metadata for report
    try:
        with open(impact_report_path, 'r') as f:
            impact_data = json.load(f)
            repo_metadata = impact_data
    except Exception as e:
        logger.error(f"Could not load repo metadata: {e}")
        repo_metadata = {}

    # Step 2: Load doc_snapshot.json
    doc_symbols = set()
    docs_bucket_path = "local/docs"
    missing_files = []
    temp_docs_dir = None

    if use_r2_storage:
        logger.info(f"Loading doc_snapshot from: {doc_snapshot_path}")
        doc_snapshot = load_doc_snapshot(doc_snapshot_path)

        if not doc_snapshot:
            logger.error("Failed to load doc_snapshot.json. Cannot proceed with R2 storage retrieval.")
            raise ValueError("doc_snapshot.json is required for R2 storage mode")

        docs_bucket_path = doc_snapshot["docs_bucket_path"]
        logger.info(f"Documentation storage path: {docs_bucket_path}")

        # Step 3: Initialize R2 storage client
        if not all([settings.r2_access_key_id, settings.r2_secret_access_key, settings.r2_endpoint_url]):
            logger.error("R2 credentials not configured. Set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_ENDPOINT_URL")
            raise ValueError("R2 storage credentials not configured")

        storage_client = R2StorageClient(
            access_key_id=settings.r2_access_key_id,
            secret_access_key=settings.r2_secret_access_key,
            endpoint_url=settings.r2_endpoint_url,
            bucket_name=settings.r2_bucket_name
        )

        # Step 4: Retrieve documentation from R2
        temp_docs_dir, missing_files = retrieve_documentation_from_storage(
            docs_bucket_path, storage_client
        )

        # Step 5: Extract symbols from downloaded documentation
        logger.info(f"Extracting symbols from documentation in: {temp_docs_dir}")
        doc_symbols = extract_symbols_from_markdown(temp_docs_dir)
    else:
        # Local mode: use inputs/docs directly
        logger.info("Using local documentation from inputs/docs")
        doc_symbols = extract_symbols_from_markdown("inputs/docs")

    logger.info(f"Found {len(doc_symbols)} symbols in documentation")

    # Step 6: Detect various types of drift
    logger.info("Analyzing drift...")
    symbol_drift_result = detect_symbol_drift(all_symbols, doc_symbols)
    api_drift_result = detect_api_drift(api_symbols, doc_symbols)
    schema_drift_result = detect_schema_drift(schema_symbols, doc_symbols)

    logger.info(f"Symbol drift: {len(symbol_drift_result['undocumented'])} undocumented, {len(symbol_drift_result['obsolete'])} obsolete")
    logger.info(f"API drift: {len(api_drift_result)} undocumented APIs")
    logger.info(f"Schema drift: {len(schema_drift_result)} undocumented schemas")

    # Step 7: Assign severity level
    severity_level = assign_severity(
        api_drift_result,
        schema_drift_result,
        symbol_drift_result
    )
    logger.info(f"Overall severity: {severity_level}")

    # Step 8: Build final report
    drift_report = build_drift_report(
        symbol_drift_result,
        api_drift_result,
        schema_drift_result,
        severity_level,
        repo_metadata,
        docs_bucket_path,
        missing_files if missing_files else None
    )

    # Step 9: Write drift_report.json
    os.makedirs(os.path.dirname(output_report_path), exist_ok=True)
    with open(output_report_path, 'w', encoding='utf-8') as f:
        json.dump(drift_report, f, indent=2)

    logger.info(f"Drift report written to: {output_report_path}")
    logger.info("=" * 60)
    logger.info(f"Analysis complete. Drift detected: {drift_report['drift_detected']}")
    logger.info("=" * 60)

    # Cleanup temp directory
    if temp_docs_dir and os.path.exists(temp_docs_dir):
        import shutil
        shutil.rmtree(temp_docs_dir)

    return drift_report


def main():
    """
    Main function to run drift analysis from command line.
    """
    try:
        drift_report = run_drift_analysis(
            impact_report_path=settings.impact_report_path,
            doc_snapshot_path=settings.doc_snapshot_path,
            output_report_path=settings.output_report_path,
            use_r2_storage=bool(settings.r2_endpoint_url)
        )

        # Print summary
        print("\n" + "=" * 60)
        print("DRIFT ANALYSIS SUMMARY")
        print("=" * 60)
        print(f"Report ID: {drift_report['report_id']}")
        print(f"Drift Detected: {drift_report['drift_detected']}")
        print(f"Overall Severity: {drift_report['overall_severity']}")
        print(f"Swagger Sync Required: {drift_report['swagger_sync_required']}")
        print(f"Total Issues: {drift_report['statistics']['total_drift_issues']}")
        print("=" * 60)

    except Exception as e:
        logger.error(f"Drift analysis failed: {e}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    main()