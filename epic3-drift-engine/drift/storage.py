"""
R2 Storage client for retrieving documentation files from Cloudflare R2.
"""
import os
import logging
import tempfile
from typing import List, Optional
from pathlib import Path
import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from botocore.config import Config


logger = logging.getLogger(__name__)


class R2StorageClient:
    """Client for interacting with Cloudflare R2 storage (S3-compatible)."""

    def __init__(
        self,
        access_key_id: str,
        secret_access_key: str,
        endpoint_url: str,
        bucket_name: str
    ):
        """
        Initialize R2 storage client.

        Args:
            access_key_id: R2 access key ID
            secret_access_key: R2 secret access key
            endpoint_url: R2 endpoint URL
            bucket_name: R2 bucket name
        """
        self.bucket_name = bucket_name

        try:
            # Configure S3 client for R2
            self.s3_client = boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id=access_key_id,
                aws_secret_access_key=secret_access_key,
                config=Config(
                    signature_version='s3v4',
                    retries={'max_attempts': 3, 'mode': 'adaptive'}
                ),
                region_name='auto'
            )
            logger.info(f"R2 storage client initialized for bucket: {bucket_name}")
        except Exception as e:
            logger.error(f"Failed to initialize R2 client: {e}")
            raise

    def download_file(self, key: str, local_path: str) -> bool:
        """
        Download a single file from R2 to local path.

        Args:
            key: Object key in R2 bucket
            local_path: Local file path to save to

        Returns:
            True if successful, False otherwise
        """
        try:
            # Ensure parent directory exists
            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            logger.info(f"Downloading {key} from R2...")
            self.s3_client.download_file(self.bucket_name, key, local_path)
            logger.info(f"Successfully downloaded {key} to {local_path}")
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == '404' or error_code == 'NoSuchKey':
                logger.warning(f"File not found in R2: {key}")
            else:
                logger.error(f"R2 download error for {key}: {e}")
            return False
        except NoCredentialsError:
            logger.error("R2 credentials not found or invalid")
            return False
        except Exception as e:
            logger.error(f"Unexpected error downloading {key}: {e}")
            return False

    def download_directory(
        self,
        prefix: str,
        local_dir: str,
        file_extensions: Optional[List[str]] = None
    ) -> tuple[List[str], List[str]]:
        """
        Download all files with a given prefix from R2.

        Args:
            prefix: Prefix/path in R2 bucket (e.g., "docs/v1/")
            local_dir: Local directory to save files to
            file_extensions: Optional list of file extensions to filter (e.g., [".md"])

        Returns:
            Tuple of (downloaded_files, failed_files)
        """
        downloaded_files = []
        failed_files = []

        try:
            # List objects with prefix
            paginator = self.s3_client.get_paginator('list_objects_v2')
            pages = paginator.paginate(Bucket=self.bucket_name, Prefix=prefix)

            for page in pages:
                if 'Contents' not in page:
                    logger.warning(f"No files found with prefix: {prefix}")
                    continue

                for obj in page['Contents']:
                    key = obj['Key']

                    # Skip directory markers
                    if key.endswith('/'):
                        continue

                    # Filter by extensions if specified
                    if file_extensions:
                        if not any(key.endswith(ext) for ext in file_extensions):
                            continue

                    # Construct local path
                    relative_path = key[len(prefix):].lstrip('/')
                    local_path = os.path.join(local_dir, relative_path)

                    # Download file
                    if self.download_file(key, local_path):
                        downloaded_files.append(local_path)
                    else:
                        failed_files.append(key)

            logger.info(
                f"Downloaded {len(downloaded_files)} files, "
                f"{len(failed_files)} failed from prefix: {prefix}"
            )

        except Exception as e:
            logger.error(f"Error listing/downloading directory {prefix}: {e}")

        return downloaded_files, failed_files

    def file_exists(self, key: str) -> bool:
        """
        Check if a file exists in R2.

        Args:
            key: Object key in R2 bucket

        Returns:
            True if file exists, False otherwise
        """
        try:
            self.s3_client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            if error_code == '404' or error_code == 'NoSuchKey':
                return False
            logger.error(f"Error checking file existence {key}: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error checking {key}: {e}")
            return False
