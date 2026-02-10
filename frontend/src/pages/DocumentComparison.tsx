import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { documentsApi, DocumentMetadata } from '../services/api'
import Navbar from '../components/Navbar'

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  content: string
  lineNumber: { left?: number; right?: number }
}

const DocumentComparison = () => {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const version1 = searchParams.get('v1') || ''
  const version2 = searchParams.get('v2') || ''

  // State
  const [content1, setContent1] = useState<string | null>(null)
  const [content2, setContent2] = useState<string | null>(null)
  const [metadata1, setMetadata1] = useState<DocumentMetadata | null>(null)
  const [metadata2, setMetadata2] = useState<DocumentMetadata | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load both documents
  useEffect(() => {
    const loadDocuments = async () => {
      if (!id || !version1 || !version2) {
        setError('Missing version parameters')
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)
      try {
        const [response1, response2] = await Promise.all([
          documentsApi.get(id, version1),
          documentsApi.get(id, version2),
        ])

        setContent1(response1.data.content)
        setContent2(response2.data.content)
        setMetadata1(response1.data.metadata)
        setMetadata2(response2.data.metadata)
        setProjectName(response1.data.projectName)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load documents')
      } finally {
        setIsLoading(false)
      }
    }

    loadDocuments()
  }, [id, version1, version2])

  // Compute diff
  const diffLines = useMemo(() => {
    if (!content1 || !content2) return []

    const lines1 = content1.split('\n')
    const lines2 = content2.split('\n')

    // Simple diff algorithm (LCS-based)
    return computeDiff(lines1, lines2)
  }, [content1, content2])

  // Stats
  const stats = useMemo(() => {
    const added = diffLines.filter(l => l.type === 'added').length
    const removed = diffLines.filter(l => l.type === 'removed').length
    const unchanged = diffLines.filter(l => l.type === 'unchanged').length
    return { added, removed, unchanged }
  }, [diffLines])

  if (isLoading) {
    return (
      <div className="page-container">
        <Navbar />
        <main className="main-content">
          <div className="loading">Loading documents for comparison...</div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-container">
        <Navbar />
        <main className="main-content">
          <div className="alert alert-error">{error}</div>
          <button className="btn btn-primary" onClick={() => navigate(`/projects/${id}`)}>
            Back to Project
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="page-container">
      <Navbar />
      <main className="main-content comparison-page">
        {/* Breadcrumb */}
        <div className="content-header">
          <div className="breadcrumb">
            <button className="btn-link" onClick={() => navigate('/projects')}>
              Projects
            </button>
            <span>/</span>
            <button className="btn-link" onClick={() => navigate(`/projects/${id}`)}>
              {projectName}
            </button>
            <span>/</span>
            <span>Compare</span>
          </div>
        </div>

        {/* Comparison Header */}
        <div className="comparison-header">
          <h1>Comparing Versions</h1>
          
          <div className="comparison-versions">
            <div className="version-info left">
              <span className="version-badge">{version1}</span>
              {metadata1 && (
                <div className="version-meta">
                  <span>Branch: {metadata1.branch}</span>
                  <span>Commit: {metadata1.commit.substring(0, 7)}</span>
                </div>
              )}
            </div>
            <span className="vs">vs</span>
            <div className="version-info right">
              <span className="version-badge">{version2}</span>
              {metadata2 && (
                <div className="version-meta">
                  <span>Branch: {metadata2.branch}</span>
                  <span>Commit: {metadata2.commit.substring(0, 7)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="diff-stats">
            <span className="stat added">+{stats.added} added</span>
            <span className="stat removed">-{stats.removed} removed</span>
            <span className="stat unchanged">{stats.unchanged} unchanged</span>
          </div>
        </div>

        {/* Diff View */}
        <div className="diff-container">
          <div className="diff-sides">
            {/* Left side (version 1) */}
            <div className="diff-side left">
              <div className="diff-side-header">
                <span className="version-label">{version1}</span>
                {metadata1 && <span className="date">{new Date(metadata1.createdAt).toLocaleDateString()}</span>}
              </div>
              <div className="diff-content">
                {diffLines.map((line, index) => (
                  <div 
                    key={`left-${index}`} 
                    className={`diff-line ${line.type === 'removed' ? 'removed' : line.type === 'added' ? 'empty' : ''}`}
                  >
                    <span className="line-number">
                      {line.lineNumber.left || ''}
                    </span>
                    <span className="line-content">
                      {line.type !== 'added' ? line.content : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right side (version 2) */}
            <div className="diff-side right">
              <div className="diff-side-header">
                <span className="version-label">{version2}</span>
                {metadata2 && <span className="date">{new Date(metadata2.createdAt).toLocaleDateString()}</span>}
              </div>
              <div className="diff-content">
                {diffLines.map((line, index) => (
                  <div 
                    key={`right-${index}`} 
                    className={`diff-line ${line.type === 'added' ? 'added' : line.type === 'removed' ? 'empty' : ''}`}
                  >
                    <span className="line-number">
                      {line.lineNumber.right || ''}
                    </span>
                    <span className="line-content">
                      {line.type !== 'removed' ? line.content : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="comparison-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate(`/projects/${id}`)}
          >
            Back to Project
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/projects/${id}/docs/${encodeURIComponent(version1)}`)}
          >
            View {version1}
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/projects/${id}/docs/${encodeURIComponent(version2)}`)}
          >
            View {version2}
          </button>
        </div>
      </main>
    </div>
  )
}

/**
 * Simple diff algorithm using Longest Common Subsequence
 */
function computeDiff(lines1: string[], lines2: string[]): DiffLine[] {
  const m = lines1.length
  const n = lines2.length
  
  // Build LCS table
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (lines1[i - 1] === lines2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }
  
  // Backtrack to find diff
  const result: DiffLine[] = []
  let i = m
  let j = n
  
  const items: { type: 'unchanged' | 'added' | 'removed'; content: string; i: number; j: number }[] = []
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && lines1[i - 1] === lines2[j - 1]) {
      items.unshift({ type: 'unchanged', content: lines1[i - 1], i: i - 1, j: j - 1 })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      items.unshift({ type: 'added', content: lines2[j - 1], i: -1, j: j - 1 })
      j--
    } else if (i > 0) {
      items.unshift({ type: 'removed', content: lines1[i - 1], i: i - 1, j: -1 })
      i--
    }
  }
  
  // Build result with line numbers
  let leftNum = 1
  let rightNum = 1
  
  for (const item of items) {
    const line: DiffLine = {
      type: item.type,
      content: item.content,
      lineNumber: {}
    }
    
    if (item.type === 'unchanged') {
      line.lineNumber.left = leftNum++
      line.lineNumber.right = rightNum++
    } else if (item.type === 'removed') {
      line.lineNumber.left = leftNum++
    } else if (item.type === 'added') {
      line.lineNumber.right = rightNum++
    }
    
    result.push(line)
  }
  
  return result
}

export default DocumentComparison
