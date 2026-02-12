import { useCallback } from 'react'
import Particles from '@tsparticles/react'
import { loadSlim } from 'tsparticles-slim'
import type { Engine } from 'tsparticles-slim'

export default function ParticleField() {
    const particlesInit = useCallback(async (engine: Engine) => {
        await loadSlim(engine as any)
    }, [])

    return (
        <Particles
            id="hero-particles"
            init={particlesInit as any}
            options={{
                fullScreen: false,
                fpsLimit: 60,
                particles: {
                    number: { value: 30, density: { enable: true, width: 1920, height: 1080 } },
                    color: { value: ['#30363d', '#484f58'] },
                    opacity: {
                        value: { min: 0.08, max: 0.2 },
                    },
                    size: {
                        value: { min: 1, max: 2 },
                    },
                    move: {
                        enable: true,
                        speed: 0.3,
                        direction: 'none' as const,
                        random: true,
                        outModes: { default: 'out' as const },
                    },
                    links: {
                        enable: true,
                        distance: 120,
                        color: '#30363d',
                        opacity: 0.08,
                        width: 1,
                    },
                },
                interactivity: {
                    events: {
                        onHover: { enable: true, mode: 'grab' as const },
                    },
                    modes: {
                        grab: { distance: 160, links: { opacity: 0.12 } },
                    },
                },
                detectRetina: true,
            }}
            className="absolute inset-0 z-[1]"
        />
    )
}
