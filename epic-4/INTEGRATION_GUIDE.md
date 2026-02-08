# Epic-4 Integration Guide

This guide explains how Epic-4 works and how to integrate it into your "customer" repository (the repository you want to generate documentation for).

## How It Works

Epic-4 is the "Delivery Phase" of your automation pipeline. It assumes that earlier steps in your CI pipeline have analyzed the code and produced specific **artifacts**.

1.  **Analyze Phase (Pre-requisite)**: Your CI runs analysis tools (Epic-2/Epic-3) which generate:
    *   `impact_report.json`: What changed in the code.
    *   `drift_report.json`: Any detected drift or violations.
    *   `docs/`: Generated API docs, ADRs, or README updates.
2.  **Execution Phase (Epic-4)**:
    *   Epic-4 reads these artifacts.
    *   It generates a human-readable **Markdown Summary**.
    *   It creates a new git branch `auto/docs/<commit_sha>`.
    *   It commits the summary and the documentation files to this branch.
    *   It pushes the branch to your repository and opens (or updates) a **Pull Request**.

---

## Inputs Required

Epic-4 requires two types of inputs: **Files (Artifacts)** and **Environment Variables**.

### 1. Artifacts (File Inputs)
Your pipeline must produce these files before running Epic-4.

| File Path | Description | Format |
|-----------|-------------|--------|
| `artifacts/impact_report.json` | Details changes and severity. | `{"severity": "HIGH", "changed_files": ["..."], "affected_symbols": ["..."]}` |
| `artifacts/drift_report.json` | Details drift issues. | `{"issues": [{"description": "...", "severity": "..."}]}` |
| `artifacts/docs/` | Directory containing generated docs. | Any file structure (e.g., `.md`, `.html`). |

### 2. Environment Variables
These configurations tell Epic-4 where to push the code.

*   `GITHUB_TOKEN`: Required to push code and create PRs. Use `${{ secrets.GITHUB_TOKEN }}` in GitHub Actions.
*   `REPO_OWNER`: e.g., `my-org`
*   `REPO_NAME`: e.g., `backend-service`
*   `COMMIT_SHA`: The commit hash we are generating docs for.

---

## Integration: Where do I use the YAML?

Yes, you should use **YAML** in the **Customer's Repository**.

You need to add a step to your existing GitHub Actions workflow (or create a new one) that runs **after** your analysis steps.

### Example Workflow file
Place this in `.github/workflows/documentation.yaml` in your repository.

```yaml
name: Automated Documentation

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  generate-and-deliver:
    runs-on: ubuntu-latest
    permissions:
      contents: write       # Required to push the new branch
      pull-requests: write  # Required to create the PR
      issues: write        # Required to post comments

    steps:
      # 1. Checkout your code
      - uses: actions/checkout@v3

      # 2. RUN YOUR ANALYSIS TOOLS HERE
      # This part depends on your specific setup.
      # It MUST populate 'artifacts/' folder.
      - name: Generate Analysis Artifacts
        run: |
          mkdir -p artifacts/docs
          # Example command:
          # ./analyze_code.sh --output artifacts/impact_report.json
          # ./generate_docs.sh --output artifacts/docs

      # 3. Setup Python for Epic-4
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      # 4. Install Epic-4 (from PyPI, Git, or local)
      - name: Install Epic-4
        run: |
          # If Epic-4 is a private package:
          # pip install git+https://${{ secrets.GH_TOKEN }}@github.com/my-org/epic-4.git
          
          # OR for testing if source is included:
          pip install epic4

      # 5. Run Epic-4 CLI
      - name: Run Documentation Delivery
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          REPO_OWNER: ${{ github.repository_owner }}
          REPO_NAME: ${{ github.event.repository.name }}
          TARGET_BRANCH: main
          COMMIT_SHA: ${{ github.sha }}
        run: |
          python -m epic4.run \
            --impact artifacts/impact_report.json \
            --drift artifacts/drift_report.json \
            --docs artifacts/docs \
            --commit ${{ github.sha }}
```

### Key Takeaways
1.  **Where**: `.github/workflows/` in the customer repository.
2.  **How**: Use the `python -m epic4.run` command in a workflow step.
3.  **Order**: Run it **after** you have generated the JSON reports and documentation files.
