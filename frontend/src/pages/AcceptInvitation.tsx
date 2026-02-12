import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAppSelector } from '../store/hooks'
import { invitationsApi } from '../services/api'

interface InvitationDetails {
  id: string
  email: string
  projectName: string
  inviterName: string
  expiresAt: string
}

const AcceptInvitation = () => {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAppSelector((state) => state.auth)

  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link')
        setIsLoading(false)
        return
      }

      try {
        const response = await invitationsApi.getDetails(token)
        setInvitation(response.data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load invitation')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  const handleAccept = async () => {
    if (!token) return

    setActionLoading(true)
    setError('')

    try {
      const response = await invitationsApi.accept(token)
      setSuccess(true)
      setTimeout(() => {
        navigate(`/projects/${response.data.project.id}`)
      }, 2000)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to accept invitation')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDecline = async () => {
    if (!token) return

    setActionLoading(true)
    setError('')

    try {
      await invitationsApi.decline(token)
      navigate('/projects')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to decline invitation')
    } finally {
      setActionLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="loading">Loading invitation...</div>
        </div>
      </div>
    )
  }

  if (error && !invitation) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Invalid Invitation</h1>
          <div className="alert alert-error">{error}</div>
          <Link to="/projects" className="btn btn-primary">
            Go to Projects
          </Link>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Invitation Accepted!</h1>
          <p>You have successfully joined {invitation?.projectName}.</p>
          <p>Redirecting to the project...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Project Invitation</h1>
          <div className="invitation-details">
            <p>
              <strong>{invitation?.inviterName}</strong> has invited you to join
            </p>
            <h2 className="project-name-highlight">{invitation?.projectName}</h2>
          </div>
          <p className="invitation-notice">
            Please log in or create an account to accept this invitation.
          </p>
          <div className="auth-actions">
            <Link to={`/login?redirect=/invite/${token}`} className="btn btn-primary">
              Log In
            </Link>
            <Link to={`/signup?redirect=/invite/${token}`} className="btn btn-secondary">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Check if the invitation email matches the logged-in user's email
  const emailMismatch = user && invitation && user.email.toLowerCase() !== invitation.email.toLowerCase()

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Project Invitation</h1>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="invitation-details">
          <p>
            <strong>{invitation?.inviterName}</strong> has invited you to join
          </p>
          <h2 className="project-name-highlight">{invitation?.projectName}</h2>
        </div>

        {emailMismatch && (
          <div className="alert alert-warning">
            This invitation was sent to <strong>{invitation?.email}</strong>, but you're logged in
            as <strong>{user?.email}</strong>. Please log in with the correct account to accept
            this invitation.
          </div>
        )}

        {!emailMismatch && (
          <div className="invitation-actions">
            <button
              className="btn btn-primary"
              onClick={handleAccept}
              disabled={actionLoading}
            >
              {actionLoading ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDecline}
              disabled={actionLoading}
            >
              Decline
            </button>
          </div>
        )}

        <p className="invitation-expires">
          This invitation expires on {new Date(invitation?.expiresAt || '').toLocaleDateString()}
        </p>
      </div>
    </div>
  )
}

export default AcceptInvitation
