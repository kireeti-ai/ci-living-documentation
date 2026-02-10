#!/usr/bin/env python3
"""
Diagram Generator
Creates detailed and professional Mermaid diagrams for architecture visualization based on code analysis.
"""
from typing import Dict, Any, Set

def _infer_components(report: Dict[str, Any]) -> Set[str]:
    """
    Infer system components from changed files and packages with high granularity.
    """
    components = set()
    changes = report.get("changes", [])
    files = [str(c.get("file", "")).lower() for c in changes]
    packages = {str(p).lower() for p in report.get("affected_packages", [])}
    
    # Combined text for wider search
    all_text = " ".join(files) + " " + " ".join(packages)

    # Frontend
    if any(k in all_text for k in ["frontend", "react", "vue", "angular", "next", "vite", "tailwind"]):
        components.add("Frontend")

    # Backend
    if any(k in all_text for k in ["backend", "express", "django", "flask", "fastapi", "spring", "nest"]):
        components.add("Backend")

    # Database
    if any(k in all_text for k in ["mongo", "mongoose", "postgres", "mysql", "sequelize", "prisma", "typeorm", "sql"]):
        components.add("Database")

    # Infrastructure / External Services
    if any(k in all_text for k in ["redis", "cache"]):
        components.add("Redis")
    if any(k in all_text for k in ["docker", "kubernetes", "k8s"]):
        components.add("Docker")
    if any(k in all_text for k in ["rabbitmq", "kafka", "sqs", "queue", "worker"]):
        components.add("Queue")
        components.add("Worker")
    if any(k in all_text for k in ["s3", "aws", "storage", "upload"]):
        components.add("ObjectStorage")
    if any(k in all_text for k in ["mail", "smtp", "sendgrid"]):
        components.add("EmailService")
    
    # Internal Modules
    if any("auth" in f for f in files) or "jwt" in all_text:
        components.add("AuthService")
    if any("monitor" in f for f in files) or "prometheus" in all_text:
        components.add("Monitoring")

    return components

def system_diagram(report: Dict[str, Any] = None) -> str:
    """
    Generate a professional system architecture diagram.
    """
    components = _infer_components(report or {})
    if not components:
         # Fallback to a generic tiered architecture if inference fails
        return """graph TD
    User([User]) -->|HTTP| App[Application]
    App -->|Reads/Writes| DB[(Database)]
"""
    
    lines = ["graph TD"]
    lines.append("    User([User])")
    
    # Subgraph for Client Layer
    if "Frontend" in components:
        lines.append('    subgraph Client ["Client Layer"]')
        lines.append('        Frontend[Frontend Application]')
        lines.append('    end')
        lines.append("    User -->|HTTPS| Frontend")
    else:
        # If no frontend, User hits Backend directly (API consumer)
        pass

    # Subgraph for Backend Layer
    lines.append('    subgraph Server ["Server Layer"]')
    if "Backend" in components:
        lines.append('        Backend[Backend API]')
        if "Frontend" in components:
            lines.append("        Frontend -->|REST/GraphQL| Backend")
        else:
            lines.append("        User -->|API Request| Backend")
            
        if "AuthService" in components:
            lines.append('        Auth[Auth Service/Module]')
            lines.append("        Backend -.->|Validate Token| Auth")
            
        if "Worker" in components:
            lines.append('        Worker[Background Worker]')
            
    lines.append('    end')

    # Subgraph for Infrastructure/Data Layer
    lines.append('    subgraph Infra ["Infrastructure Layer"]')
    
    if "Database" in components:
        lines.append('        DB[(Primary Database)]')
        if "Backend" in components:
            lines.append("        Backend -->|Read/Write| DB")
            
    if "Redis" in components:
        lines.append('        Cache[(Redis Cache)]')
        if "Backend" in components:
            lines.append("        Backend -->|Cache Hit/Miss| Cache")
            
    if "Queue" in components:
        lines.append('        MQ[[Message Queue]]')
        if "Backend" in components:
            lines.append("        Backend -->|Publish Event| MQ")
        if "Worker" in components:
            lines.append("        MQ -->|Consume| Worker")
            
    if "ObjectStorage" in components:
        lines.append('        S3[Object Storage]')
        if "Backend" in components:
             lines.append("        Backend -->|Upload/Presign| S3")
        if "Frontend" in components:
             lines.append("        Frontend -.->|Direct Download| S3")

    lines.append('    end')

    # Styling
    lines.append("    classDef client fill:#e3f2fd,stroke:#1565c0,color:black,stroke-width:2px;")
    lines.append("    classDef server fill:#f3e5f5,stroke:#7b1fa2,color:black,stroke-width:2px;")
    lines.append("    classDef infra fill:#e8f5e9,stroke:#2e7d32,color:black,stroke-width:2px;")
    
    if "Frontend" in components:
        lines.append("    class Frontend client;")
    if "Backend" in components:
        lines.append("    class Backend,Auth,Worker server;")
    lines.append("    class DB,Cache,MQ,S3 infra;")
    
    return "\n".join(lines)

def sequence_diagram(report: Dict[str, Any] = None) -> str:
    """
    Generate a dynamic sequence diagram highlighting key interactions.
    """
    components = _infer_components(report or {})
    lines = ["sequenceDiagram"]
    lines.append("    autonumber")
    lines.append("    actor User")
    
    if "Frontend" in components:
        lines.append("    participant Client as Frontend Client")
    
    lines.append("    participant API as Backend Service")
    
    if "AuthService" in components:
        lines.append("    participant Auth as Auth Module")
        
    if "Redis" in components:
        lines.append("    participant Cache as Redis Cache")
        
    lines.append("    participant DB as Database")
    
    if "Queue" in components:
        lines.append("    participant Queue as Message Queue")

    # Flow
    if "Frontend" in components:
        lines.append("    User->>Client: Internal Action / Navigation")
        lines.append("    Client->>API: Secure API Request (Bearer Token)")
    else:
        lines.append("    User->>API: Direct API Request")

    # Auth Step
    if "AuthService" in components:
        lines.append("    API->>Auth: Validate Session/Token")
        lines.append("    Auth-->>API: Token Valid")
    
    # Caching Step
    if "Redis" in components:
        lines.append("    API->>Cache: Check Cache Key")
        lines.append("    alt Cache Hit")
        lines.append("        Cache-->>API: Return Cached Data")
        lines.append("    else Cache Miss")
    
    # DB Step
    lines.append("        API->>DB: Query Operational Data")
    lines.append("        DB-->>API: Result Set")
    
    if "Redis" in components:
        lines.append("        API->>Cache: Set Cache Key")
        lines.append("    end")
        
    # Async Step
    if "Queue" in components:
        lines.append("    par Async Processing")
        lines.append("        API->>Queue: Publish Event")
        lines.append("    and Response")
        lines.append("        API-->>Client: 202 Accepted")
        lines.append("    end")
    else:
        if "Frontend" in components:
            lines.append("    API-->>Client: JSON Response")
            lines.append("    Client-->>User: Render Data")
        else:
            lines.append("    API-->>User: JSON Response")

    return "\n".join(lines)

def er_diagram(report: Dict[str, Any] = None) -> str:
    """
    Generate an Entity-Relationship diagram with smart heuristic relationships.
    """
    if not report:
        return ""
        
    changes = report.get("changes", [])
    files = [str(c.get("file", "")) for c in changes]
    
    # 1. Extract Entities
    entities = set()
    for f in files:
        # Heuristic: look for model files
        low = f.lower()
        if "model" in low or "entity" in low or "schema" in low:
            parts = f.split("/")
            for part in parts:
                if "model" in part.lower() or "entity" in part.lower():
                    # clean filename to get Entity Name
                    clean = part.replace(".model", "").replace(".js", "").replace(".ts", "").replace(".java", "").replace(".py", "")
                    # Ensure it looks like a class name (PascalCase)
                    if clean and clean[0].isupper():
                        entities.add(clean)

    if not entities:
        # If no entities found, provide a professional generic template
        return """erDiagram
    %% No specific data models detected in changelog
    %% Generic User-Resource Schema shown
    
    USER ||--o{ ORGANIZATION : belongs_to
    ORGANIZATION ||--o{ PROJECT : owns
    PROJECT ||--|{ TASK : contains
    
    USER {
        uuid id PK
        string email
        string hashed_password
    }
    PROJECT {
        uuid id PK
        string name
        uuid organization_id FK
    }
    TASK {
        uuid id PK
        string title
        string status
        uuid assignee_id FK
    }
"""

    lines = ["erDiagram"]
    
    # 2. Define Entities
    sorted_entities = sorted(list(entities))
    for entity in sorted_entities:
        lines.append(f"    {entity.upper()} {{")
        lines.append(f"        uuid id PK")
        lines.append(f"        datetime created_at")
        lines.append(f"        datetime updated_at")
        lines.append(f"    }}")

    # 3. Infer Relationships (Heuristic)
    # Common patterns: User -> * (owns), Project -> Task, Post -> Comment
    
    # Convert to set for fast lookup
    entity_set = {e.upper() for e in entities}
    
    relationships = []
    
    # Logic: If we have USER and PROJECT, likely User --|{ Project
    if "USER" in entity_set and "PROJECT" in entity_set:
        relationships.append("    USER ||--o{ PROJECT : manages")
    
    # Logic: If we have PROJECT and TASK, likely Project --|{ Task
    if "PROJECT" in entity_set and "TASK" in entity_set:
        relationships.append("    PROJECT ||--|{ TASK : contains")
        
    # Logic: If we have TASK and COMMENT, likely Task --|{ Comment
    if "TASK" in entity_set and "COMMENT" in entity_set:
        relationships.append("    TASK ||--o{ COMMENT : has")
        
    # Logic: User usually owns everything else
    if "USER" in entity_set:
        for other in entity_set:
            if other != "USER" and other not in ["PROJECT", "TASK"]: # Avoid duplicates if covered above
                 relationships.append(f"    USER ||--o{{ {other} : owns")

    # Fallback to a central node if no smart relationships found but multiple entities exist
    if not relationships and len(sorted_entities) > 1:
        root = sorted_entities[0].upper()
        for other in sorted_entities[1:]:
             relationships.append(f"    {root} ||--o{{ {other.upper()} : relates_to")

    lines.extend(relationships)
    
    return "\n".join(lines)

def generate_all_diagrams(report: Dict[str, Any] = None):
    return {
        "system": system_diagram(report),
        "sequence": sequence_diagram(report),
        "er": er_diagram(report)
    }


