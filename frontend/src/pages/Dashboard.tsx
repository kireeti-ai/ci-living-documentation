import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { getMe } from '../store/slices/authSlice'
import Navbar from '../components/Navbar'

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
        <Navbar title="Dashboard" />
        <div className="page-content">
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <Navbar title="Dashboard" />
      <div className="page-content">
        <div className="card">
          <h2>Welcome, {user.username}!</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>
            You are logged in as <strong>{user.email}</strong>
          </p>
        </div>

        <div className="card">
          <h3>Your Profile</h3>
          <table>
            <tbody>
              <tr>
                <td><strong>User ID</strong></td>
                <td>{user.id}</td>
              </tr>
              <tr>
                <td><strong>Full Name</strong></td>
                <td>{user.username}</td>
              </tr>
              <tr>
                <td><strong>Email</strong></td>
                <td>{user.email}</td>
              </tr>
              <tr>
                <td><strong>Role</strong></td>
                <td>
                  <span className={`badge badge-${user.role}`}>
                    {user.role.toUpperCase()}
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Status</strong></td>
                <td>
                  <span className="badge badge-active">Active</span>
                </td>
              </tr>
              <tr>
                <td><strong>Member Since</strong></td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
