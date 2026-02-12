import { Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { getMe } from '../store/slices/authSlice'

interface ProtectedRouteProps {
  children: React.ReactNode
  adminOnly?: boolean
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const dispatch = useAppDispatch()
  const { isAuthenticated, user, isLoading, accessToken } = useAppSelector((state) => state.auth)

  useEffect(() => {
    // If we have a token but no user data, fetch user
    if (accessToken && !user && !isLoading) {
      dispatch(getMe())
    }
  }, [accessToken, user, isLoading, dispatch])

  // Show loading while fetching user data
  if (isLoading || (accessToken && !user)) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  // Not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }

  // Admin only route check
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute
