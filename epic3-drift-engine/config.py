"""
Configuration management for Epic-3 Drift Engine.
Reads credentials and settings from environment variables.
"""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # R2 / S3-compatible storage credentials
    r2_access_key_id: str = os.getenv("R2_ACCESS_KEY_ID", "")
    r2_secret_access_key: str = os.getenv("R2_SECRET_ACCESS_KEY", "")
    r2_endpoint_url: str = os.getenv("R2_ENDPOINT_URL", "")
    r2_bucket_name: str = os.getenv("R2_BUCKET_NAME", "")

    # Application settings
    log_level: str = os.getenv("LOG_LEVEL", "INFO")

    # Input/Output paths
    impact_report_path: str = "inputs/impact_report.json"
    doc_snapshot_path: str = "inputs/doc_snapshot.json"
    output_report_path: str = "outputs/drift_report.json"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
