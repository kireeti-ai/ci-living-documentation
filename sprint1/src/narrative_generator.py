#!/usr/bin/env python3
"""
Narrative generation using Groq with deterministic templates.
Falls back to rule-based text when Groq is unavailable.
"""
from typing import Dict, Any

from sprint1.src.groq_client import GroqClient, llm_available


SYSTEM_PROMPT = (
    "You are a Senior Principal Software Architect and Technical Writer for an enterprise distributed system. "
    "Generate high-quality, professional technical documentation. "
    "Tone: Authoritative, objective, concise, and technically precise. "
    "Avoid marketing fluff, 'excited' language (e.g. 'thrilled to announce'), or generic intros. "
    "Focus on architectural patterns, data flow, and system constraints."
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
            "### Executive Summary\n\n"
            "This repository contains an enterprise-grade software solution. "
            "Recent modifications focus on enhancing system stability, extending API capabilities, and optimizing data processing flows. "
            "Please refer to the technical specifications below for detailed integration and deployment guidelines."
        )

    try:
        client = GroqClient.from_env()
        
        # Prepare context content
        context_content = ""
        if "synthetic_report_summary.txt" in rag_context:
            context_content = rag_context["synthetic_report_summary.txt"]
        else:
            context_content = "\n".join([f"{k}:\n{v}" for k, v in rag_context.items()])

        user = (
            "Generate a professional Executive Summary for this project's README.\n\n"
            f"Technical Context:\n{context_content}\n\n"
            f"Repository Metadata:\n"
            f"Repo: {context.get('repository','unknown')}\n"
            f"Stats: {len(changes)} files changed. Severity: {analysis.get('highest_severity','UNKNOWN')}.\n\n"
            "Instructions:\n"
            "1. **Identify the System Type**: Based on the stack (e.g., 'A cloud-native microservice...', 'A monolithic backend...').\n"
            "2. **Summarize Core Capabilities**: Focus on the business and technical value found in the modules.\n"
            "3. **Analyze Recent Changes**: Describe the architectural impact of the recent updates without listing every file.\n"
            "4. **Format**: Use a single coherent paragraph suitable for a CTO or Senior Engineer audience.\n"
        )
        return _truncate(client.chat(SYSTEM_PROMPT, user, temperature=0.1, max_tokens=250))
    except Exception as e:
        print(f"⚠️ Narrative Generation Failed: {e}")
        return (
             "### Executive Summary\n\n"
            "This repository contains an enterprise-grade software solution. "
            "Recent modifications focus on enhancing system stability, extending API capabilities, and optimizing data processing flows. "
            "Please refer to the technical specifications below for detailed integration and deployment guidelines."
        )


def generate_impact_narrative(report: Dict[str, Any]) -> str:
    analysis = report.get("analysis_summary", {})
    severity = analysis.get("highest_severity", "UNKNOWN")
    breaking = analysis.get("breaking_changes_detected", False)
    if not llm_available():
        return (
            f"**Impact Assessment**: Classified as {severity}. "
            f"Breaking Changes: {'Verified' if breaking else 'None Detected'}. "
            "Operational risk assessment recommends validaton of integration points."
        )
    try:
        client = GroqClient.from_env()
        user = (
            "Write a strict, architect-level Impact Assessment.\n"
            f"Severity: {severity}\n"
            f"Breaking: {breaking}\n"
            "Instructions: State the operational risk, required testing scope, and deployment considerations. Concise."
        )
        return _truncate(client.chat(SYSTEM_PROMPT, user, temperature=0.0, max_tokens=100))
    except Exception:
        return (
           f"**Impact Assessment**: Classified as {severity}. "
            f"Breaking Changes: {'Verified' if breaking else 'None Detected'}. "
            "Operational risk assessment recommends validaton of integration points."
        )


def generate_adr_context(report: Dict[str, Any], rag_context: Dict[str, str]) -> str:
    context = report.get("context", {})
    repo_name = context.get('repository', 'unknown')
    
    if not llm_available():
        return (
            f"The {repo_name} system requires a robust, scalable architecture to support high-throughput operations "
            "and ensure modular separation of concerns. Current implementation demands strict alignment with enterprise standards."
        )

    try:
        client = GroqClient.from_env()
        
        context_content = ""
        if "synthetic_report_summary.txt" in rag_context:
            context_content = rag_context["synthetic_report_summary.txt"]
        else:
            context_content = str(rag_context.keys())

        user = (
            "Write the 'Context' section for an Architecture Decision Record (ADR) regarding the current system architecture.\n\n"
            f"System Analysis:\n{context_content}\n\n"
            "Instructions:\n"
            "1. Describe the precise problem space or architectural drivers (e.g. 'Scalability', 'Maintainability', 'Security').\n"
            "2. Characterize the current technical landscape based on the stack.\n"
            "3. Tone: Formal, objective, and problem-focused."
        )
        return _truncate(client.chat(SYSTEM_PROMPT, user, temperature=0.1, max_tokens=200))
    except Exception as e:
        print(f"⚠️ ADR Context Generation Failed: {e}")
        return (
             f"The {repo_name} system requires a robust, scalable architecture to support high-throughput operations "
            "and ensure modular separation of concerns. Current implementation demands strict alignment with enterprise standards."
        )


def generate_adr_decision(report: Dict[str, Any], rag_context: Dict[str, str] = None) -> str:
    rag_context = rag_context or {}
    
    if not llm_available():
        return (
            "Decision: Enforce a Domain-Driven Design (DDD) approach with clear boundaries between the Application, Domain, and Infrastructure layers. "
            "This ensures long-term testability and independent scaling of components."
        )

    try:
        client = GroqClient.from_env()
        
        context_content = ""
        if "synthetic_report_summary.txt" in rag_context:
            context_content = rag_context["synthetic_report_summary.txt"]
            
        user = (
            "Write the 'Decision' and 'Justification' section for an ADR.\n"
            f"Based on: {context_content}\n"
            "Instructions:\n"
            "1. Formulate the architectural strategy (e.g. 'Adoption of Event-Driven Architecture', 'Layered Monolith').\n"
            "2. Justify this choice based on the detected stack (e.g. Node/React).\n"
            "3. Mention strict adherence to industry best practices."
        )
        return _truncate(client.chat(SYSTEM_PROMPT, user, temperature=0.1, max_tokens=150))
    except Exception as e:
        print(f"⚠️ ADR Decision Generation Failed: {e}")
        return (
           "Decision: Enforce a Domain-Driven Design (DDD) approach with clear boundaries between the Application, Domain, and Infrastructure layers. "
            "This ensures long-term testability and independent scaling of components."
        )


