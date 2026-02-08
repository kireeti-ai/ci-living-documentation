from loader import load_impact_report
from readme_generator import generate_readme
from api_generator import generate_api_docs
from adr_generator import generate_adrs
from diagram_generator import generate_diagrams
from tree_generator import generate_tree
from snapshot_writer import write_snapshot
from ci.r2_uploader import upload_docs_to_r2
from pathlib import Path
import os

IMPACT_PATH = os.environ.get("IMPACT_REPORT_PATH", "sprint1/input/impact_report.json")

def main():
    impact = load_impact_report(IMPACT_PATH)

    out = Path("sprint1/artifacts/docs")
    out.mkdir(parents=True, exist_ok=True)

    generated = []

    for fn in [
        generate_readme,
        generate_api_docs,
        generate_adrs,
        generate_diagrams,
        generate_tree
    ]:
        try:
            files = fn(impact, out)
            generated.extend(files)
        except Exception as e:
            print(f"Optional doc failed: {fn.__name__} → {e}")

    commit = impact["context"]["full_sha"]
    bucket_path = f"docs/{commit}"

    uploaded = upload_docs_to_r2(
        local_dir=out,
        bucket=os.environ["R2_BUCKET"],
        prefix=bucket_path
    )

    write_snapshot(out, impact, bucket_path, uploaded)

if __name__ == "__main__":
    main()
