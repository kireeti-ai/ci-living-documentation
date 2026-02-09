#!/usr/bin/env python3
"""
Diagram Generator
Creates Mermaid diagrams for architecture visualization
"""

def system_diagram():
    """
    Generate system architecture diagram in Mermaid format
    
    Returns:
        str: Mermaid diagram showing overall system architecture
    """
    return """graph TB
    subgraph "Development"
        Dev[Developer]
        Code[Code Changes]
    end
    
    subgraph "CI/CD Pipeline"
        GH[GitHub Push/PR]
        CI[GitHub Actions]
        E1[EPIC-1 Analysis]
    end
    
    subgraph "Documentation Generation"
        E2[EPIC-2 Runner]
        Gen[Documentation Generators]
    end
    
    subgraph "Outputs"
        README[README.generated.md]
        API[API Docs]
        ADR[ADR]
        Diagrams[Diagrams]
        Snapshot[Snapshot JSON]
    end
    
    subgraph "Storage"
        Repo[Git Repository]
        Artifacts[CI Artifacts]
    end
    
    Dev -->|commits| Code
    Code -->|push| GH
    GH -->|triggers| CI
    CI -->|calls| E1
    E1 -->|impact report| E2
    E2 -->|orchestrates| Gen
    Gen -->|creates| README
    Gen -->|creates| API
    Gen -->|creates| ADR
    Gen -->|creates| Diagrams
    Gen -->|creates| Snapshot
    README -->|commits| Repo
    API -->|commits| Repo
    ADR -->|commits| Repo
    Diagrams -->|commits| Repo
    Snapshot -->|commits| Repo
    Gen -->|uploads| Artifacts
    
    style E1 fill:#e1f5ff
    style E2 fill:#e1f5ff
    style Gen fill:#fff4e1
    style Repo fill:#e8f5e9
"""

def sequence_diagram():
    """
    Generate sequence diagram showing the documentation generation flow
    
    Returns:
        str: Mermaid sequence diagram
    """
    return """sequenceDiagram
    actor Developer
    participant GitHub
    participant CI as GitHub Actions
    participant EPIC1 as EPIC-1 Backend
    participant EPIC2 as EPIC-2 Runner
    participant Generators
    participant Repo as Repository
    
    Developer->>GitHub: Push code changes
    GitHub->>CI: Trigger workflow
    
    Note over CI: Setup Python environment
    
    CI->>EPIC1: POST /analyze<br/>{repo_url, branch}
    EPIC1-->>CI: Impact Report JSON
    
    Note over CI: Save to sprint1/input/
    
    CI->>EPIC2: python run_epic2.py
    
    EPIC2->>EPIC2: Load impact report
    EPIC2->>Generators: generate_readme()
    Generators-->>EPIC2: README.generated.md
    
    EPIC2->>Generators: generate_api_docs()
    Generators-->>EPIC2: api-reference.md
    
    EPIC2->>Generators: generate_adr()
    Generators-->>EPIC2: ADR-001.md
    
    EPIC2->>Generators: system_diagram()
    Generators-->>EPIC2: system.mmd
    
    EPIC2->>Generators: sequence_diagram()
    Generators-->>EPIC2: sequence.mmd
    
    EPIC2->>Generators: er_diagram()
    Generators-->>EPIC2: er.mmd
    
    EPIC2->>Generators: generate_tree()
    Generators-->>EPIC2: tree.txt
    
    EPIC2->>Generators: write_snapshot()
    Generators-->>EPIC2: doc_snapshot.json
    
    Note over EPIC2: All docs generated
    
    CI->>Repo: git add sprint1/artifacts/docs
    CI->>Repo: git commit -m "docs: auto-generate [skip ci]"
    CI->>Repo: git push
    
    Note over Repo: Documentation updated
    
    CI-->>Developer: ✅ Workflow complete
"""

def er_diagram():
    """
    Generate entity-relationship diagram
    
    Returns:
        str: Mermaid ER diagram
    """
    return """erDiagram
    REPOSITORY ||--o{ BRANCH : contains
    BRANCH ||--o{ COMMIT : contains
    COMMIT ||--o{ FILE_CHANGE : includes
    FILE_CHANGE ||--o{ CODE_FEATURE : has
    
    REPOSITORY {
        string name
        string url
        string owner
    }
    
    BRANCH {
        string name
        string ref
        boolean is_default
    }
    
    COMMIT {
        string sha
        string author
        datetime timestamp
        string message
    }
    
    FILE_CHANGE {
        string file_path
        string language
        string change_type
        string severity
    }
    
    CODE_FEATURE {
        string type
        string name
        string description
    }
    
    COMMIT ||--o{ IMPACT_REPORT : generates
    IMPACT_REPORT ||--o{ DOCUMENTATION : produces
    
    IMPACT_REPORT {
        string commit_sha
        string severity
        boolean breaking_changes
        json analysis_summary
    }
    
    DOCUMENTATION {
        string type
        string filename
        datetime generated_at
        string content
    }
"""

def generate_all_diagrams():
    """
    Convenience function to generate all diagrams at once
    
    Returns:
        dict: Dictionary with all diagram types
    """
    return {
        "system": system_diagram(),
        "sequence": sequence_diagram(),
        "er": er_diagram()
    }
