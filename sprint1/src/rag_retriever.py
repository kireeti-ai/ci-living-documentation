#!/usr/bin/env python3
"""
Simple local RAG retriever.
Collects relevant documentation context from repository artifacts/templates.
"""
import os
from typing import Dict, List, Tuple


DOC_EXTENSIONS = {".md", ".txt", ".adoc", ".rst"}


def _read_file(path: str, max_bytes: int = 12000) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            return f.read(max_bytes)
    except Exception:
        return ""


def _score(text: str, terms: List[str]) -> int:
    if not text:
        return 0
    t = text.lower()
    return sum(t.count(term) for term in terms)


def _find_docs(root: str) -> List[str]:
    docs = []
    for base, _, files in os.walk(root):
        for name in files:
            _, ext = os.path.splitext(name)
            if ext.lower() in DOC_EXTENSIONS:
                docs.append(os.path.join(base, name))
    return docs


def retrieve_context(repo_root: str, terms: List[str], limit: int = 5) -> List[Tuple[str, str]]:
    """
    Retrieve a small set of relevant doc snippets by keyword scoring.

    Returns list of (path, snippet).
    """
    candidates = _find_docs(repo_root)
    scored = []
    for path in candidates:
        text = _read_file(path)
        score = _score(text, terms)
        if score > 0:
            scored.append((score, path, text))
    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for _, path, text in scored[:limit]:
        results.append((os.path.relpath(path, repo_root), text.strip()))
    return results


def build_rag_context(repo_root: str) -> Dict[str, str]:
    """
    Build a compact RAG context from local documentation sources.
    Prioritizes templates, glossary, and ADRs when available.
    """
    terms = [
        "template",
        "glossary",
        "terminology",
        "architecture",
        "adr",
        "decision",
        "documentation",
        "readme",
        "api",
    ]
    retrieved = retrieve_context(repo_root, terms=terms, limit=8)
    context = {}
    for path, snippet in retrieved:
        context[path] = snippet
    return context
