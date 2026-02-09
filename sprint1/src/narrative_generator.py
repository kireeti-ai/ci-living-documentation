#!/usr/bin/env python3
"""
Narrative generation using Groq with deterministic templates.
Falls back to rule-based text when Groq is unavailable.
"""
from typing import Dict, Any

from sprint1.src.groq_client import GroqClient, llm_available


SYSTEM_PROMPT = (
    "You generate professional documentation narratives based only on the provided data. "
    "Do not add new facts. Preserve required headings and placeholders. "
    "Keep tone concise, technical, and clear."
)


def _truncate(text: str, limit: int = 1200) -> str:
    if len(text) <= limit:
        return text
    return text[:limit].rstrip() + "..."


def generate_readme_narrative(report: Dict[str, Any], rag_context: Dict[str, str]) -> str:
    context = report.get("context", {})
    analysis = report.get("analysis_summary", {})
    changes = report.get("changes", [])

    if not llm_available():
        return (
            "This documentation summarizes the analyzed code changes and their impact. "
            "It provides repository metadata, a structured change inventory, and an impact summary "
            "to support review and release decisions."
        )

    client = GroqClient.from_env()
    user = (
        "Generate a brief, professional README overview paragraph.\n"
        f"Repository: {context.get('repository','unknown')}\n"
        f"Branch: {context.get('branch','main')}\n"
        f"Commit: {context.get('commit_sha','unknown')}\n"
        f"Severity: {analysis.get('highest_severity','UNKNOWN')}\n"
        f"Breaking: {analysis.get('breaking_changes_detected', False)}\n"
        f"Files changed: {len(changes)}\n"
        f"RAG context: {list(rag_context.keys())}\n"
        "Constraints: 2-3 sentences, no new facts, formal tone."
    )
    return _truncate(client.chat(SYSTEM_PROMPT, user, temperature=0.0, max_tokens=120))


def generate_impact_narrative(report: Dict[str, Any]) -> str:
    analysis = report.get("analysis_summary", {})
    severity = analysis.get("highest_severity", "UNKNOWN")
    breaking = analysis.get("breaking_changes_detected", False)
    if not llm_available():
        return (
            f"Impact level is {severity}. "
            f"Breaking changes: {'Yes' if breaking else 'No'}. "
            "Review high-risk files before deployment."
        )
    client = GroqClient.from_env()
    user = (
        "Write a short, professional impact summary.\n"
        f"Severity: {severity}\n"
        f"Breaking: {breaking}\n"
        "Constraints: 2 sentences, no new facts."
    )
    return _truncate(client.chat(SYSTEM_PROMPT, user, temperature=0.0, max_tokens=90))


def generate_adr_context(report: Dict[str, Any], rag_context: Dict[str, str]) -> str:
    if not llm_available():
        return (
            "The team needs consistent, up-to-date documentation that reflects actual code changes "
            "without manual effort."
        )
    client = GroqClient.from_env()
    user = (
        "Write 2-3 sentences for ADR Context. Use only provided data.\n"
        f"Repo: {report.get('context', {}).get('repository', 'unknown')}\n"
        f"RAG context: {list(rag_context.keys())}\n"
        "Constraints: formal tone, no new facts."
    )
    return _truncate(client.chat(SYSTEM_PROMPT, user, temperature=0.0, max_tokens=120))


def generate_adr_decision(report: Dict[str, Any]) -> str:
    if not llm_available():
        return (
            "Adopt an automated documentation pipeline that converts impact reports into "
            "structured README, ADR, API reference, and architecture artifacts."
        )
    client = GroqClient.from_env()
    user = (
        "Write 1-2 sentences for ADR Decision.\n"
        "Constraints: formal tone, no new facts, concise."
    )
    return _truncate(client.chat(SYSTEM_PROMPT, user, temperature=0.0, max_tokens=80))
