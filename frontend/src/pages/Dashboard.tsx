import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { getMe } from '../store/slices/authSlice'
import Navbar from '../components/Navbar'

import { Layout, FileText, Key, Users, Settings, Plus, Activity, BookOpen } from 'lucide-react'

const Dashboard = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
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
    { label: 'Total Projects', value: '12', icon: <Layout size={18} />, tone: 'blue' },
    { label: 'Documentation Pages', value: '148', icon: <FileText size={18} />, tone: 'green' },
    { label: 'Active Tokens', value: '3', icon: <Key size={18} />, tone: 'amber' },
    { label: 'Team Members', value: '8', icon: <Users size={18} />, tone: 'purple' },
  ]

  const activity = [
    'Updated API docs for shopstream/backend',
    'Generated architecture map for payment-service',
    'Added release notes for docs portal',
  ]

  return (
    <div className="page-container dashboard-shell">
      <Navbar />
      <main className="page-content">
        <section className="dash-header">
          <div>
            <h1 className="dash-title">Welcome back, {user.username}</h1>
            <p className="dash-subtitle">Build, diff, and ship living documentation with full Git context.</p>
          </div>
          <div className="dash-actions">
            <button className="btn btn-secondary" onClick={() => navigate('/settings')}>
              <Settings size={16} />
              Settings
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/projects')}>
              <Plus size={16} />
              New Project
            </button>
          </div>
        </section>

        <section className="dash-stats">
          {stats.map((stat, index) => (
            <article key={index} className={`dash-stat dash-stat-${stat.tone}`}>
              <div className="dash-stat-icon">
                {stat.icon}
              </div>
              <div>
                <p className="dash-stat-label">{stat.label}</p>
                <p className="dash-stat-value">{stat.value}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="dash-grid">
          <div className="dash-main">
            <article className="dash-panel">
              <div className="dash-panel-head">
                <h2 className="dash-panel-title">
                  <Activity size={18} />
                  Recent Activity
                </h2>
                <button className="dash-link-btn" onClick={() => navigate('/projects')}>View all</button>
              </div>

              <div className="dash-activity-list">
                {activity.map((message, i) => (
                  <div key={i} className="dash-activity-item">
                    <div className="dash-activity-dot" />
                    <div>
                      <p className="dash-activity-text">{message}</p>
                      <p className="dash-activity-meta">2 hours ago - main branch</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="dash-panel">
              <h2 className="dash-panel-title">Quick Start</h2>
              <pre className="dash-code"><code>git clone https://github.com/your-org/living-docs.git
cd living-docs
npm install && npm run dev</code></pre>
            </article>
          </div>

          <aside className="dash-side">
            <article className="dash-panel">
              <div className="dash-profile">
                <div className="dash-avatar">{user.username.charAt(0).toUpperCase()}</div>
                <h2>{user.username}</h2>
                <p>{user.email}</p>
                <span className={`badge badge-${user.role}`}>{user.role.toUpperCase()}</span>
              </div>

              <div className="dash-profile-meta">
                <div>
                  <span>Member since</span>
                  <strong>{new Date(user.created_at).toLocaleDateString()}</strong>
                </div>
                <div>
                  <span>Status</span>
                  <strong className="dash-status">Active</strong>
                </div>
              </div>
            </article>

            <article className="dash-panel dash-help">
              <h3>Help and Support</h3>
              <ul>
                <li><a href="#"><BookOpen size={14} /> Documentation</a></li>
                <li><a href="#"><FileText size={14} /> API Reference</a></li>
                <li><a href="#"><Layout size={14} /> System Status</a></li>
              </ul>
            </article>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default Dashboard
