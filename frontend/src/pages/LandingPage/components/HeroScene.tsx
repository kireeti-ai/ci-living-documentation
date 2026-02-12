import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float, Stars } from '@react-three/drei'
import * as THREE from 'three'

function PipelineNode({ position, color, scale = 1 }: { position: [number, number, number]; color: string; scale?: number }) {
    const meshRef = useRef<THREE.Mesh>(null!)

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.08
            meshRef.current.rotation.y += 0.003
        }
    })

    return (
        <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.3}>
            <group position={position}>
                <mesh ref={meshRef}>
                    <octahedronGeometry args={[0.25 * scale, 0]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={0.3}
                        metalness={0.9}
                        roughness={0.1}
                        wireframe
                    />
                </mesh>
                <mesh>
                    <octahedronGeometry args={[0.12 * scale, 0]} />
                    <meshStandardMaterial
                        color={color}
                        emissive={color}
                        emissiveIntensity={0.6}
                        metalness={1}
                        roughness={0}
                    />
                </mesh>
            </group>
        </Float>
    )
}

function DataStream({ start, end, color }: { start: [number, number, number]; end: [number, number, number]; color: string }) {
    const particlesRef = useRef<THREE.Points>(null!)
    const count = 15

    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3)
        for (let i = 0; i < count; i++) {
            const t = i / count
            pos[i * 3] = start[0] + (end[0] - start[0]) * t
            pos[i * 3 + 1] = start[1] + (end[1] - start[1]) * t + Math.sin(t * Math.PI) * 0.15
            pos[i * 3 + 2] = start[2] + (end[2] - start[2]) * t
        }
        return pos
    }, [start, end])

    useFrame((state) => {
        if (particlesRef.current) {
            const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute
            const arr = posAttr.array as Float32Array
            for (let i = 0; i < count; i++) {
                const t = ((i / count) + state.clock.elapsedTime * 0.25) % 1
                arr[i * 3] = start[0] + (end[0] - start[0]) * t
                arr[i * 3 + 1] = start[1] + (end[1] - start[1]) * t + Math.sin(t * Math.PI) * 0.15
                arr[i * 3 + 2] = start[2] + (end[2] - start[2]) * t
            }
            posAttr.needsUpdate = true
        }
    })

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
            </bufferGeometry>
            <pointsMaterial color={color} size={0.03} transparent opacity={0.6} sizeAttenuation />
        </points>
    )
}

function Scene() {
    return (
        <>
            <ambientLight intensity={0.2} />
            <pointLight position={[5, 5, 5]} intensity={0.5} color="#58a6ff" />
            <pointLight position={[-5, 3, -5]} intensity={0.3} color="#3fb950" />

            <Stars radius={80} depth={40} count={1500} factor={3} saturation={0} fade speed={0.8} />

            {/* Pipeline nodes */}
            <PipelineNode position={[-3.5, 0.3, 0]} color="#58a6ff" scale={1} />
            <PipelineNode position={[-1.2, 0.5, -0.3]} color="#bc8cff" scale={0.85} />
            <PipelineNode position={[1.2, 0.2, 0.3]} color="#3fb950" scale={0.9} />
            <PipelineNode position={[3.5, 0.4, 0]} color="#39d2c0" scale={1.1} />

            {/* Data streams */}
            <DataStream start={[-3.5, 0.3, 0]} end={[-1.2, 0.5, -0.3]} color="#bc8cff" />
            <DataStream start={[-1.2, 0.5, -0.3]} end={[1.2, 0.2, 0.3]} color="#3fb950" />
            <DataStream start={[1.2, 0.2, 0.3]} end={[3.5, 0.4, 0]} color="#39d2c0" />
        </>
    )
}

export default function HeroScene() {
    return (
        <div className="absolute inset-0 z-0" style={{ opacity: 0.5 }}>
            <Canvas
                camera={{ position: [0, 0, 7], fov: 55 }}
                gl={{ antialias: true, alpha: true }}
                dpr={[1, 1.5]}
            >
                <Scene />
            </Canvas>
        </div>
    )
}
