import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { getMe } from '../store/slices/authSlice'
import Navbar from '../components/Navbar'

import { Layout, FileText, Key, Users, Settings, Plus, Activity, BookOpen } from 'lucide-react'

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
      <div className="page-container">
        <Navbar />
        <div className="page-content">
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    )
  }

  const stats = [
    { label: 'Total Projects', value: '12', icon: <Layout className="w-5 h-5 text-blue-400" /> },
    { label: 'Documentation Pages', value: '148', icon: <FileText className="w-5 h-5 text-green-400" /> },
    { label: 'Active Tokens', value: '3', icon: <Key className="w-5 h-5 text-yellow-400" /> },
    { label: 'Team Members', value: '8', icon: <Users className="w-5 h-5 text-purple-400" /> },
  ]

  return (
    <div className="page-container">
      <Navbar />
      <div className="page-content">

        {/* Header Section */}
        <div className="dashboard-header">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="dashboard-title text-3xl mb-2">
                Welcome back, {user.username}
              </h1>
              <p className="dashboard-subtitle text-lg">
                Here's what's happening with your documentation today.
              </p>
            </div>
            <div className="flex gap-3">
              <button className="btn btn-secondary flex items-center gap-2">
                <Settings size={16} />
                Settings
              </button>
              <button className="btn btn-primary flex items-center gap-2">
                <Plus size={16} />
                New Project
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid mb-8">
          {stats.map((stat, index) => (
            <div key={index} className="gh-card card-hover flex items-center p-6 gap-4">
              <div className="p-3 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)]">
                {stat.icon}
              </div>
              <div>
                <div className="text-sm text-[var(--text-secondary)] font-medium mb-1">{stat.label}</div>
                <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity / Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <div className="gh-card">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Activity size={20} className="text-[var(--accent-orange)]" />
                  Recent Activity
                </h3>
                <button className="text-sm text-[var(--text-link)] hover:underline">View all</button>
              </div>

              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors border border-transparent hover:border-[var(--border-muted)]">
                    <div className="mt-1">
                      <div className="w-2 h-2 rounded-full bg-[var(--accent-green)] mt-2"></div>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        Updated documentation for <span className="text-[var(--text-link)]">shopstream/backend</span>
                      </p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">2 hours ago • main branch</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="gh-card">
              <h3 className="text-xl font-semibold mb-4">Quick Start</h3>
              <div className="bg-[var(--bg-subtle)] p-4 rounded-md border border-[var(--border-default)] font-mono text-sm text-[var(--text-secondary)]">
                <span className="text-[var(--accent-purple)]">git</span> clone https://github.com/your-org/living-docs.git <br />
                <span className="text-[var(--accent-purple)]">cd</span> living-docs <br />
                <span className="text-[var(--accent-purple)]">npm</span> install && npm run dev
              </div>
            </div>
          </div>

          {/* Sidebar / Profile Card */}
          <div className="lg:col-span-1">
            <div className="gh-card">
              <div className="flex flex-col items-center text-center mb-6 border-b border-[var(--border-default)] pb-6">
                <div className="w-20 h-20 rounded-full bg-[var(--bg-subtle)] border-2 border-[var(--border-default)] flex items-center justify-center mb-4 text-3xl font-bold text-[var(--text-secondary)]">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold mb-1">{user.username}</h2>
                <p className="text-[var(--text-secondary)] text-sm">{user.email}</p>
                <span className={`mt-3 badge badge-${user.role} px-3 py-1`}>
                  {user.role.toUpperCase()}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Member since</span>
                  <span className="font-medium">{new Date(user.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Status</span>
                  <span className="text-[var(--accent-green)] flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-green)]"></div>
                    Active
                  </span>
                </div>
              </div>
            </div>

            <div className="gh-card-subtle mt-6">
              <h4 className="text-sm font-semibold mb-3 text-[var(--text-secondary)] uppercase tracking-wider">Help & Support</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-link)]"><BookOpen size={14} /> Documentation</a></li>
                <li><a href="#" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-link)]"><FileText size={14} /> API Reference</a></li>
                <li><a href="#" className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-link)]"><Layout size={14} /> System Status</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
