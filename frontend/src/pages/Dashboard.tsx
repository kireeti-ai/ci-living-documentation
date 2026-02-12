import { useEffect, useState } from 'react'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { getMe } from '../store/slices/authSlice'
import Navbar from '../components/Navbar'
import ReactMarkdown from 'react-markdown'

const EPIC2_URL = process.env.NEXT_PUBLIC_EPIC2_URL
const EPIC4_URL = process.env.NEXT_PUBLIC_EPIC4_URL

interface ADR {
  title: string
  decision: string
  status: string
}

interface ArchitectureDiagrams {
  image_url?: string
  mermaid?: string
}

interface DocsResponse {
  readme?: string
  api_docs?: string
  adr?: ADR[]
  architecture_diagrams?: ArchitectureDiagrams
}

const Dashboard = () => {
  const dispatch = useAppDispatch()
  const { user, isLoading } = useAppSelector((state) => state.auth)

  const [docs, setDocs] = useState<DocsResponse | null>(null)
  const [summary, setSummary] = useState<string | null>(null)
  const [docLoading, setDocLoading] = useState(false)

  useEffect(() => {
    if (!user) {
      dispatch(getMe())
    }
  }, [user, dispatch])

  const generateDocumentation = async () => {
    try {
      setDocLoading(true)

      // 🔹 Call EPIC2
      const epic2Res = await fetch(EPIC2_URL as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo_url: 'https://github.com/your/repo' // Replace dynamically later
        })
      })

      const epic2Data = await epic2Res.json()
      setDocs(epic2Data)

      // 🔹 Call EPIC4 (summary)
      const epic4Res = await fetch(EPIC4_URL as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(epic2Data)
      })

      const epic4Data = await epic4Res.json()
      setSummary(epic4Data.summary)

    } catch (error) {
      console.error('Error generating documentation:', error)
    } finally {
      setDocLoading(false)
    }
  }

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

        {/* Welcome Card */}
        <div className="card">
          <h2>Welcome, {user.username}!</h2>
          <p style={{ color: '#666', marginTop: '8px' }}>
            You are logged in as <strong>{user.email}</strong>
          </p>
        </div>

        {/* Profile Card */}
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

        {/* Generate Docs Button */}
        <div className="card">
          <h3>Living Documentation</h3>
          <button
            onClick={generateDocumentation}
            className="btn btn-primary"
            disabled={docLoading}
          >
            {docLoading ? 'Generating...' : 'Generate Documentation'}
          </button>
        </div>

        {/* Executive Summary */}
        {summary && (
          <div className="card">
            <h3>Executive Summary</h3>
            <p style={{ marginTop: '10px' }}>{summary}</p>
          </div>
        )}

        {/* README */}
        {docs?.readme && (
          <div className="card">
            <h3>README</h3>
            <ReactMarkdown>{docs.readme}</ReactMarkdown>
          </div>
        )}

        {/* API Docs */}
        {docs?.api_docs && (
          <div className="card">
            <h3>API Documentation</h3>
            <ReactMarkdown>{docs.api_docs}</ReactMarkdown>
          </div>
        )}

        {/* ADR Section */}
        {docs?.adr && docs.adr.length > 0 && (
          <div className="card">
            <h3>Architecture Decision Records</h3>
            {docs.adr.map((item, index) => (
              <div key={index} style={{ marginTop: '15px' }}>
                <h4>{item.title}</h4>
                <p><strong>Status:</strong> {item.status}</p>
                <p>{item.decision}</p>
              </div>
            ))}
          </div>
        )}

        {/* Architecture Diagram */}
        {docs?.architecture_diagrams && (
          <div className="card">
            <h3>Architecture Diagram</h3>

            {docs.architecture_diagrams.image_url && (
              <img
                src={docs.architecture_diagrams.image_url}
                alt="Architecture Diagram"
                style={{ maxWidth: '100%', marginTop: '15px' }}
              />
            )}

            {docs.architecture_diagrams.mermaid && (
              <pre style={{ marginTop: '15px', overflowX: 'auto' }}>
                {docs.architecture_diagrams.mermaid}
              </pre>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default Dashboard
