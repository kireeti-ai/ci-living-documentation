import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { logout } from '../store/slices/authSlice'
import TempleLogo from './TempleLogo'
import { Menu, X } from 'lucide-react'

const Navbar: React.FC = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await dispatch(logout())
    setMobileOpen(false)
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand" aria-label="Go to landing page">
        <div className="navbar-logo" aria-hidden="true">
          <TempleLogo />
        </div>
        <h1 className="navbar-wordmark">
          DocPulse<span style={{ color: 'var(--accent-blue)' }}> AI</span>
        </h1>
      </Link>

      <button
        className="navbar-mobile-toggle"
        aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((prev) => !prev)}
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      <div className={`navbar-links ${mobileOpen ? 'is-open' : ''}`}>
        <div className="navbar-links-primary">
          <NavLink to="/dashboard" onClick={() => setMobileOpen(false)} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Dashboard
          </NavLink>
          <NavLink to="/projects" onClick={() => setMobileOpen(false)} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
            Projects
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/settings" onClick={() => setMobileOpen(false)} className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Settings
            </NavLink>
          )}
        </div>

        <div className="navbar-links-meta">
          <span className="navbar-user">
            {user?.email} ({user?.role})
          </span>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm">
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
