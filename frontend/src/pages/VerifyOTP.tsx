import { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { verifyOtp, resendOtp, clearError, clearOtpState } from '../store/slices/authSlice'

const OTP_LENGTH = 6
const RESEND_COOLDOWN = 30 // seconds

const VerifyOTP = () => {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { isLoading, error, otpEmail, isAuthenticated } = useAppSelector((state) => state.auth)

  const [otp, setOtp] = useState<string[]>(new Array(OTP_LENGTH).fill(''))
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN)
  const [canResend, setCanResend] = useState(false)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Redirect if no email to verify
  useEffect(() => {
    if (!otpEmail) {
      navigate('/signup')
    }
  }, [otpEmail, navigate])

  // Redirect on successful verification
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard')
    }
  }, [isAuthenticated, navigate])

  // Resend timer countdown
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000)
      return () => clearTimeout(timer)
    } else {
      setCanResend(true)
    }
  }, [resendTimer])

  // Clear error on mount
  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return

    const newOtp = [...otp]
    newOtp[index] = value
    setOtp(newOtp)

    // Auto focus next input
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto submit when all digits entered
    if (value && index === OTP_LENGTH - 1) {
      const fullOtp = newOtp.join('')
      if (fullOtp.length === OTP_LENGTH) {
        handleVerify(fullOtp)
      }
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, OTP_LENGTH)
    
    if (!/^\d+$/.test(pastedData)) return

    const newOtp = [...otp]
    pastedData.split('').forEach((char, index) => {
      if (index < OTP_LENGTH) {
        newOtp[index] = char
      }
    })
    setOtp(newOtp)

    // Focus last filled input or submit
    const lastIndex = Math.min(pastedData.length - 1, OTP_LENGTH - 1)
    inputRefs.current[lastIndex]?.focus()

    if (pastedData.length === OTP_LENGTH) {
      handleVerify(pastedData)
    }
  }

  const handleVerify = async (otpValue?: string) => {
    const otpToVerify = otpValue || otp.join('')
    if (otpToVerify.length !== OTP_LENGTH || !otpEmail) return

    await dispatch(verifyOtp({ email: otpEmail, otp: otpToVerify }))
  }

  const handleResend = async () => {
    if (!canResend || !otpEmail) return

    setCanResend(false)
    setResendTimer(RESEND_COOLDOWN)
    setOtp(new Array(OTP_LENGTH).fill(''))
    inputRefs.current[0]?.focus()

    await dispatch(resendOtp(otpEmail))
  }

  const handleBack = () => {
    dispatch(clearOtpState())
    navigate('/signup')
  }

  if (!otpEmail) {
    return null
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Verify Your Email</h2>
        <p className="subtitle">
          We've sent a 6-digit code to <strong>{otpEmail}</strong>
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="otp-container" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="otp-input"
              disabled={isLoading}
              autoFocus={index === 0}
            />
          ))}
        </div>

        <button
          onClick={() => handleVerify()}
          className="btn btn-primary"
          disabled={isLoading || otp.join('').length !== OTP_LENGTH}
        >
          {isLoading ? 'Verifying...' : 'Verify OTP'}
        </button>

        <div className="resend-otp">
          {canResend ? (
            <button onClick={handleResend} disabled={isLoading}>
              Resend OTP
            </button>
          ) : (
            <span className="countdown">
              Resend OTP in {resendTimer}s
            </span>
          )}
        </div>

        <p className="auth-link">
          <button
            onClick={handleBack}
            style={{
              background: 'none',
              border: 'none',
              color: '#4f46e5',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            ← Back to Sign Up
          </button>
        </p>
      </div>
    </div>
  )
}

export default VerifyOTP
