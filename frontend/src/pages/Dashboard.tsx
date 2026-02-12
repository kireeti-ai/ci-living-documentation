import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { getMe } from '../store/slices/authSlice'
import Navbar from '../components/Navbar'
import { motion } from 'framer-motion'
import { User, Activity, FileText, Settings, CreditCard, Shield, Clock } from 'lucide-react'
import { Link } from 'react-router-dom'

const Dashboard = () => {
  const dispatch = useAppDispatch()
  const { user, isLoading } = useAppSelector((state) => state.auth)

  useEffect(() => {
    if (!user) {
      dispatch(getMe())
    }
  }, [user, dispatch])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] dot-pattern">
        <Navbar title="Dashboard" />
        <div className="flex items-center justify-center h-[calc(100vh-64px)]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--border-muted)] border-t-[var(--accent-blue)] animate-spin"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] dot-pattern">
      <Navbar title="Dashboard" />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-12 gap-8"
        >
          {/* Sidebar Profile Card */}
          <div className="md:col-span-4 lg:col-span-3 space-y-6">
            <div className="md:-mt-12 pt-12 md:pt-0"> {/* Avatar overlap logic if needed, simplify for now */}
              <div className="w-full rounded-full aspect-square bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] mb-4 overflow-hidden shadow-lg max-w-[280px] mx-auto md:mx-0">
                {/* Placeholder for real avatar image */}
                <User size={120} className="opacity-20" />
              </div>

              <h1 className="text-2xl font-bold text-[var(--text-primary)]">{user.username}</h1>
              <p className="text-lg text-[var(--text-secondary)] mb-4">{user.email}</p>

              <Link to="/settings" className="w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md border border-[var(--border-default)] bg-[var(--bg-default)] text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors text-sm font-medium mb-6">
                Edit profile
              </Link>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Shield size={16} />
                  <span>Role: <span className="text-[var(--text-primary)] font-medium capitalize">{user.role}</span></span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <Clock size={16} />
                  <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="md:col-span-8 lg:col-span-9">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">Overview</h2>
              <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-default)] p-8 text-center md:text-left">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="p-4 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-muted)]">
                    <Activity size={32} className="text-[var(--accent-green)]" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">Welcome to your Dashboard</h3>
                    <p className="text-[var(--text-secondary)] max-w-lg mb-4">
                      This is your central hub for managing documentation projects.
                      Create new projects, track documentation builds, and manage team access.
                    </p>
                    <Link to="/projects" className="inline-flex items-center gap-2 text-[var(--accent-blue)] hover:underline font-medium">
                      Go to Projects &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-default)] p-6">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <FileText size={18} className="text-[var(--text-muted)]" />
                  Popular Repositories
                </h3>
                {/* Placeholder for Popular Repos */}
                <div className="bg-[var(--bg-subtle)]/50 rounded-lg p-8 text-center">
                  <p className="text-sm text-[var(--text-secondary)]">You don't have enough repositories yet.</p>
                  <Link to="/projects" className="text-xs text-[var(--accent-blue)] hover:underline mt-2 inline-block">
                    Create your first project
                  </Link>
                </div>
              </div>

              <div className="border border-[var(--border-default)] rounded-xl bg-[var(--bg-default)] p-6">
                <h3 className="font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                  <Activity size={18} className="text-[var(--text-muted)]" />
                  Recent Activity
                </h3>
                <div className="text-sm text-[var(--text-secondary)] space-y-4">
                  <div className="flex gap-3">
                    <div className="mt-0.5 text-[var(--text-muted)]">•</div>
                    <div>
                      <p>Joined DocPulse</p>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">{new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  )
}

export default Dashboard
