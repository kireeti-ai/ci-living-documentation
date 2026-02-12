import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../services/api'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [emailError, setEmailError] = useState('')

  const validateEmail = (email: string) => {
    if (!email) {
      return 'Email is required'
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      return 'Invalid email format'
    }
    return ''
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setEmailError('')
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const emailValidationError = validateEmail(email)
    if (emailValidationError) {
      setEmailError(emailValidationError)
      return
    }

    setIsLoading(true)
    setError('')

    try {
      await authApi.forgotPassword(email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Check Your Email</h1>
          <div className="alert alert-success">
            If an account with that email exists, a password reset link has been sent.
            Please check your inbox and follow the instructions.
          </div>
          <p className="auth-link" style={{ textAlign: 'center', marginTop: '20px' }}>
            <Link to="/login">Back to Login</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Forgot Password</h1>
        <p style={{ color: '#666', marginBottom: '20px' }}>
          Enter your email address and we'll send you a link to reset your password.
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={handleChange}
              className={emailError ? 'error' : ''}
              placeholder="Enter your email"
              disabled={isLoading}
            />
            {emailError && <p className="error-text">{emailError}</p>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className="auth-link">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPassword
