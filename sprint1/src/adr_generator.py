#!/usr/bin/env python3
"""
Architecture Decision Record (ADR) Generator
Creates ADRs based on code analysis
"""
from datetime import datetime

def generate_adr(report):
    """
    Generate Architecture Decision Record from impact report
    
    Args:
        report (dict): Impact report from EPIC-1
    
    Returns:
        str: ADR document in markdown format
    """
    context = report.get("context", {})
    analysis = report.get("analysis_summary", {})
    changes = report.get("changes", [])
    
    repository = context.get("repository", "Unknown")
    branch = context.get("branch", "main")
    commit = context.get("commit_sha", "unknown")
    author = context.get("author", "Unknown")
    severity = analysis.get("highest_severity", "UNKNOWN")
    breaking = analysis.get("breaking_changes_detected", False)
    
    # Generate ADR number based on timestamp or use default
    adr_number = "001"
    
    adr = f"""# ADR-{adr_number}: Automated Documentation Generation

## Status

**Accepted**

## Date

{datetime.utcnow().strftime("%Y-%m-%d")}

## Context

This project has implemented automated documentation generation to maintain up-to-date technical documentation based on code analysis.

### Current State

- **Repository:** {repository}
- **Branch:** {branch}
- **Commit:** {commit}
- **Author:** {author}
- **Files Changed:** {len(changes)}
- **Severity:** {severity}
- **Breaking Changes:** {'Yes' if breaking else 'No'}

### Problem

Manual documentation maintenance is time-consuming and often becomes outdated as code evolves. Teams need a way to automatically generate and update documentation based on actual code changes.

## Decision

We have implemented a CI/CD-based automated documentation pipeline (EPIC-2) that:

1. **Integrates with Code Analysis (EPIC-1)**: Receives impact reports analyzing code changes
2. **Generates Multiple Documentation Types**:
   - README files with repository overview
   - API reference documentation
   - Architecture diagrams (System, Sequence, ER)
   - Folder tree snapshots
   - Documentation metadata (JSON snapshot)
3. **Runs in CI/CD**: Automatically triggered on code pushes
4. **Auto-commits Results**: Documentation is committed back to the repository

### Technology Choices

- **Python** for documentation generators (readable, maintainable)
- **Mermaid** for diagrams (text-based, version-controllable)
- **GitHub Actions** for CI/CD (integrated with repository)
- **JSON** for structured data exchange between EPIC-1 and EPIC-2

## Consequences

### Positive

- ✅ **Always Up-to-Date**: Documentation regenerates with every code change
- ✅ **Reduced Manual Effort**: No manual documentation maintenance required
- ✅ **Consistency**: Standardized documentation format across the project
- ✅ **Visibility**: Changes are tracked through version control
- ✅ **Automation**: CI/CD handles the entire pipeline

### Negative

- ⚠️ **Generated Content Limitations**: Auto-generated docs may lack context that humans provide
- ⚠️ **Template-Based**: Documentation follows predefined templates
- ⚠️ **Requires Impact Report**: Dependent on EPIC-1 code analysis quality

### Neutral

- 📝 **Initial Setup Required**: One-time configuration of CI/CD pipeline
- 📝 **Git History Growth**: Auto-commits increase repository commit count

## Implementation Details

### Documentation Outputs

1. **README.generated.md**: Overview with repository metadata
2. **api/api-reference.md**: Detected API endpoints
3. **adr/ADR-001.md**: This architecture decision record
4. **architecture/system.mmd**: System architecture diagram
5. **architecture/sequence.mmd**: Process flow sequence diagram
6. **architecture/er.mmd**: Entity relationship diagram
7. **tree.txt**: Hierarchical file tree of changes
8. **doc_snapshot.json**: Metadata about generated documentation

### Trigger Conditions

- Push to main, develop, or epic-2 branches
- Pull requests (for review, without commit)
- Excludes changes to documentation folder (prevents loops)

## Notes

This ADR was automatically generated as part of the EPIC-2 documentation pipeline based on the impact report from commit `{commit}`.

## References

- EPIC-1: Code Analysis and Impact Detection
- EPIC-2: Automated Documentation Generation Pipeline
- Repository: {repository}
- Branch: {branch}
"""
    
    return adr