import { motion } from 'framer-motion'
import { Brain, Zap, Search, GitMerge, FileText, ArrowRight } from 'lucide-react'

const capabilities = [
    {
        icon: <Search size={20} />,
        title: 'Code Impact Detection',
        description: 'Analyzes every commit to identify which documentation artifacts need updating based on code changes.',
        color: 'var(--accent-blue)',
    },
    {
        icon: <GitMerge size={20} />,
        title: 'Drift Detection',
        description: 'Continuously monitors documentation freshness and alerts when docs fall out of sync with code.',
        color: 'var(--accent-orange)',
    },
    {
        icon: <FileText size={20} />,
        title: 'Auto-Generated Summaries',
        description: 'Creates human-readable change summaries and PR descriptions powered by AI analysis.',
        color: 'var(--accent-green)',
    },
    {
        icon: <Zap size={20} />,
        title: 'CI Documentation Intelligence',
        description: 'Full pipeline automation — from git push to published docs in seconds, not hours.',
        color: 'var(--accent-purple)',
    },
]

function NeuralMesh() {
    const nodes = Array.from({ length: 20 }, (_, i) => ({
        x: 40 + (i % 5) * 90 + (Math.random() * 20 - 10),
        y: 30 + Math.floor(i / 5) * 80 + (Math.random() * 15 - 7),
    }))

    const connections: [number, number][] = []
    nodes.forEach((_, i) => {
        nodes.forEach((_, j) => {
            if (i < j) {
                const dx = nodes[i].x - nodes[j].x
                const dy = nodes[i].y - nodes[j].y
                const dist = Math.sqrt(dx * dx + dy * dy)
                if (dist < 130) connections.push([i, j])
            }
        })
    })

    return (
        <svg viewBox="0 0 480 340" className="w-full h-full">
            {connections.map(([a, b], i) => (
                <motion.line key={i}
                    x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y}
                    stroke="var(--border-default)" strokeWidth={0.8}
                    initial={{ opacity: 0 }} whileInView={{ opacity: 1 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.02 }}
                />
            ))}
            {nodes.map((node, i) => (
                <motion.circle key={i} cx={node.x} cy={node.y} r={3}
                    fill={i % 4 === 0 ? 'var(--accent-blue)' : i % 4 === 1 ? 'var(--accent-green)' : i % 4 === 2 ? 'var(--accent-purple)' : 'var(--accent-cyan)'}
                    initial={{ scale: 0 }} whileInView={{ scale: 1 }}
                    viewport={{ once: true }} transition={{ delay: i * 0.03, type: 'spring' }}
                />
            ))}
        </svg>
    )
}

export default function AISection() {
    return (
        <section id="ai-intelligence" className="section-padding relative">
            <hr className="section-divider" />

            <div className="section-container pt-20">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-20">
                    <span className="gh-badge mb-6 py-1.5 px-3">
                        <Brain size={14} style={{ color: 'var(--accent-purple)' }} />
                        AI Intelligence Engine
                    </span>
                    <h2 className="text-[36px] md:text-[48px] font-bold tracking-[-0.02em] mt-6 mb-6" style={{ color: 'var(--text-primary)' }}>
                        Intelligence, Not Just Automation
                    </h2>
                    <p className="text-[16px] md:text-[18px] max-w-[640px] mx-auto leading-relaxed mb-10" style={{ color: 'var(--text-secondary)' }}>
                        AI-powered analysis that understands your code, detects documentation drift, and generates actionable insights.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
                    {/* Neural mesh */}
                    <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.5 }}
                        className="gh-card p-6 md:p-8">
                        <NeuralMesh />
                        <div className="mt-6 pt-4 text-[13px] font-mono text-center"
                            style={{ borderTop: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                            Neural analysis mesh — real-time code understanding
                        </div>
                    </motion.div>

                    {/* Capability cards */}
                    <div className="space-y-6">
                        {capabilities.map((cap, i) => (
                            <motion.div key={cap.title} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                                className="gh-card p-6 card-hover group cursor-pointer">
                                <div className="flex items-start gap-5">
                                    <div className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
                                        style={{ background: `color-mix(in srgb, ${cap.color} 12%, transparent)`, color: cap.color }}>
                                        {cap.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-[16px] font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                            {cap.title}
                                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: cap.color }} />
                                        </h3>
                                        <p className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                            {cap.description}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
