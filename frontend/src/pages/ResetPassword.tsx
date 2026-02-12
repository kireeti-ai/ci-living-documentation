import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { authApi } from '../services/api'

const ResetPassword = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formErrors, setFormErrors] = useState<{ password?: string; confirmPassword?: string }>({})

  const validateForm = () => {
    const errors: { password?: string; confirmPassword?: string } = {}

    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters'
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear field error on change
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }))
    }
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    if (!token) {
      setError('Invalid reset token')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await authApi.resetPassword({
        token,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
      })
      setSuccess(true)
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password. The link may be invalid or expired.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Password Reset Successful</h1>
          <div className="alert alert-success">
            Your password has been reset successfully. You can now login with your new password.
          </div>
          <p style={{ textAlign: 'center', marginTop: '20px' }}>
            Redirecting to login...
          </p>
          <p className="auth-link" style={{ textAlign: 'center' }}>
            <Link to="/login">Go to Login</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Reset Password</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Enter your new password below.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">New Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={formErrors.password ? 'error' : ''}
              placeholder="Enter new password"
              disabled={isLoading}
            />
            {formErrors.password && <p className="error-text">{formErrors.password}</p>}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={formErrors.confirmPassword ? 'error' : ''}
              placeholder="Re-enter new password"
              disabled={isLoading}
            />
            {formErrors.confirmPassword && <p className="error-text">{formErrors.confirmPassword}</p>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <p className="auth-link">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPassword
