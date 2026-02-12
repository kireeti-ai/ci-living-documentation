import { lazy, Suspense } from 'react'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import Footer from './components/Footer'

// Lazy load heavy sections for performance
const PipelineSection = lazy(() => import('./components/PipelineSection'))
const ArchitectureSection = lazy(() => import('./components/ArchitectureSection'))
const DashboardSection = lazy(() => import('./components/DashboardSection'))
const AISection = lazy(() => import('./components/AISection'))
const DiagramShowcase = lazy(() => import('./components/DiagramShowcase'))
const ArtifactShowcase = lazy(() => import('./components/ArtifactShowcase'))

function SectionLoader() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
        <div className="w-2 h-2 rounded-full bg-pink-400 animate-pulse" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  )
}



export default function LandingPage() {
  return (
    <div className="relative">
      <Navbar />
      <main>
        <HeroSection />

        <Suspense fallback={<SectionLoader />}>
          <PipelineSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <ArchitectureSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <DashboardSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <AISection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <DiagramShowcase />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <ArtifactShowcase />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
