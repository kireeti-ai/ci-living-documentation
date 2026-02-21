import { lazy, Suspense } from 'react'
import Navbar from './components/Navbar'
import HeroSection from './components/HeroSection'
import Footer from './components/Footer'
import './styles/landing.css'

// Lazy load heavy sections for performance
const PipelineSection = lazy(() => import('./components/PipelineSection'))
const DashboardSection = lazy(() => import('./components/DashboardSection'))
const TeamSection = lazy(() => import('./components/TeamSection'))
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
    <div className="landing-page relative">
      <Navbar />
      <main>
        <HeroSection />

        <Suspense fallback={<SectionLoader />}>
          <PipelineSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <DashboardSection />
        </Suspense>
        <Suspense fallback={<SectionLoader />}>
          <TeamSection />
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
