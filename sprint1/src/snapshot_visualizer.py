def generate_snapshot_md(snapshot):
    md = []

    md.append(f"# 📦 Documentation Snapshot\n")
    md.append(f"**Repository:** {snapshot['repository']}")
    md.append(f"**Branch:** {snapshot['branch']}")
    md.append(f"**Commit:** {snapshot['commit_sha']}\n")

    md.append("## 📄 Generated Documents")
    for doc in snapshot["generated_docs"]:
        md.append(f"- ✅ {doc}")

    md.append("\n## 📊 Metrics")
    for k, v in snapshot["metrics"].items():
        md.append(f"- **{k.replace('_',' ').title()}**: {v}")

    md.append("\n## 🧩 Diagrams")
    for d in snapshot["diagrams"]:
        md.append(f"- `{d}`")

    md.append("\n## 🔍 Change Summary")
    for c in snapshot["changes"]:
        md.append(f"- `{c['file']}` → **{c['severity']}**")

    return "\n".join(md)