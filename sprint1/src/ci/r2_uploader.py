import boto3
import os
import logging
from pathlib import Path

log = logging.getLogger("r2")

def upload_docs_to_r2(local_dir, bucket, prefix):
    s3 = boto3.client(
        "s3",
        endpoint_url=os.environ["R2_ENDPOINT"],
        aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
        region_name="auto"
    )

    uploaded = []

    for path in Path(local_dir).rglob("*"):
        if path.is_file():
            key = f"{prefix}/{path.relative_to(local_dir)}"
            try:
                s3.upload_file(str(path), bucket, key)
                uploaded.append(key)
            except Exception as e:
                log.error(f"Upload failed: {key} → {e}")

    return uploaded
