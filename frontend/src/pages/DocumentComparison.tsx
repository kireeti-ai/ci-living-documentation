import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { documentsApi, DocumentMetadata } from '../services/api'
import Navbar from '../components/Navbar'

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  content: string
  lineNumber: { left?: number; right?: number }
}

// API Endpoint structure (matching DocumentViewer.tsx)
interface ApiEndpoint {
  key: string
  method: string
  path: string
  source_file: string
  summary: string
  parameters: string
  responses: string
}

interface ApiDocs {
  total_endpoints: number
  endpoints: ApiEndpoint[]
}

interface ApiDiff {
  added: ApiEndpoint[]
  removed: ApiEndpoint[]
  modified: Array<{
    key: string
    old: ApiEndpoint
    new: ApiEndpoint
    changes: string[]
  }>
  unchanged: ApiEndpoint[]
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
  const [expandedApis, setExpandedApis] = useState<Set<string>>(new Set())

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

        // Handle string or object content
        const processContent = (content: any) => {
          if (typeof content === 'object' && content !== null) {
            return JSON.stringify(content, null, 2)
          }
          return content
        }

        setContent1(processContent(response1.data.content))
        setContent2(processContent(response2.data.content))
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

  // Try to parse content as JSON
  const parsedDocs = useMemo(() => {
    let docs1: ApiDocs | null = null
    let docs2: ApiDocs | null = null

    try {
      if (content1) docs1 = JSON.parse(content1)
    } catch {
      docs1 = null
    }

    try {
      if (content2) docs2 = JSON.parse(content2)
    } catch {
      docs2 = null
    }

    // Check if it matches the expected structure (endpoints array)
    const isJson = docs1 && Array.isArray(docs1.endpoints) && docs2 && Array.isArray(docs2.endpoints)

    return { docs1, docs2, isJson }
  }, [content1, content2])

  // Compute API diff for JSON docs
  const apiDiff = useMemo<ApiDiff | null>(() => {
    if (!parsedDocs.isJson || !parsedDocs.docs1 || !parsedDocs.docs2) return null

    // Create maps for easier comparison by key
    const endpoints1 = new Map(parsedDocs.docs1.endpoints.map(e => [e.key, e]))
    const endpoints2 = new Map(parsedDocs.docs2.endpoints.map(e => [e.key, e]))

    const added: ApiEndpoint[] = []
    const removed: ApiEndpoint[] = []
    const modified: ApiDiff['modified'] = []
    const unchanged: ApiEndpoint[] = []

    // Find added endpoints (in docs2 but not in docs1)
    for (const [key, endpoint] of endpoints2.entries()) {
      if (!endpoints1.has(key)) {
        added.push(endpoint)
      }
    }

    // Find removed endpoints (in docs1 but not in docs2)
    for (const [key, endpoint] of endpoints1.entries()) {
      if (!endpoints2.has(key)) {
        removed.push(endpoint)
      }
    }

    // Find modified/unchanged endpoints
    for (const [key, oldEndpoint] of endpoints1.entries()) {
      if (endpoints2.has(key)) {
        const newEndpoint = endpoints2.get(key)!
        const changes = compareEndpoints(oldEndpoint, newEndpoint)

        if (changes.length > 0) {
          modified.push({ key, old: oldEndpoint, new: newEndpoint, changes })
        } else {
          unchanged.push(newEndpoint)
        }
      }
    }

    return { added, removed, modified, unchanged }
  }, [parsedDocs])

  // Compute line diff for markdown (fallback)
  const diffLines = useMemo(() => {
    if (!content1 || !content2 || parsedDocs.isJson) return []

    const lines1 = content1.split('\n')
    const lines2 = content2.split('\n')

    // Simple diff algorithm (LCS-based)
    return computeDiff(lines1, lines2)
  }, [content1, content2, parsedDocs.isJson])

  // Stats
  const stats = useMemo(() => {
    if (apiDiff) {
      return {
        added: apiDiff.added.length,
        removed: apiDiff.removed.length,
        modified: apiDiff.modified.length,
        unchanged: apiDiff.unchanged.length,
      }
    }
    const added = diffLines.filter(l => l.type === 'added').length
    const removed = diffLines.filter(l => l.type === 'removed').length
    const unchanged = diffLines.filter(l => l.type === 'unchanged').length
    return { added, removed, modified: 0, unchanged }
  }, [apiDiff, diffLines])

  // Toggle expanded API
  const toggleApi = (path: string) => {
    setExpandedApis(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }



  const getMethodColor = (method: string): string => {
    switch (method.toUpperCase()) {
      case 'GET': return 'method-get'
      case 'POST': return 'method-post'
      case 'PUT': return 'method-put'
      case 'DELETE': return 'method-delete'
      case 'PATCH': return 'method-patch'
      default: return 'method-get'
    }
  }

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
            {stats.modified > 0 && <span className="stat modified">~{stats.modified} modified</span>}
            <span className="stat unchanged">{stats.unchanged} unchanged</span>
          </div>
        </div>

        {/* API Diff View (for JSON docs) */}
        {apiDiff && (
          <div className="api-diff-container">
            {/* Added Endpoints */}
            {apiDiff.added.length > 0 && (
              <div className="api-diff-section">
                <h3 className="section-title added">Added Endpoints ({apiDiff.added.length})</h3>
                <div className="api-diff-cards">
                  {apiDiff.added.map((endpoint) => {
                    const method = endpoint.method
                    const path = endpoint.path
                    return (
                      <div key={endpoint.key} className="api-diff-card added">
                        <div className="api-diff-card-header">
                          <span className={`api-method ${getMethodColor(method)}`}>{method}</span>
                          <code className="api-path">{path}</code>
                        </div>
                        <p className="api-summary">{endpoint.summary}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Removed Endpoints */}
            {apiDiff.removed.length > 0 && (
              <div className="api-diff-section">
                <h3 className="section-title removed">Removed Endpoints ({apiDiff.removed.length})</h3>
                <div className="api-diff-cards">
                  {apiDiff.removed.map((endpoint) => {
                    const method = endpoint.method
                    const path = endpoint.path
                    return (
                      <div key={endpoint.key} className="api-diff-card removed">
                        <div className="api-diff-card-header">
                          <span className={`api-method ${getMethodColor(method)}`}>{method}</span>
                          <code className="api-path">{path}</code>
                        </div>
                        <p className="api-summary">{endpoint.summary}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Modified Endpoints */}
            {apiDiff.modified.length > 0 && (
              <div className="api-diff-section">
                <h3 className="section-title modified">Modified Endpoints ({apiDiff.modified.length})</h3>
                <div className="api-diff-cards">
                  {apiDiff.modified.map(({ key, old, new: newEndpoint, changes }) => {
                    const method = newEndpoint.method
                    const path = newEndpoint.path
                    const isExpanded = expandedApis.has(key)
                    return (
                      <div key={key} className="api-diff-card modified">
                        <div
                          className="api-diff-card-header clickable"
                          onClick={() => toggleApi(key)}
                        >
                          <div className="api-diff-card-title">
                            <span className={`api-method ${getMethodColor(method)}`}>{method}</span>
                            <code className="api-path">{path}</code>
                          </div>
                          <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                        </div>
                        <div className="api-changes-summary">
                          {changes.map((change, i) => (
                            <span key={i} className="change-badge">{change}</span>
                          ))}
                        </div>
                        {isExpanded && (
                          <div className="api-diff-details">
                            <div className="diff-comparison">
                              <div className="diff-old">
                                <h5>Before</h5>
                                <p className="api-summary">{old.summary}</p>
                                {old.parameters && (
                                  <div className="api-params-list">
                                    <strong>Params:</strong>
                                    <pre>{old.parameters}</pre>
                                  </div>
                                )}
                                {old.responses && (
                                  <div className="api-params-list">
                                    <strong>Responses:</strong>
                                    <pre>{old.responses}</pre>
                                  </div>
                                )}
                              </div>
                              <div className="diff-new">
                                <h5>After</h5>
                                <p className="api-summary">{newEndpoint.summary}</p>
                                {newEndpoint.parameters && (
                                  <div className="api-params-list">
                                    <strong>Params:</strong>
                                    <pre>{newEndpoint.parameters}</pre>
                                  </div>
                                )}
                                {newEndpoint.responses && (
                                  <div className="api-params-list">
                                    <strong>Responses:</strong>
                                    <pre>{newEndpoint.responses}</pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Unchanged Endpoints */}
            {apiDiff.unchanged.length > 0 && (
              <div className="api-diff-section">
                <h3 className="section-title unchanged">Unchanged Endpoints ({apiDiff.unchanged.length})</h3>
                <div className="api-diff-cards collapsed">
                  {apiDiff.unchanged.map((endpoint) => {
                    const method = endpoint.method
                    const path = endpoint.path
                    return (
                      <div key={endpoint.key} className="api-diff-card unchanged">
                        <div className="api-diff-card-header">
                          <span className={`api-method ${getMethodColor(method)}`}>{method}</span>
                          <code className="api-path">{path}</code>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Line Diff View (for markdown) */}
        {!apiDiff && (
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
        )}

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
 * Compare two API endpoints and return list of changes
 */
function compareEndpoints(old: ApiEndpoint, newEndpoint: ApiEndpoint): string[] {
  const changes: string[] = []

  // Check summary change
  if (old.summary !== newEndpoint.summary) {
    changes.push('Summary changed')
  }

  // Check params changes (string comparison)
  if ((old.parameters || '') !== (newEndpoint.parameters || '')) {
    changes.push('Parameters modified')
  }

  // Check responses changes (string comparison)
  if ((old.responses || '') !== (newEndpoint.responses || '')) {
    changes.push('Responses modified')
  }

  return changes
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
