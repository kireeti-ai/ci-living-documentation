import { motion } from 'framer-motion'
import { GitBranch, ArrowRight, Github, ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'
import TempleLogo from '../../../components/TempleLogo'

const footerLinks = [
    {
        title: 'Product',
        links: [
            { label: 'Documentation', href: '#artifacts' },
            { label: 'API Reference', href: '#artifacts' },
            { label: 'Architecture Intelligence', href: '#architecture' },
            { label: 'Pricing', href: '/signup' },
        ],
    },
    {
        title: 'Developers',
        links: [
            { label: 'Quick Start', href: '/signup' },
            { label: 'CLI Reference', href: '#pipeline' },
            { label: 'Integrations', href: '#pipeline' },
            { label: 'Changelog', href: '/projects' },
        ],
    },
    {
        title: 'Company',
        links: [
            { label: 'About', href: '#hero' },
            { label: 'Security', href: '#ai-intelligence' },
            { label: 'Privacy', href: '/signup' },
            { label: 'Terms', href: '/signup' },
        ],
    },
]

export default function Footer() {
    return (
        <footer>
            {/* CTA Section */}
            <hr className="section-divider" />
            <div className="section-padding">
                <div className="section-container">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: 0.5 }}
                        className="gh-card p-10 md:p-14 text-center">
                        <h2 className="text-[28px] md:text-[36px] font-bold tracking-[-0.02em] mb-3" style={{ color: 'var(--text-primary)' }}>
                            Ready to automate your docs?
                        </h2>
                        <p className="text-[15px] max-w-[480px] mx-auto mb-8 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                            Connect your repository and start generating living documentation in under 60 seconds.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link to="/signup" className="btn-primary group">
                                <GitBranch size={16} />
                                Connect Repository
                                <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
                            </Link>
                            <a href="https://github.com" target="_blank" rel="noreferrer" className="btn-secondary">
                                <Github size={16} />
                                View on GitHub
                                <ExternalLink size={12} />
                            </a>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Footer links */}
            <hr className="section-divider" />
            <div className="px-6 py-12">
                <div className="max-w-[1280px] mx-auto">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                        {/* Brand */}
                        <div className="col-span-2 md:col-span-1">
                            <a href="#hero" className="flex items-center gap-2 mb-3">
                                <span className="landing-temple-logo" style={{ color: 'var(--accent-green)' }}>
                                    <TempleLogo />
                                </span>
                                <span className="text-[14px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    DocPulse<span style={{ color: 'var(--accent-blue)' }}> AI</span>
                                </span>
                            </a>
                            <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--text-muted)' }}>
                                AI-powered CI documentation intelligence for engineering teams.
                            </p>
                            <div className="flex items-center gap-1.5 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-green)' }} />
                                All systems operational
                            </div>
                        </div>

                        {footerLinks.map((section) => (
                            <div key={section.title}>
                                <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
                                    {section.title}
                                </h4>
                                <ul className="space-y-2">
                                    {section.links.map((link) => (
                                        <li key={link.label}>
                                            <a href={link.href} className="text-[13px] transition-colors"
                                                style={{ color: 'var(--text-muted)' }}
                                                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-link)')}
                                                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}>
                                                {link.label}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>

                    <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-3"
                        style={{ borderTop: '1px solid var(--border-muted)' }}>
                        <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            © 2026 DocPulse AI. Built for engineers, by engineers.
                        </p>
                        <div className="flex items-center gap-5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                            <a href="https://www.githubstatus.com/" target="_blank" rel="noreferrer" className="transition-colors hover:text-[var(--text-link)]">Status</a>
                            <a href="/signup" className="transition-colors hover:text-[var(--text-link)]">Privacy</a>
                            <a href="/signup" className="transition-colors hover:text-[var(--text-link)]">Terms</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    )
}
