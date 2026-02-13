import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FolderOpen, FileText, ChevronRight, ChevronDown,
    X, Clock, Code2, FolderTree
} from 'lucide-react'

interface FileNode {
    name: string
    type: 'file' | 'folder'
    children?: FileNode[]
    extension?: string
    updated?: string
    content?: string
}

const fileTree: FileNode[] = [
    {
        name: 'README.generated.md', type: 'file', extension: 'md', updated: '2 min ago',
        content: `# CI Living Documentation Platform\n\n## Overview\nAutomated documentation generation for modern engineering teams.\n\n## Architecture\nThe platform uses a multi-stage CI pipeline:\n1. **Code Analysis** — AST parsing and feature extraction\n2. **Impact Detection** — Change diff analysis\n3. **Doc Generation** — Automated artifact creation\n4. **Intelligence** — Drift detection & health scoring\n\n## Quick Start\n\`\`\`bash\nnpm install @docpulse/cli\ndocpulse init\ndocpulse connect <repo-url>\n\`\`\``,
    },
    {
        name: 'documentation-health.md', type: 'file', extension: 'md', updated: '5 min ago',
        content: `# Documentation Health Report\n\n| Metric | Score | Status |\n|--------|-------|--------|\n| Coverage | 97% | ✅ |\n| Freshness | 92% | ✅ |\n| Accuracy | 95% | ✅ |\n| Overall | 94/100 | ✅ |\n\n## Drift Alerts\n- ⚠️ api-reference.md: STALE_ENDPOINT\n- ℹ️ system.mmd: minor schema drift`,
    },
    {
        name: 'tree.txt', type: 'file', extension: 'txt', updated: '2 min ago',
        content: `.\n├── README.generated.md\n├── documentation-health.md\n├── tree.txt\n├── api/\n│   ├── api-reference.md\n│   └── api-description.json\n├── architecture/\n│   ├── system.mmd\n│   ├── sequence.mmd\n│   ├── er.mmd\n│   └── architecture.md\n├── adr/\n│   └── ADR-001.md\n├── doc_snapshot.json\n└── summary/\n    ├── summary.md\n    └── summary.json`,
    },
    {
        name: 'api', type: 'folder',
        children: [
            {
                name: 'api-reference.md', type: 'file', extension: 'md', updated: '10 min ago',
                content: `# API Reference\n\n## Endpoints\n\n### POST /api/v1/analyze\nTrigger code analysis for a repository.\n\n**Request:**\n\`\`\`json\n{\n  "repo_url": "https://github.com/org/repo",\n  "branch": "main",\n  "commit_sha": "abc123"\n}\n\`\`\`\n\n### GET /api/v1/health\nReturns service health status.\n\n### GET /api/v1/artifacts/{project_id}\nRetrieve generated documentation artifacts.`
            },
            {
                name: 'api-description.json', type: 'file', extension: 'json', updated: '10 min ago',
                content: `openapi: 3.0.3\ninfo:\n  title: DocPulse AI API\n  version: 2.4.1\n  description: AI-Powered CI Documentation Platform\npaths:\n  /api/v1/analyze:\n    post:\n      summary: Trigger analysis\n  /api/v1/health:\n    get:\n      summary: Health check\n  /api/v1/artifacts/{project_id}:\n    get:\n      summary: Get artifacts`
            },
        ],
    },
    {
        name: 'architecture', type: 'folder',
        children: [
            {
                name: 'system.mmd', type: 'file', extension: 'mmd', updated: '3 min ago',
                content: `graph TD\n    A[GitHub Webhook] --> B[CI Orchestrator]\n    B --> C[Code Analyzer]\n    B --> D[Doc Generator]\n    C --> E[Architecture Engine]\n    E --> D\n    D --> F[R2 Storage]\n    D --> G[Intelligence Dashboard]\n    F --> G`
            },
            {
                name: 'sequence.mmd', type: 'file', extension: 'mmd', updated: '3 min ago',
                content: `sequenceDiagram\n    Developer->>GitHub: git push\n    GitHub->>CI: webhook trigger\n    CI->>Analyzer: parse codebase\n    Analyzer->>Generator: impact_report.json\n    Generator->>Storage: upload artifacts\n    Storage->>Dashboard: notify update`
            },
            {
                name: 'er.mmd', type: 'file', extension: 'mmd', updated: '3 min ago',
                content: `erDiagram\n    PROJECT ||--o{ COMMIT : has\n    COMMIT ||--o{ ARTIFACT : generates\n    ARTIFACT }|--|| STORAGE : stored_in\n    PROJECT ||--o{ HEALTH_REPORT : has\n    COMMIT ||--|{ DRIFT_REPORT : triggers`
            },
            {
                name: 'architecture.md', type: 'file', extension: 'md', updated: '5 min ago',
                content: `# Architecture Overview\n\n## System Components\n\n### Epic 1: Code Analysis Engine\nParses repository AST and extracts features.\n\n### Epic 2: Documentation Generator\nGenerates markdown, diagrams, and API references.\n\n### Epic 3: Drift Detection Engine\nMonitors documentation freshness and accuracy.\n\n### Epic 4: Summary & Intelligence\nAI-powered change summaries and health scoring.`
            },
        ],
    },
    {
        name: 'adr', type: 'folder',
        children: [
            {
                name: 'ADR-001.md', type: 'file', extension: 'md', updated: '1 day ago',
                content: `# ADR-001: CI-Driven Documentation Architecture\n\n## Status\nAccepted\n\n## Context\nEngineering teams struggle to maintain accurate documentation.\nManual updates create drift between code and docs.\n\n## Decision\nImplement a CI-driven pipeline that automatically generates\nand updates documentation artifacts on every commit.\n\n## Consequences\n- Documentation always reflects current code state\n- Reduced manual maintenance burden\n- Requires CI pipeline integration`
            },
        ],
    },
    {
        name: 'doc_snapshot.json', type: 'file', extension: 'json', updated: '2 min ago',
        content: `{\n  "project_id": "ci-living-docs",\n  "commit_sha": "a1b2c3d",\n  "branch": "main",\n  "timestamp": "2026-02-12T00:35:00Z",\n  "artifacts_count": 12,\n  "health_score": 94,\n  "drift_alerts": 2,\n  "coverage": 0.97\n}`,
    },
    {
        name: 'summary', type: 'folder',
        children: [
            {
                name: 'summary.md', type: 'file', extension: 'md', updated: '2 min ago',
                content: `# Change Summary — v2.4.1\n\n## Changes\n- Updated API reference with new /artifacts endpoint\n- Regenerated system architecture diagram\n- Added ADR-001 for CI documentation decision\n\n## Impact\n- 3 documentation artifacts updated\n- 0 breaking changes detected\n- Health score: 94/100`
            },
            {
                name: 'summary.json', type: 'file', extension: 'json', updated: '2 min ago',
                content: `{\n  "version": "2.4.1",\n  "changes": 3,\n  "breaking_changes": 0,\n  "artifacts_updated": [\n    "api-reference.md",\n    "system.mmd",\n    "ADR-001.md"\n  ],\n  "health_score": 94,\n  "generated_at": "2026-02-12T00:35:00Z"\n}`
            },
        ],
    },
]

const activityFeed = [
    { file: 'README.generated.md', action: 'updated', time: '2 min ago', color: 'var(--accent-green)' },
    { file: 'system.mmd', action: 'regenerated', time: '3 min ago', color: 'var(--accent-blue)' },
    { file: 'ADR-001.md', action: 'created', time: '5 min ago', color: 'var(--accent-purple)' },
    { file: 'drift_report.json', action: 'generated', time: '5 min ago', color: 'var(--accent-orange)' },
    { file: 'summary.md', action: 'updated', time: '6 min ago', color: 'var(--accent-blue)' },
]

function getFileColor(ext?: string) {
    switch (ext) {
        case 'md': return 'var(--accent-blue)'
        case 'json': return 'var(--accent-orange)'
        case 'yaml': return 'var(--accent-green)'
        case 'mmd': return 'var(--accent-pink)'
        default: return 'var(--text-muted)'
    }
}

function FileTreeItem({ node, depth = 0, onSelect }: { node: FileNode; depth?: number; onSelect: (n: FileNode) => void }) {
    const [expanded, setExpanded] = useState(depth < 1)

    if (node.type === 'folder') {
        return (
            <div>
                <div
                    className="flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors"
                    style={{ paddingLeft: `${depth * 16 + 8}px`, color: 'var(--text-secondary)' }}
                    onClick={() => setExpanded(!expanded)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                    {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <FolderOpen size={14} style={{ color: 'var(--accent-blue)', opacity: 0.7 }} />
                    <span className="text-[13px] font-mono">{node.name}/</span>
                </div>
                <AnimatePresence>
                    {expanded && node.children && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.15 }}>
                            {node.children.map(c => <FileTreeItem key={c.name} node={c} depth={depth + 1} onSelect={onSelect} />)}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        )
    }

    return (
        <div
            className="flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors group"
            style={{ paddingLeft: `${depth * 16 + 24}px`, color: 'var(--text-secondary)' }}
            onClick={() => onSelect(node)}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
            <FileText size={13} style={{ color: getFileColor(node.extension) }} />
            <span className="text-[13px] font-mono flex-1">{node.name}</span>
            {node.updated && (
                <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }}>
                    {node.updated}
                </span>
            )}
        </div>
    )
}

function PreviewModal({ file, onClose }: { file: FileNode; onClose: () => void }) {
    const langMap: Record<string, string> = { md: 'markdown', json: 'json', yaml: 'yaml', mmd: 'mermaid', txt: 'text' }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(1, 4, 9, 0.75)' }}
            onClick={onClose}>
            <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.97 }} transition={{ duration: 0.2 }}
                className="w-full max-w-[640px] max-h-[75vh] overflow-hidden rounded-lg"
                style={{ background: 'var(--bg-default)', border: '1px solid var(--border-default)' }}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: '1px solid var(--border-muted)' }}>
                    <div className="flex items-center gap-2">
                        <FileText size={14} style={{ color: getFileColor(file.extension) }} />
                        <span className="text-[13px] font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{file.name}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono"
                            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)', border: '1px solid var(--border-muted)' }}>
                            {langMap[file.extension || ''] || 'text'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {file.updated && (
                            <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                <Clock size={10} /> {file.updated}
                            </span>
                        )}
                        <button onClick={onClose} className="w-6 h-6 rounded-md flex items-center justify-center transition-colors"
                            style={{ color: 'var(--text-muted)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                            <X size={14} />
                        </button>
                    </div>
                </div>
                {/* Content */}
                <div className="p-4 overflow-y-auto max-h-[calc(75vh-52px)]" style={{ background: 'var(--bg-inset)' }}>
                    <pre className="text-[12px] font-mono leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                        {file.content}
                    </pre>
                </div>
            </motion.div>
        </motion.div>
    )
}

export default function ArtifactShowcase() {
    const [selectedFile, setSelectedFile] = useState<FileNode | null>(null)
    const [visibleActivities, setVisibleActivities] = useState(0)

    useEffect(() => {
        activityFeed.forEach((_, i) => {
            setTimeout(() => setVisibleActivities(prev => Math.max(prev, i + 1)), 500 + i * 350)
        })
    }, [])

    return (
        <section id="artifacts" className="section-padding relative">
            <hr className="section-divider" />

            <div className="section-container pt-16">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-16">
                    <span className="gh-badge mb-4">
                        <Code2 size={12} style={{ color: 'var(--accent-blue)' }} />
                        Generated Artifacts
                    </span>
                    <h2 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em] mt-4 mb-3" style={{ color: 'var(--text-primary)' }}>
                        Live Documentation Artifacts
                    </h2>
                    <p className="text-[15px] max-w-[520px] mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Explore the documentation artifacts generated automatically from your codebase — click any file to preview.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* File explorer */}
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} className="lg:col-span-2 gh-card overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5"
                            style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-muted)' }}>
                            <FolderTree size={14} style={{ color: 'var(--text-muted)' }} />
                            <span className="text-[12px] font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                                docs/
                            </span>
                            <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--text-muted)' }}>
                                generated moments ago
                            </span>
                        </div>
                        <div className="p-2">
                            {fileTree.map(node => <FileTreeItem key={node.name} node={node} onSelect={setSelectedFile} />)}
                        </div>
                    </motion.div>

                    {/* Activity feed */}
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.1 }} className="gh-card overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5"
                            style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--border-muted)' }}>
                            <Clock size={14} style={{ color: 'var(--text-muted)' }} />
                            <span className="text-[12px] font-mono font-medium" style={{ color: 'var(--text-secondary)' }}>
                                Activity
                            </span>
                        </div>
                        <div className="p-3 space-y-1">
                            {activityFeed.slice(0, visibleActivities).map((activity, i) => (
                                <motion.div key={`${activity.file}-${i}`} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }}
                                    className="flex items-start gap-2.5 p-2 rounded-md" style={{ background: 'var(--bg-subtle)' }}>
                                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: activity.color }} />
                                    <div>
                                        <div className="text-[11px] font-mono">
                                            <span style={{ color: activity.color }}>{activity.file}</span>
                                            <span style={{ color: 'var(--text-muted)' }}> {activity.action}</span>
                                        </div>
                                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{activity.time}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                        <div className="px-4 py-2.5 text-center"
                            style={{ borderTop: '1px solid var(--border-muted)' }}>
                            <span className="text-[10px] font-mono flex items-center justify-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-green)', animation: 'pulse-dot 2s infinite' }} />
                                Watching for changes...
                            </span>
                        </div>
                    </motion.div>
                </div>
            </div>

            <AnimatePresence>
                {selectedFile && selectedFile.type === 'file' && (
                    <PreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} />
                )}
            </AnimatePresence>
        </section>
    )
}
