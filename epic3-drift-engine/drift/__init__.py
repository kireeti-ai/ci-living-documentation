"""
EPIC-3 Drift Detection Module
Core drift detection and validation logic.
"""

__version__ = "1.0.0"

from drift.code_index import load_code_index
from drift.doc_index import extract_symbols_from_markdown
from drift.severity import assign_severity
from drift.report import build_drift_report
from drift.storage import R2StorageClient

__all__ = [
    "load_code_index",
    "extract_symbols_from_markdown",
    "assign_severity",
    "build_drift_report",
    "R2StorageClient",
]