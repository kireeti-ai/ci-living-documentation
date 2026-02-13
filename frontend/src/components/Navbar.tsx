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
      <div className="navbar-brand">
        <div className="navbar-logo" aria-hidden="true">DP</div>
        <h1 className="navbar-wordmark">DocPulse</h1>
      </div>
      <div className="navbar-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        <Link to="/docpulse" className="nav-ai-link">
          <span className="nav-ai-dot" />
          DocPulse AI
        </Link>
        {user?.role === 'admin' && <Link to="/settings">Settings</Link>}
        <span className="navbar-user">
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
