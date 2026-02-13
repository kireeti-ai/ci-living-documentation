import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { getMe } from '../store/slices/authSlice'
import { fetchProjects } from '../store/slices/projectsSlice'
import Navbar from '../components/Navbar'

import {
  Layout,
  Github,
  Key,
  Shield,
  Settings,
  Plus,
  Activity,
  BookOpen,
  ArrowRight,
} from 'lucide-react'

const Dashboard = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user, isLoading } = useAppSelector((state) => state.auth)
  const { projects, isLoading: isProjectsLoading } = useAppSelector((state) => state.projects)

  useEffect(() => {
    if (!user) {
      dispatch(getMe())
    }
  }, [user, dispatch])

  useEffect(() => {
    if (user) {
      dispatch(fetchProjects())
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

  const projectsWithGithub = useMemo(
    () => projects.filter((project) => Boolean(project.githubUrl)).length,
    [projects]
  )

  const projectsWithToken = useMemo(
    () => projects.filter((project) => project.settings?.hasGithubToken).length,
    [projects]
  )

  const ownerProjects = useMemo(
    () => projects.filter((project) => project.memberRole === 'owner').length,
    [projects]
  )

  const recentProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 4),
    [projects]
  )

  const stats = [
    { label: 'Total Projects', value: String(projects.length), icon: <Layout size={18} />, tone: 'blue' },
    { label: 'GitHub Linked', value: String(projectsWithGithub), icon: <Github size={18} />, tone: 'green' },
    { label: 'Saved Tokens', value: String(projectsWithToken), icon: <Key size={18} />, tone: 'amber' },
    { label: 'Owner Access', value: String(ownerProjects), icon: <Shield size={18} />, tone: 'purple' },
  ]

  const primaryProject = recentProjects[0]

  return (
    <div className="page-container dashboard-shell">
      <Navbar />
      <main className="page-content">
        <section className="dash-header">
          <div className="dash-header-copy">
            <p className="dash-kicker">Workspace Overview</p>
            <h1 className="dash-title">Welcome back, {user.username}</h1>
            <p className="dash-subtitle">Build, diff, and ship living documentation with full Git context.</p>
            {primaryProject && (
              <div className="dash-highlight">
                <span className="dash-highlight-label">Focus Project</span>
                <button className="dash-highlight-link" onClick={() => navigate(`/projects/${primaryProject.id}`)}>
                  {primaryProject.name}
                  <ArrowRight size={14} />
                </button>
              </div>
            )}
          </div>
          <div className="dash-actions">
            {user.role === 'admin' && (
              <button className="btn btn-secondary" onClick={() => navigate('/settings')}>
                <Settings size={16} />
                Settings
              </button>
            )}
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
                  Recent Projects
                </h2>
                <button className="dash-link-btn" onClick={() => navigate('/projects')}>View all</button>
              </div>

              <div className="dash-activity-list">
                {isProjectsLoading ? (
                  <div className="loading">
                    <div className="spinner"></div>
                  </div>
                ) : recentProjects.length === 0 ? (
                  <div className="dash-activity-item">
                    <div>
                      <p className="dash-activity-text">No projects yet.</p>
                      <p className="dash-activity-meta">Create your first project to get started.</p>
                    </div>
                  </div>
                ) : (
                  recentProjects.map((project) => (
                    <button
                      key={project.id}
                      className="dash-activity-item dash-activity-btn"
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <div className="dash-activity-dot" />
                      <div>
                        <p className="dash-activity-text">{project.name}</p>
                        <p className="dash-activity-meta">
                          Updated {new Date(project.updatedAt).toLocaleDateString()} - {project.memberRole}
                        </p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </article>

            <article className="dash-panel">
              <h2 className="dash-panel-title">Quick Start</h2>
              <div className="dash-activity-list">
                <button className="dash-activity-item" onClick={() => navigate('/projects')}>
                  <div className="dash-activity-dot" />
                  <div>
                    <p className="dash-activity-text">1. Create a project</p>
                    <p className="dash-activity-meta">Add repository name, GitHub URL, and optional automation settings.</p>
                  </div>
                  <ArrowRight size={14} />
                </button>
                <button className="dash-activity-item" onClick={() => navigate('/projects')}>
                  <div className="dash-activity-dot" />
                  <div>
                    <p className="dash-activity-text">2. Configure repository access</p>
                    <p className="dash-activity-meta">Set GitHub token/webhook so docs can be generated from CI events.</p>
                  </div>
                  <ArrowRight size={14} />
                </button>
                <button
                  className="dash-activity-item"
                  onClick={() => navigate(primaryProject ? `/projects/${primaryProject.id}` : '/projects')}
                >
                  <div className="dash-activity-dot" />
                  <div>
                    <p className="dash-activity-text">3. Generate documentation</p>
                    <p className="dash-activity-meta">
                      {primaryProject
                        ? `Open ${primaryProject.name} and run/trigger docs generation.`
                        : 'Open a project and trigger your first docs build.'}
                    </p>
                  </div>
                  <ArrowRight size={14} />
                </button>
                <button
                  className="dash-activity-item"
                  onClick={() => navigate(primaryProject ? `/projects/${primaryProject.id}` : '/projects')}
                >
                  <div className="dash-activity-dot" />
                  <div>
                    <p className="dash-activity-text">4. Review versions and compare commits</p>
                    <p className="dash-activity-meta">
                      {primaryProject
                        ? 'Open document history, inspect changes, and compare two commits.'
                        : 'After generation, inspect doc history and compare commits.'}
                    </p>
                  </div>
                  <ArrowRight size={14} />
                </button>
              </div>
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
                <li><Link to="/projects"><BookOpen size={14} /> Project Documentation</Link></li>
                {user.role === 'admin' && (
                  <li><Link to="/settings"><Settings size={14} /> Platform Settings</Link></li>
                )}
                <li><a href="https://github.com" target="_blank" rel="noreferrer"><Layout size={14} /> GitHub Status</a></li>
              </ul>
            </article>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default Dashboard
