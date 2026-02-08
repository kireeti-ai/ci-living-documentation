import boto3
import os

def _get_env(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required env var: {name}")
    return value

def upload_docs_to_r2(local_dir, bucket, prefix):
    s3 = boto3.client(
        "s3",
        endpoint_url=_get_env("R2_ENDPOINT"),
        aws_access_key_id=_get_env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=_get_env("R2_SECRET_ACCESS_KEY"),
        region_name="auto"
    )

    # Validate bucket access
    try:
        s3.head_bucket(Bucket=bucket)
    except Exception as e:
        raise RuntimeError(f"Bucket '{bucket}' not accessible") from e

    for root, _, files in os.walk(local_dir):
        for file in files:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, local_dir).replace("\\", "/")
            key = f"{prefix}/{rel_path}"

            print(f"Uploading → {key}")
            s3.upload_file(full_path, bucket, key)
