import { Link, useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { logout } from '../store/slices/authSlice'

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="flex items-center gap-3">
        <img src="/logo-icon.svg" alt="DocPulse Logo" className="w-8 h-8 rounded-lg" />
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">DocPulse</h1>
      </div>
      <div className="navbar-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/docpulse" className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-400 font-medium hover:text-purple-300 transition-all">
          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          DocPulse AI
        </Link>
        {user?.role === 'admin' && <Link to="/settings">Settings</Link>}
        <span className="text-secondary text-[14px]">
          {user?.email} ({user?.role})
        </span>
        <button
          onClick={handleLogout}
          className="btn btn-secondary btn-sm"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Navbar
