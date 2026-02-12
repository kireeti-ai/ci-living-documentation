import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
    Activity, Shield, TrendingUp, AlertTriangle,
    CheckCircle2, Clock, FileText, GitCommit
} from 'lucide-react'

const timeline = [
    { version: 'v2.4.1', time: '2 min ago', changes: 3, status: 'success' as const },
    { version: 'v2.4.0', time: '1 hour ago', changes: 7, status: 'success' as const },
    { version: 'v2.3.9', time: '3 hours ago', changes: 2, status: 'warning' as const },
    { version: 'v2.3.8', time: '6 hours ago', changes: 5, status: 'success' as const },
    { version: 'v2.3.7', time: '1 day ago', changes: 4, status: 'success' as const },
]

const driftAlerts = [
    { file: 'api-reference.md', type: 'STALE_ENDPOINT', severity: 'high' as const },
    { file: 'system.mmd', type: 'SCHEMA_DRIFT', severity: 'medium' as const },
    { file: 'README.generated.md', type: 'OUTDATED_SECTION', severity: 'low' as const },
]

export default function DashboardSection() {
    const [healthScore, setHealthScore] = useState(0)
    const targetScore = 94
    const [visibleAlerts, setVisibleAlerts] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setHealthScore(prev => {
                if (prev >= targetScore) { clearInterval(interval); return targetScore }
                return prev + 1
            })
        }, 25)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        driftAlerts.forEach((_, i) => {
            setTimeout(() => setVisibleAlerts(prev => Math.max(prev, i + 1)), 600 + i * 400)
        })
    }, [])

    const severityStyles = {
        high: { bg: 'rgba(248, 81, 73, 0.05)', border: 'rgba(248, 81, 73, 0.15)', color: '#f85149', label: 'High' },
        medium: { bg: 'rgba(210, 153, 34, 0.05)', border: 'rgba(210, 153, 34, 0.15)', color: '#d29922', label: 'Med' },
        low: { bg: 'rgba(139, 148, 158, 0.04)', border: 'var(--border-muted)', color: 'var(--text-muted)', label: 'Low' },
    }

    return (
        <section id="dashboard" className="section-padding relative">
            <hr className="section-divider" />

            <div className="section-container pt-16">
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-16">
                    <span className="gh-badge mb-4">
                        <Activity size={12} style={{ color: 'var(--accent-green)' }} />
                        Live Dashboard
                    </span>
                    <h2 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em] mt-4 mb-3" style={{ color: 'var(--text-primary)' }}>
                        Documentation Intelligence
                    </h2>
                    <p className="text-[15px] max-w-[520px] mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Real-time health monitoring, drift detection, and version intelligence for your engineering docs.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Health Score */}
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.1 }} className="gh-card p-5 card-hover">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Documentation Health</h3>
                            <Shield size={16} style={{ color: 'var(--accent-green)' }} />
                        </div>

                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-[48px] font-bold leading-none tabular-nums" style={{
                                color: healthScore >= 90 ? 'var(--accent-green)' : healthScore >= 70 ? 'var(--accent-orange)' : 'var(--accent-red)',
                            }}>
                                {healthScore}
                            </span>
                            <span className="text-[18px] mb-1.5" style={{ color: 'var(--text-muted)' }}>/100</span>
                        </div>

                        {/* Progress bar */}
                        <div className="h-1.5 rounded-full overflow-hidden mb-5" style={{ background: 'var(--bg-subtle)' }}>
                            <motion.div className="h-full rounded-full" initial={{ width: 0 }}
                                animate={{ width: `${healthScore}%` }} transition={{ duration: 1.5, ease: 'easeOut' }}
                                style={{ background: 'var(--accent-green)' }} />
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Coverage', value: '97%', color: 'var(--accent-green)' },
                                { label: 'Freshness', value: '92%', color: 'var(--accent-blue)' },
                                { label: 'Accuracy', value: '95%', color: 'var(--accent-purple)' },
                            ].map(({ label, value, color }) => (
                                <div key={label} className="flex flex-col items-center justify-center p-3 rounded-md" style={{ background: 'var(--bg-subtle)' }}>
                                    <div className="text-[18px] font-semibold tabular-nums" style={{ color }}>{value}</div>
                                    <div className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Version Timeline */}
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.2 }} className="gh-card p-5 card-hover">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Version Timeline</h3>
                            <TrendingUp size={16} style={{ color: 'var(--accent-purple)' }} />
                        </div>

                        <div className="space-y-1">
                            {timeline.map((entry, i) => (
                                <div key={entry.version}
                                    className="flex items-center gap-3 p-2 rounded-md transition-colors"
                                    style={{ background: i === 0 ? 'var(--bg-subtle)' : 'transparent' }}
                                >
                                    <GitCommit size={14} style={{
                                        color: entry.status === 'success' ? 'var(--accent-green)' : 'var(--accent-orange)',
                                    }} />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {entry.version}
                                            </span>
                                            {i === 0 && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                                                    style={{ background: 'rgba(63, 185, 80, 0.12)', color: 'var(--accent-green)' }}>
                                                    LATEST
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                            {entry.changes} artifacts · {entry.time}
                                        </span>
                                    </div>
                                    <CheckCircle2 size={14} style={{ color: 'var(--accent-green)', opacity: 0.4 }} />
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Drift Alerts */}
                    <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ delay: 0.3 }} className="gh-card p-5 card-hover">
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>Drift Detection</h3>
                            <AlertTriangle size={16} style={{ color: 'var(--accent-orange)' }} />
                        </div>

                        <div className="space-y-2">
                            {driftAlerts.slice(0, visibleAlerts).map((alert) => {
                                const style = severityStyles[alert.severity]
                                return (
                                    <motion.div key={alert.file} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                                        className="p-3 rounded-md" style={{ background: style.bg, border: `1px solid ${style.border}` }}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText size={12} style={{ color: style.color }} />
                                            <span className="text-[12px] font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {alert.file}
                                            </span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{alert.type}</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium uppercase"
                                                style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                                                {style.label}
                                            </span>
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>

                        <div className="mt-4 pt-3 flex items-center gap-2 text-[11px]"
                            style={{ borderTop: '1px solid var(--border-muted)', color: 'var(--text-muted)' }}>
                            <Clock size={12} />
                            Last scan: 2 minutes ago
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
