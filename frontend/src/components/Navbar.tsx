import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../store/slices/authSlice'
import { LayoutDashboard, FolderKanban, Settings, LogOut, Hexagon, User } from 'lucide-react'

interface NavbarProps {
  title?: string
}

const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAppSelector((state) => state.auth)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[var(--bg-default)]/80 border-b border-[var(--border-muted)] px-6 py-3 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link to="/dashboard" className="flex items-center gap-2 group">
            <div className="p-1.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] group-hover:border-[var(--accent-blue)] transition-colors">
              <Hexagon size={20} className="text-[var(--accent-green)]" />
            </div>
            <span className="font-semibold text-[var(--text-primary)] text-lg">DocPulse</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/dashboard') ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]/50'}`}
            >
              <LayoutDashboard size={16} />
              Overview
            </Link>
            <Link
              to="/projects"
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/projects') ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]/50'}`}
            >
              <FolderKanban size={16} />
              Projects
            </Link>
            {user?.role === 'admin' && (
              <Link
                to="/settings"
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive('/settings') ? 'bg-[var(--bg-subtle)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)]/50'}`}
              >
                <Settings size={16} />
                Settings
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-3 pr-4 border-r border-[var(--border-muted)]">
            <div className="text-right">
              <p className="text-sm font-medium text-[var(--text-primary)] leading-tight">{user?.username}</p>
              <p className="text-xs text-[var(--text-secondary)]">{user?.email}</p>
            </div>
            <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)]">
              <User size={16} />
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-md border border-[var(--border-default)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:text-[var(--text-danger)] hover:border-[var(--text-danger)] hover:bg-[var(--bg-default)] transition-all text-sm font-medium shadow-sm"
            title="Sign out"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
