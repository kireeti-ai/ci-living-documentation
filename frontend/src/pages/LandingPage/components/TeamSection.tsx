import { motion } from 'framer-motion'
import { Users, UserPlus, FileText, ShieldCheck, Eye, MessageSquare } from 'lucide-react'

const collaborationFeatures = [
    {
        icon: <UserPlus size={18} />,
        title: 'Invite Teammates',
        description: 'Add engineers, tech writers, and reviewers to a project with one click.',
        color: 'var(--accent-blue)',
    },
    {
        icon: <FileText size={18} />,
        title: 'Shared Documentation Workspace',
        description: 'Keep architecture docs, API references, and ADRs visible for the entire team.',
        color: 'var(--accent-green)',
    },
    {
        icon: <ShieldCheck size={18} />,
        title: 'Role-Based Access',
        description: 'Control who can edit, approve, or publish documentation updates.',
        color: 'var(--accent-purple)',
    },
]

const teamMembers = [
    { name: 'Maya Chen', role: 'Backend Engineer', access: 'Editor', status: 'Online' },
    { name: 'Ravi Patel', role: 'Tech Writer', access: 'Reviewer', status: 'Reviewing' },
    { name: 'Sara Kim', role: 'Engineering Manager', access: 'Admin', status: 'Approving' },
]

export default function TeamSection() {
    return (
        <section id="team-collaboration" className="section-padding relative">
            <hr className="section-divider" />

            <div className="section-container pt-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-14"
                >
                    <span className="gh-badge mb-4">
                        <Users size={12} style={{ color: 'var(--accent-blue)' }} />
                        Team Collaboration
                    </span>
                    <h2 className="text-[32px] md:text-[40px] font-bold tracking-[-0.02em] mt-4 mb-3" style={{ color: 'var(--text-primary)' }}>
                        Built for Project Teams
                    </h2>
                    <p className="text-[15px] max-w-[620px] mx-auto leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                        Add teammates, assign roles, and give everyone a clear view of live documentation artifacts in one shared workspace.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                    <motion.div
                        initial={{ opacity: 0, x: -16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45 }}
                        className="space-y-4"
                    >
                        {collaborationFeatures.map((feature, i) => (
                            <motion.div
                                key={feature.title}
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.08 }}
                                className="gh-card p-5 card-hover"
                            >
                                <div className="flex items-start gap-4">
                                    <div
                                        className="w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0"
                                        style={{
                                            background: `color-mix(in srgb, ${feature.color} 12%, transparent)`,
                                            color: feature.color,
                                        }}
                                    >
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h3 className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--text-primary)' }}>
                                            {feature.title}
                                        </h3>
                                        <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, x: 16 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.45, delay: 0.1 }}
                        className="gh-card p-5"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Team Workspace Snapshot
                            </h3>
                            <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                3 members active
                            </span>
                        </div>

                        <div className="space-y-2">
                            {teamMembers.map((member) => (
                                <div key={member.name} className="p-3 rounded-md" style={{ background: 'var(--bg-subtle)' }}>
                                    <div className="flex items-center justify-between gap-3 mb-1">
                                        <span className="text-[13px] font-medium" style={{ color: 'var(--text-primary)' }}>{member.name}</span>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full"
                                            style={{ background: 'rgba(63, 185, 80, 0.12)', color: 'var(--accent-green)' }}>
                                            {member.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px]">
                                        <span style={{ color: 'var(--text-muted)' }}>{member.role}</span>
                                        <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{member.access}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid var(--border-muted)' }}>
                            <div className="p-3 rounded-md flex items-center gap-2" style={{ background: 'var(--bg-subtle)' }}>
                                <Eye size={14} style={{ color: 'var(--accent-cyan)' }} />
                                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>View docs in real time</span>
                            </div>
                            <div className="p-3 rounded-md flex items-center gap-2" style={{ background: 'var(--bg-subtle)' }}>
                                <MessageSquare size={14} style={{ color: 'var(--accent-orange)' }} />
                                <span className="text-[12px]" style={{ color: 'var(--text-secondary)' }}>Comment before publish</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    )
}
