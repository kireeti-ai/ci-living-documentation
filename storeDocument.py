import os
import boto3
from botocore.config import Config

# R2 Configuration
R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID", "1dd9edcc10afe8addc630b1b16428e00")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET_NAME = os.environ.get("R2_BUCKET_NAME", "ci-living-docs")
R2_ENDPOINT = os.environ.get("R2_ENDPOINT", f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com")

COMMIT_SHA = os.environ.get("GIT_COMMIT", "local-test")

# Create R2 client (S3-compatible)
r2_client = boto3.client(
    's3',
    endpoint_url=R2_ENDPOINT,
    aws_access_key_id=R2_ACCESS_KEY_ID,
    aws_secret_access_key=R2_SECRET_ACCESS_KEY,
    config=Config(signature_version='s3v4'),
    region_name='auto'
)

def uploadFile(local_path: str, remote_path: str):
    """Upload a file to R2 bucket"""
    with open(local_path, "rb") as f:
        response = r2_client.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=remote_path,
            Body=f,
            ContentType=get_content_type(local_path)
        )
    return response

def get_content_type(path: str) -> str:
    """Determine content type based on file extension"""
    if path.endswith('.md'):
        return 'text/markdown'
    elif path.endswith('.json'):
        return 'application/json'
    elif path.endswith('.txt'):
        return 'text/plain'
    else:
        return 'application/octet-stream'

def uploadDocument(project_name: str, version: str, doc_path: str, metadata: dict = None):
    """
    Upload a document and its metadata to R2
    
    Args:
        project_name: Name of the project
        version: Document version (e.g., commit SHA or tag)
        doc_path: Local path to the markdown document
        metadata: Optional metadata dictionary
    """
    import json
    from datetime import datetime
    
    # Upload the document
    doc_filename = os.path.basename(doc_path)
    remote_doc_path = f"{project_name}/{version}/{doc_filename}"
    uploadFile(doc_path, remote_doc_path)
    print(f"Uploaded document to: {remote_doc_path}")
    
    # Upload metadata if provided
    if metadata:
        metadata_with_defaults = {
            "version": version,
            "createdAt": datetime.utcnow().isoformat() + "Z",
            "updatedAt": datetime.utcnow().isoformat() + "Z",
            "tags": [],
            **metadata
        }
        
        metadata_path = f"{project_name}/{version}/metadata.json"
        r2_client.put_object(
            Bucket=R2_BUCKET_NAME,
            Key=metadata_path,
            Body=json.dumps(metadata_with_defaults, indent=2),
            ContentType='application/json'
        )
        print(f"Uploaded metadata to: {metadata_path}")
    
    return True

# Example usage
if __name__ == "__main__":
    # Example: Upload a test document
    # uploadDocument(
    #     project_name="my-project",
    #     version=COMMIT_SHA,
    #     doc_path="./docs/README.md",
    #     metadata={
    #         "branch": "main",
    #         "commit": COMMIT_SHA,
    #         "commitUrl": f"https://github.com/user/repo/commit/{COMMIT_SHA}",
    #         "branchUrl": "https://github.com/user/repo/tree/main",
    #         "title": "Project Documentation",
    #         "description": "Auto-generated documentation"
    #     }
    # )
    pass
