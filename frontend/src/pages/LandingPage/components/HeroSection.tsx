import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GitBranch, Play, ArrowRight, Hexagon } from 'lucide-react'
import { Link } from 'react-router-dom'
import HeroScene from './HeroScene'
import ParticleField from './ParticleField'

export default function HeroSection() {
    const [displayText, setDisplayText] = useState('')
    const fullText = 'Self-Updating Engineering Documentation'

    useEffect(() => {
        let i = 0
        const interval = setInterval(() => {
            if (i <= fullText.length) {
                setDisplayText(fullText.slice(0, i))
                i++
            } else {
                clearInterval(interval)
            }
        }, 40)
        return () => clearInterval(interval)
    }, [])

    return (
        <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden py-32 main-bg-gradient">
            {/* Animated Dot Pattern */}
            <div className="absolute inset-0 dot-pattern opacity-40 mix-blend-overlay" />

            {/* Subtle glow accents */}
            <div className="glow-blue" style={{ top: '-150px', right: '10%' }} />
            <div className="glow-purple" style={{ bottom: '-150px', left: '10%' }} />

            {/* Particle field */}
            <ParticleField />

            {/* 3D Scene */}
            <HeroScene />

            {/* Content */}
            <div className="relative z-10 text-center px-6 max-w-[1280px] mx-auto">
                {/* Badge */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                    className="mb-12 flex justify-center"
                >
                    <span className="gh-badge py-2 px-4 shadow-sm">
                        <Hexagon size={14} style={{ color: 'var(--accent-green)' }} />
                        <span className="tracking-wide">AI-Powered CI Documentation Intelligence</span>
                    </span>
                </motion.div>

                {/* Main heading */}
                <motion.h1
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.3 }}
                    className="text-[42px] sm:text-[56px] md:text-[72px] font-bold leading-[1.1] tracking-[-0.02em] mb-8"
                >
                    <span style={{ color: 'var(--text-primary)' }}>{displayText}</span>
                    <span
                        className="inline-block w-[3px] h-[0.75em] ml-1 align-middle rounded-sm"
                        style={{
                            background: 'var(--accent-blue)',
                            animation: 'blink 1s infinite',
                        }}
                    />
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.6 }}
                    className="text-[18px] md:text-[20px] leading-relaxed max-w-[720px] mx-auto mb-16"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Generate architecture diagrams, API references, ADRs, and health reports
                    automatically — every commit, every push, every merge.
                </motion.p>

                {/* CTA Buttons */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-6"
                >
                    <Link to="/signup" className="btn-primary group text-base px-8 py-3 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all">
                        <GitBranch size={18} />
                        Connect Repository
                        <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </Link>
                    <a href="#dashboard" className="btn-secondary group text-base px-8 py-3 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
                        <Play size={18} />
                        See Live Demo
                    </a>
                </motion.div>

                {/* Pipeline flow labels */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.8, delay: 1.2 }}
                    className="mt-32 flex items-center justify-center gap-6 md:gap-12 flex-wrap max-w-5xl mx-auto relative z-20"
                >
                    {['Repository', 'Analysis', 'Documentation', 'Intelligence'].map((label, i) => (
                        <div key={label} className="flex items-center gap-4 md:gap-8">
                            <span
                                className="text-[13px] font-mono font-medium px-4 py-2 rounded-full shadow-sm backdrop-blur-sm"
                                style={{
                                    background: 'rgba(22, 27, 34, 0.8)',
                                    border: '1px solid var(--border-default)',
                                    color: 'var(--text-secondary)',
                                }}
                            >
                                {label}
                            </span>
                            {i < 3 && (
                                <ArrowRight size={14} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                            )}
                        </div>
                    ))}
                </motion.div>
            </div>

            {/* Scroll indicator */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="absolute bottom-8 left-1/2 -translate-x-1/2"
            >
                <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-5 h-8 rounded-full flex items-start justify-center pt-2"
                    style={{ border: '1px solid var(--border-default)' }}
                >
                    <div className="w-1 h-1.5 rounded-full" style={{ background: 'var(--text-muted)' }} />
                </motion.div>
            </motion.div>
        </section>
    )
}
