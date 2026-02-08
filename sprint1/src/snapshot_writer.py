import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path

def write_snapshot(output_dir, impact, bucket_path, generated_files):
    snapshot_id = hashlib.sha256(
        f"{impact['context']['full_sha']}".encode()
    ).hexdigest()[:16]

    snapshot = {
        "snapshot_id": snapshot_id,
        "repository": impact["context"]["repository"],
        "commit_sha": impact["context"]["full_sha"],
        "branch": impact["context"]["branch"],
        "docs_bucket_path": bucket_path,
        "generated_files": generated_files,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

    out = Path(output_dir) / "doc_snapshot.json"
    out.write_text(json.dumps(snapshot, indent=2))
    return snapshot
