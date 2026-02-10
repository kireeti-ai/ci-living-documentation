import { Link, useNavigate } from 'react-router-dom'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { logout } from '../store/slices/authSlice'

interface NavbarProps {
  title?: string
}

const Navbar: React.FC<NavbarProps> = ({ title = 'Dashboard' }) => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <h1>{title}</h1>
      <div className="navbar-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/projects">Projects</Link>
        {user?.role === 'admin' && <Link to="/settings">Settings</Link>}
        <span style={{ color: '#666', fontSize: '14px' }}>
          {user?.email} ({user?.role})
        </span>
        <button 
          onClick={handleLogout} 
          className="btn btn-secondary btn-sm"
          style={{ width: 'auto' }}
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Navbar
