import boto3
import os
import time


def _get_env(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value


def upload_docs_to_r2(local_dir, bucket, prefix, max_retries=3, backoff_seconds=1.0):
    s3 = boto3.client(
        "s3",
        endpoint_url=_get_env("R2_ENDPOINT"),
        aws_access_key_id=_get_env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=_get_env("R2_SECRET_ACCESS_KEY"),
        region_name="auto"
    )

    try:
        s3.head_bucket(Bucket=bucket)
    except Exception as e:
        raise RuntimeError(f"Bucket '{bucket}' not accessible") from e

    for root, _, files in os.walk(local_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, local_dir).replace("\\", "/")
            key = f"{prefix}/{rel_path}"

            attempt = 0
            while True:
                try:
                    print(f"Uploading → {key}")
                    s3.upload_file(full_path, bucket, key)
                    break
                except Exception as e:
                    attempt += 1
                    if attempt > max_retries:
                        raise RuntimeError(f"Upload failed after {max_retries} retries: {key}") from e
                    sleep_for = backoff_seconds * (2 ** (attempt - 1))
                    print(f"⚠️ Upload failed for {key} (attempt {attempt}/{max_retries}). Retrying in {sleep_for:.1f}s")
                    time.sleep(sleep_for)
