import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    GitBranch, Search, FileText, BarChart3,
    CheckCircle2, Zap
} from 'lucide-react'

interface PipelineNode {
    id: string
    label: string
    sublabel: string
    icon: React.ReactNode
    color: string
    files: string[]
}

const pipelineNodes: PipelineNode[] = [
    {
        id: 'repo',
        label: 'Repository',
        sublabel: 'Source code input',
        icon: <GitBranch size={20} />,
        color: 'var(--accent-blue)',
        files: ['src/', 'package.json', '.github/workflows/'],
    },
    {
        id: 'analysis',
        label: 'Code Analysis',
        sublabel: 'AST parsing & extraction',
        icon: <Search size={20} />,
        color: 'var(--accent-purple)',
        files: ['impact_report.json', 'doc_snapshot.json'],
    },
    {
        id: 'docs',
        label: 'Doc Generation',
        sublabel: 'Artifact creation',
        icon: <FileText size={20} />,
        color: 'var(--accent-green)',
        files: ['README.generated.md', 'system.mmd', 'api-reference.md', 'ADR-001.md'],
    },
    {
        id: 'intelligence',
        label: 'Intelligence',
        sublabel: 'Health & drift analysis',
        icon: <BarChart3 size={20} />,
        color: 'var(--accent-cyan)',
        files: ['documentation-health.md', 'drift_report.json', 'summary.md'],
    },
]

export default function PipelineSection() {
    const [activeNode, setActiveNode] = useState<string | null>(null)
    const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set())

    useEffect(() => {
        const nodes = ['repo', 'analysis', 'docs', 'intelligence']
        nodes.forEach((node, i) => {
            setTimeout(() => {
                setCompletedNodes(prev => new Set([...prev, node]))
            }, 1000 + i * 600)
        })
    }, [])

    const handleNodeHover = useCallback((id: string | null) => {
        setActiveNode(id)
    }, [])

    return (
        <section id="pipeline" className="section-padding relative">
            <hr className="section-divider" />

            <div className="section-container pt-20">
                {/* Section header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-20"
                >
                    <span className="gh-badge mb-6 py-1.5 px-3">
                        <Zap size={14} style={{ color: 'var(--accent-blue)' }} />
                        Interactive Pipeline
                    </span>
                    <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-0.02em] mt-6 mb-6" style={{ color: 'var(--text-primary)' }}>
                        CI Documentation Pipeline
                    </h2>
                    <p className="text-[16px] md:text-[18px] max-w-[640px] mx-auto leading-relaxed mb-10" style={{ color: 'var(--text-secondary)' }}>
                        Every commit triggers an intelligent documentation flow — from code analysis to architecture intelligence.
                    </p>
                </motion.div>

                {/* Pipeline cards — horizontal flow */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.15 }}
                >
                    {/* Pipeline grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                        {pipelineNodes.map((node, i) => (
                            <motion.div
                                key={node.id}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.4, delay: i * 0.1 }}
                                className="gh-card p-6 card-hover cursor-pointer relative"
                                onMouseEnter={() => handleNodeHover(node.id)}
                                onMouseLeave={() => handleNodeHover(null)}
                            >
                                {/* Step number */}
                                <div className="flex items-center justify-between mb-4">
                                    <div
                                        className="w-9 h-9 rounded-md flex items-center justify-center"
                                        style={{
                                            background: `color-mix(in srgb, ${node.color} 12%, transparent)`,
                                            color: node.color,
                                        }}
                                    >
                                        {node.icon}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                            Step {i + 1}
                                        </span>
                                        {completedNodes.has(node.id) && (
                                            <CheckCircle2 size={14} style={{ color: 'var(--accent-green)' }} />
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-[14px] font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {node.label}
                                </h3>
                                <p className="text-[12px] mb-4" style={{ color: 'var(--text-muted)' }}>
                                    {node.sublabel}
                                </p>

                                {/* Generated files */}
                                <AnimatePresence>
                                    {activeNode === node.id && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="space-y-1 pt-3"
                                            style={{ borderTop: '1px solid var(--border-muted)' }}
                                        >
                                            {node.files.map((file, fi) => (
                                                <motion.div
                                                    key={file}
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: fi * 0.04 }}
                                                    className="flex items-center gap-2 text-[11px] font-mono py-0.5"
                                                    style={{ color: 'var(--text-secondary)' }}
                                                >
                                                    <FileText size={10} style={{ color: 'var(--text-muted)' }} />
                                                    {file}
                                                </motion.div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Connection arrow (on large screens) */}
                                {i < 3 && (
                                    <div className="hidden lg:block absolute -right-[16px] top-[50%] -translate-y-1/2 z-10">
                                        <svg width="32" height="16" viewBox="0 0 32 16">
                                            <path d="M0 8 H24 M24 8 L20 4 M24 8 L20 12" stroke="var(--border-default)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </div>
                                )}
                            </motion.div>
                        ))}
                    </div>

                    {/* Status bar */}
                    <div className="mt-6 flex items-center justify-center gap-6 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-green)', animation: 'pulse-dot 2s infinite' }} />
                            Pipeline Active
                        </span>
                        <span>4 stages completed</span>
                        <span>12 artifacts generated</span>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
