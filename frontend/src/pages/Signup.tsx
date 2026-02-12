import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { signup, clearError } from '../store/slices/authSlice'
import { motion } from 'framer-motion'
import { User, Mail, Lock, Hexagon, ArrowLeft, Loader2, AlertCircle } from 'lucide-react'

const Signup = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isLoading, error, otpSent } = useAppSelector((state) => state.auth)

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [formErrors, setFormErrors] = useState<{
    username?: string
    email?: string
    password?: string
    confirmPassword?: string
  }>({})

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  // Navigate to OTP page when signup is successful
  useEffect(() => {
    if (otpSent) {
      navigate('/verify_otp')
    }
  }, [otpSent, navigate])

  const validateForm = () => {
    const errors: typeof formErrors = {}

    if (!formData.username.trim()) {
      errors.username = 'Full name is required'
    }

    if (!formData.email) {
      errors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }

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
    if (formErrors[name as keyof typeof formErrors]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    await dispatch(
      signup({
        email: formData.email,
        password: formData.password,
        username: formData.username,
      })
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden main-bg-gradient py-12">
      {/* Background Effects */}
      <div className="absolute inset-0 dot-pattern opacity-30" />
      <div className="glow-blue" style={{ top: '-20%', right: '-10%', opacity: 0.4 }} />
      <div className="glow-purple" style={{ bottom: '-20%', left: '-10%', opacity: 0.4 }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] mb-8 transition-colors">
          <ArrowLeft size={16} /> Back to Home
        </Link>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-default)] mb-4 hover:border-[var(--accent-blue)] transition-colors">
            <Hexagon size={24} className="text-[var(--accent-green)]" />
          </Link>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create your account</h1>
          <p className="text-[var(--text-secondary)] mt-2">Join DocPulse to automate your documentation</p>
        </div>

        <div className="gh-card backdrop-blur-xl bg-[var(--bg-default)]/90 shadow-2xl border-[var(--border-muted)]">
          {error && (
            <div className="mb-6 p-4 rounded-md bg-red-900/20 border border-red-900/50 flex items-center gap-3 text-red-200">
              <AlertCircle size={18} className="shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="form-group">
              <label htmlFor="username" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-[var(--text-muted)]" />
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-md bg-[var(--bg-subtle)] border ${formErrors.username ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-default)] focus:border-[var(--accent-blue)]'} text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent-blue)] focus:outline-none transition-all`}
                  placeholder="John Doe"
                  disabled={isLoading}
                />
              </div>
              {formErrors.username && <p className="mt-1 text-xs text-red-400">{formErrors.username}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="email" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Email address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail size={16} className="text-[var(--text-muted)]" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-md bg-[var(--bg-subtle)] border ${formErrors.email ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-default)] focus:border-[var(--accent-blue)]'} text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent-blue)] focus:outline-none transition-all`}
                  placeholder="name@company.com"
                  disabled={isLoading}
                />
              </div>
              {formErrors.email && <p className="mt-1 text-xs text-red-400">{formErrors.email}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-[var(--text-muted)]" />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-md bg-[var(--bg-subtle)] border ${formErrors.password ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-default)] focus:border-[var(--accent-blue)]'} text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent-blue)] focus:outline-none transition-all`}
                  placeholder="At least 6 characters"
                  disabled={isLoading}
                />
              </div>
              {formErrors.password && <p className="mt-1 text-xs text-red-400">{formErrors.password}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text-primary)] mb-2">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock size={16} className="text-[var(--text-muted)]" />
                </div>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-md bg-[var(--bg-subtle)] border ${formErrors.confirmPassword ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-default)] focus:border-[var(--accent-blue)]'} text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:ring-1 focus:ring-[var(--accent-blue)] focus:outline-none transition-all`}
                  placeholder="Confirm your password"
                  disabled={isLoading}
                />
              </div>
              {formErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-400">{formErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-[var(--accent-green-emphasis)] hover:bg-[#2ea043] text-white font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              disabled={isLoading}
            >
              {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center mt-8 text-sm text-[var(--text-secondary)]">
          Already have an account? <Link to="/login" style={{ color: 'var(--text-link)' }} className="hover:underline">Sign in</Link>
        </p>
      </motion.div>
    </div>
  )
}

export default Signup
