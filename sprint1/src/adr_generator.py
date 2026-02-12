#!/usr/bin/env python3
"""
Architecture Decision Record (ADR) Generator
Creates professional ADRs reflecting the system's architectural state.
"""
from sprint1.src.narrative_generator import generate_adr_context, generate_adr_decision
from sprint1.src.groq_client import llm_available


def generate_adr(report, generated_at=None, rag_context=None) -> str:
    """
    Generate a professional Architecture Decision Record (ADR).
    This document serves as a 'Snapshot' or 'Baseline' ADR for the current system state.
    """
    context = report.get("context", {})
    analysis = report.get("analysis_summary", {})
    changes = report.get("changes", [])
    
    repository = context.get("repository", "Unknown Repository")
    branch = context.get("branch", "main")
    commit = context.get("commit_sha", "unknown")
    author = context.get("author", "Unknown Author")
    generated_date = (generated_at or "unknown").split("T")[0]
    
    rag_context = rag_context or {}

    # 1. Generate Content via Narrative Generator (LLM or Rule-based)
    adr_context = generate_adr_context(report, rag_context)
    adr_decision_text = generate_adr_decision(report, rag_context)

    # 2. Determine Title based on context
    # If we have mainly backend changes, maybe "Backend Architecture Baseline"
    # For now, "System Architecture Snapshot" is a safe, professional default
    title = "System Architecture Baseline"

    # 3. Build Professional Markdown
    adr = f"""# ADR-001: {title}

## Status

**Accepted** (Snapshot as of {generated_date})

## Date

{generated_date}


## Context

{adr_context}

### Operational Metadata

- **Repository:** `{repository}`
- **Branch:** `{branch}`
- **Analyzed Commit:** `{commit}`
- **Analysis Scope:** {len(changes)} changed files
- **Key Modules Detected:** {', '.join(report.get('affected_packages', []) or ['None detected'])}

## Decision

{adr_decision_text}

## Consequences

### Positive

- **Standardization**: The current architecture enforces consistent patterns across modules.
- **Maintainability**: Separation of concerns allows for targeted updates without system-wide regression risks.
- **Scalability**: The detected components support horizontal scaling for high-load scenarios.

### Negative

- **Complexity**: The distributed nature (if applicable) or modular separation introduces integration overhead.
- **Learning Curve**: Strict architectural boundaries require developer discipline and onboarding time.

## Compliance & Security

The current architecture aligns with standard security practices for this stack. 
All API endpoints should regularly undergo security scanning and validation.

## Notes

This proprietary architecture document is automatically maintained by the internal platform engineering team. 
Manual edits may be overwritten by the next snapshot generation cycle.
"""
    
    return adr

