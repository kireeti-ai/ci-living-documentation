import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Hexagon } from 'lucide-react'
import { Link } from 'react-router-dom'

const navLinks = [
    { label: 'Pipeline', href: '#pipeline' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Dashboard', href: '#dashboard' },
    { label: 'AI Engine', href: '#ai-intelligence' },
    { label: 'Artifacts', href: '#artifacts' },
]

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <motion.nav
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
            style={{
                background: scrolled ? 'rgba(13, 17, 23, 0.95)' : 'transparent',
                backdropFilter: scrolled ? 'blur(12px)' : 'none',
                borderBottom: scrolled ? '1px solid var(--border-muted)' : '1px solid transparent',
            }}
        >
            <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <a href="#hero" className="flex items-center gap-2">
                    <Hexagon size={20} style={{ color: 'var(--accent-green)' }} strokeWidth={2.5} />
                    <span className="text-[15px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                        DocPulse<span style={{ color: 'var(--accent-blue)' }}> AI</span>
                    </span>
                </a>

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-2">
                    {navLinks.map((link) => (
                        <a
                            key={link.label}
                            href={link.href}
                            className="px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
                        >
                            {link.label}
                        </a>
                    ))}
                </div>

                {/* Desktop CTA */}
                <div className="hidden md:flex items-center gap-4">
                    <Link
                        to="/login"
                        className="text-[13px] font-medium px-3 py-1.5 rounded-md transition-colors hover:text-[var(--text-primary)]"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        Log In
                    </Link>
                    <Link to="/signup" className="btn-primary !py-2 !px-4 !text-[13px] inline-flex items-center justify-center">
                        Get Started
                    </Link>
                </div>

                {/* Mobile toggle */}
                <button
                    className="md:hidden w-8 h-8 rounded-md flex items-center justify-center transition-colors"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                </button>
            </div>

            {/* Mobile menu */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="md:hidden overflow-hidden"
                        style={{
                            background: 'var(--bg-default)',
                            borderBottom: '1px solid var(--border-default)',
                        }}
                    >
                        <div className="px-6 py-4 space-y-1">
                            {navLinks.map((link) => (
                                <a
                                    key={link.label}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className="block px-3 py-2 rounded-md text-[13px] font-medium"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    {link.label}
                                </a>
                            ))}
                            <div className="pt-3 flex flex-col gap-3">
                                <Link to="/login" className="text-center text-[13px] font-medium text-[var(--text-secondary)]">Log In</Link>
                                <Link to="/signup" className="btn-primary w-full !text-[13px] text-center justify-center">Get Started</Link>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.nav>
    )
}
