import json
import os

def load_impact_report():
    base_dir = os.path.dirname(os.path.dirname(__file__))
    path = os.path.join(base_dir, "input", "impact_report.json")

    with open(path, "r") as f:
        return json.load(f)