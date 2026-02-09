#!/usr/bin/env python3
"""
Architecture documentation text generator for Mermaid diagrams.
"""
from typing import Dict, Any


def generate_architecture_doc(report: Dict[str, Any]) -> str:
    context = report.get("context", {})
    repository = context.get("repository", "unknown")
    commit = context.get("commit_sha", "unknown")
    branch = context.get("branch", "main")

    doc = f"""# Architecture Documentation

## Overview

This document provides captions and explanations for generated architecture diagrams for `{repository}` at `{branch}` (`{commit}`).

## System Diagram

The system diagram shows the EPIC-2 documentation generator, its inputs from the impact report, and the storage flow for generated artifacts.

## Sequence Diagram

The sequence diagram illustrates the end-to-end documentation generation flow, from impact report ingestion to artifact creation and upload.

## ER Diagram

The ER diagram represents the documentation metadata entities used for snapshotting generated artifacts.
"""
    return doc
