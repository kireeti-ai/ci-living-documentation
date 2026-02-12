import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Network, GitFork, RefreshCw, Layers } from 'lucide-react'

type DiagramMode = 'system' | 'dataflow' | 'lifecycle'

const diagramModes = [
    { id: 'system' as DiagramMode, label: 'System Architecture', icon: <Network size={14} /> },
    { id: 'dataflow' as DiagramMode, label: 'Data Flow', icon: <GitFork size={14} /> },
    { id: 'lifecycle' as DiagramMode, label: 'Doc Lifecycle', icon: <RefreshCw size={14} /> },
]

function SystemDiagram() {
    const nodes = [
        { label: 'GitHub Webhook', x: 60, y: 50, color: 'var(--accent-blue)' },
        { label: 'CI Orchestrator', x: 300, y: 50, color: 'var(--accent-purple)' },
        { label: 'Code Analyzer', x: 140, y: 170, color: 'var(--accent-blue)' },
        { label: 'Doc Generator', x: 460, y: 170, color: 'var(--accent-green)' },
        { label: 'Architecture Engine', x: 300, y: 290, color: 'var(--accent-pink)' },
        { label: 'R2 Storage', x: 580, y: 50, color: 'var(--accent-green)' },
        { label: 'Intelligence Dashboard', x: 580, y: 290, color: 'var(--accent-orange)' },
    ]
    const edges = [[0, 1], [1, 2], [1, 3], [2, 4], [3, 5], [4, 3], [3, 6], [5, 6]]

    return (
        <svg viewBox="0 0 720 360" className="w-full">
            <defs>
                <marker id="arr" viewBox="0 0 10 10" refX="10" refY="5" markerWidth={5} markerHeight={5} orient="auto">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--border-default)" />
                </marker>
            </defs>
            {edges.map(([from, to], i) => (
                <motion.line
                    key={i}
                    x1={nodes[from].x + 55} y1={nodes[from].y + 16}
                    x2={nodes[to].x + 55} y2={nodes[to].y + 16}
                    stroke="var(--border-default)" strokeWidth={1} strokeDasharray="4 4"
                    markerEnd="url(#arr)"
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                />
            ))}
            {nodes.map((node, i) => (
                <motion.g key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                    <rect x={node.x} y={node.y} width={110} height={34} rx={6}
                        fill="var(--bg-default)" stroke={node.color} strokeWidth={1} />
                    <text x={node.x + 55} y={node.y + 20} textAnchor="middle" fill={node.color}
                        fontSize={10} fontFamily="var(--font-mono)" fontWeight={500}>
                        {node.label}
                    </text>
                </motion.g>
            ))}
        </svg>
    )
}

function DataFlowDiagram() {
    const steps = [
        { label: 'git push', color: 'var(--accent-blue)' },
        { label: 'webhook trigger', color: 'var(--accent-purple)' },
        { label: 'parse AST', color: 'var(--accent-purple)' },
        { label: 'extract features', color: 'var(--accent-green)' },
        { label: 'generate docs', color: 'var(--accent-green)' },
        { label: 'upload artifacts', color: 'var(--accent-cyan)' },
    ]

    return (
        <svg viewBox="0 0 720 360" className="w-full">
            {steps.map((step, i) => {
                const y = 30 + i * 55
                return (
                    <motion.g key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                        {i > 0 && (
                            <line x1={360} y1={y - 20} x2={360} y2={y - 6}
                                stroke="var(--border-default)" strokeWidth={1} strokeDasharray="3 3" />
                        )}
                        <rect x={260} y={y - 16} width={200} height={32} rx={6}
                            fill="var(--bg-default)" stroke={step.color} strokeWidth={1} />
                        <circle cx={278} cy={y} r={3} fill={step.color} />
                        <text x={360} y={y + 4} textAnchor="middle" fill="var(--text-secondary)"
                            fontSize={11} fontFamily="var(--font-mono)">
                            {step.label}
                        </text>
                        <text x={480} y={y + 3} fill="var(--text-muted)" fontSize={9} fontFamily="var(--font-mono)">
                            step {i + 1}
                        </text>
                    </motion.g>
                )
            })}
        </svg>
    )
}

function LifecycleDiagram() {
    const stages = [
        { label: 'Commit', angle: 0, color: 'var(--accent-blue)' },
        { label: 'Analyze', angle: 60, color: 'var(--accent-purple)' },
        { label: 'Generate', angle: 120, color: 'var(--accent-green)' },
        { label: 'Validate', angle: 180, color: 'var(--accent-cyan)' },
        { label: 'Detect Drift', angle: 240, color: 'var(--accent-orange)' },
        { label: 'Update', angle: 300, color: 'var(--accent-pink)' },
    ]
    const cx = 360, cy = 180, r = 120

    return (
        <svg viewBox="0 0 720 360" className="w-full">
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border-muted)" strokeWidth={1} strokeDasharray="4 4" />
            {stages.map((stage, i) => {
                const x = cx + Math.cos((stage.angle - 90) * Math.PI / 180) * r
                const y = cy + Math.sin((stage.angle - 90) * Math.PI / 180) * r
                return (
                    <motion.g key={i} initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                        <circle cx={x} cy={y} r={28} fill="var(--bg-default)" stroke={stage.color} strokeWidth={1} />
                        <text x={x} y={y + 3} textAnchor="middle" fill={stage.color}
                            fontSize={8} fontFamily="var(--font-mono)" fontWeight={600}>
                            {stage.label}
                        </text>
                    </motion.g>
                )
            })}
            <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--text-muted)" fontSize={9} fontFamily="var(--font-mono)">Continuous</text>
            <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--text-muted)" fontSize={9} fontFamily="var(--font-mono)">Lifecycle</text>
        </svg>
    )
}

const diagramComponents: Record<DiagramMode, React.FC> = {
    system: SystemDiagram,
    dataflow: DataFlowDiagram,
    lifecycle: LifecycleDiagram,
}

export default function ArchitectureSection() {
    const [activeMode, setActiveMode] = useState<DiagramMode>('system')
    const ActiveDiagram = diagramComponents[activeMode]

    return (
        <section id="architecture" className="section-padding relative">
            <hr className="section-divider" />

            <div className="section-container pt-16">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-16">
                    <span className="gh-badge mb-6 py-1.5 px-3">
                        <Layers size={14} style={{ color: 'var(--accent-green)' }} />
                        Architecture Intelligence
                    </span>
                    <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-0.02em] mt-6 mb-6" style={{ color: 'var(--text-primary)' }}>
                        Living Architecture Diagrams
                    </h2>
                    <p className="text-[16px] md:text-[18px] max-w-[640px] mx-auto leading-relaxed mb-10" style={{ color: 'var(--text-secondary)' }}>
                        Auto-generated diagrams that stay in sync with your codebase — updated with every push.
                    </p>
                </motion.div>

                {/* Mode toggle — GitHub segmented control style */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex rounded-lg p-1" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
                        {diagramModes.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => setActiveMode(mode.id)}
                                className={`flex items-center gap-2 px-6 py-2.5 text-[14px] font-medium transition-all rounded-md ${activeMode === mode.id
                                        ? 'bg-[var(--bg-default)] text-[var(--text-primary)] shadow-sm'
                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {mode.icon}
                                {mode.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Diagram card */}
                <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.15 }}
                    className="gh-card p-6 md:p-8">
                    <AnimatePresence mode="wait">
                        <motion.div key={activeMode} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
                            <ActiveDiagram />
                        </motion.div>
                    </AnimatePresence>

                    <div className="mt-4 pt-4 flex items-center justify-between text-[11px] font-mono"
                        style={{ borderTop: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                        <span>{diagramModes.find(m => m.id === activeMode)?.label} view</span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-green)' }} />
                            Synced with main branch
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
