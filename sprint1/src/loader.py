import json
from pathlib import Path

REQUIRED_FIELDS = ["report", "meta", "status"]

def load_impact_report(path: str):
    path = Path(path)
    if not path.exists():
        raise FileNotFoundError(f"impact_report.json not found at {path}")

    data = json.loads(path.read_text())

    for field in REQUIRED_FIELDS:
        if field not in data:
            raise ValueError(f"Missing required field: {field}")

    return data
