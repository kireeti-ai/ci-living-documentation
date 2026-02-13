import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'

type AppBgVariant = 'dashboard' | 'projects' | 'detail' | 'viewer'

type Palette = {
  primary: string
  secondary: string
  tertiary: string
}

const palettes: Record<AppBgVariant, Palette> = {
  dashboard: { primary: '#60a5fa', secondary: '#34d399', tertiary: '#a78bfa' },
  projects: { primary: '#38bdf8', secondary: '#22c55e', tertiary: '#f59e0b' },
  detail: { primary: '#818cf8', secondary: '#34d399', tertiary: '#60a5fa' },
  viewer: { primary: '#22d3ee', secondary: '#60a5fa', tertiary: '#14b8a6' },
}

function NodeField({ color, count, speed }: { color: string; count: number; speed: number }) {
  const pointsRef = useRef<THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>>(null!)
  const cloudRef = useRef<THREE.Group>(null!)

  const positions = useMemo(() => {
    const data = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      data[i * 3] = (Math.random() - 0.5) * 14
      data[i * 3 + 1] = (Math.random() - 0.5) * 8
      data[i * 3 + 2] = (Math.random() - 0.5) * 8
    }
    return data
  }, [])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (cloudRef.current) {
      cloudRef.current.rotation.y = Math.sin(t * 0.08) * 0.22
      cloudRef.current.rotation.x = Math.cos(t * 0.06) * 0.08
    }
    if (pointsRef.current) {
      pointsRef.current.rotation.z += speed
      pointsRef.current.material.opacity = 0.28 + Math.sin(t * 0.6) * 0.09
    }
  })

  return (
    <group ref={cloudRef}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} count={count} />
        </bufferGeometry>
        <pointsMaterial color={color} size={0.03} transparent opacity={0.32} sizeAttenuation />
      </points>
    </group>
  )
}

function GlowRings({ primary, secondary }: { primary: string; secondary: string }) {
  const ringA = useRef<THREE.Mesh>(null!)
  const ringB = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (ringA.current) {
      ringA.current.rotation.z = t * 0.08
      ringA.current.rotation.x = Math.sin(t * 0.25) * 0.5
    }
    if (ringB.current) {
      ringB.current.rotation.z = -t * 0.06
      ringB.current.rotation.y = Math.cos(t * 0.2) * 0.45
    }
  })

  return (
    <>
      <mesh ref={ringA} position={[4.6, 2.8, -5.4]}>
        <torusGeometry args={[1.2, 0.04, 16, 80]} />
        <meshBasicMaterial color={primary} transparent opacity={0.26} />
      </mesh>
      <mesh ref={ringB} position={[-5, -3.2, -5.7]}>
        <torusGeometry args={[1.4, 0.045, 16, 80]} />
        <meshBasicMaterial color={secondary} transparent opacity={0.22} />
      </mesh>
    </>
  )
}

function GlowSpheres({ primary, secondary, tertiary }: Palette) {
  const sphereA = useRef<THREE.Mesh>(null!)
  const sphereB = useRef<THREE.Mesh>(null!)
  const sphereC = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    const t = state.clock.elapsedTime
    if (sphereA.current) {
      sphereA.current.position.x = 4.2 + Math.sin(t * 0.26) * 0.35
      sphereA.current.position.y = 1.6 + Math.cos(t * 0.24) * 0.22
    }
    if (sphereB.current) {
      sphereB.current.position.x = -4.4 + Math.cos(t * 0.2) * 0.3
      sphereB.current.position.y = -2.2 + Math.sin(t * 0.23) * 0.26
    }
    if (sphereC.current) {
      sphereC.current.position.x = 0.5 + Math.sin(t * 0.15) * 0.22
      sphereC.current.position.y = -3 + Math.cos(t * 0.2) * 0.2
    }
  })

  return (
    <>
      <mesh ref={sphereA} position={[4.2, 1.6, -6.2]}>
        <sphereGeometry args={[1.7, 32, 32]} />
        <meshBasicMaterial color={primary} transparent opacity={0.08} />
      </mesh>
      <mesh ref={sphereB} position={[-4.4, -2.2, -6]}>
        <sphereGeometry args={[2.2, 32, 32]} />
        <meshBasicMaterial color={secondary} transparent opacity={0.07} />
      </mesh>
      <mesh ref={sphereC} position={[0.5, -3, -6.4]}>
        <sphereGeometry args={[1.4, 32, 32]} />
        <meshBasicMaterial color={tertiary} transparent opacity={0.06} />
      </mesh>
    </>
  )
}

function Scene({ palette }: { palette: Palette }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[4, 4, 4]} intensity={0.42} color={palette.primary} />
      <pointLight position={[-4, -3, 2]} intensity={0.3} color={palette.secondary} />
      <Stars radius={70} depth={28} count={650} factor={3.4} saturation={0} fade speed={0.35} />
      <NodeField color={palette.primary} count={210} speed={0.00065} />
      <NodeField color={palette.secondary} count={130} speed={-0.00042} />
      <GlowRings primary={palette.primary} secondary={palette.secondary} />
      <GlowSpheres primary={palette.primary} secondary={palette.secondary} tertiary={palette.tertiary} />
    </>
  )
}

export default function AppThreeBackground({ variant = 'dashboard' }: { variant?: AppBgVariant }) {
  const palette = palettes[variant]
  return (
    <div className={`app-three-bg app-three-bg-${variant}`} aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 8], fov: 55 }} gl={{ antialias: true, alpha: true }} dpr={[1, 1.4]}>
        <Scene palette={palette} />
      </Canvas>
    </div>
  )
}
