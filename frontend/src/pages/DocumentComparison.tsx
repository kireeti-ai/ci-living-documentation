import { useEffect, useState, useMemo } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { documentsApi, DocumentMetadata } from '../services/api'
import Navbar from '../components/Navbar'

interface DiffLine {
  type: 'unchanged' | 'added' | 'removed'
  content: string
  lineNumber: { left?: number; right?: number }
}

// API Endpoint structure
interface ApiEndpoint {
  summary: string
  params?: Array<{
    name: string
    type?: string
    required?: boolean
    description?: string
  }>
  responses?: Record<string, {
    description?: string
    schema?: any
  }>
}

type ApiDocs = Record<string, ApiEndpoint>

interface ApiDiff {
  added: Array<{ path: string; endpoint: ApiEndpoint }>
  removed: Array<{ path: string; endpoint: ApiEndpoint }>
  modified: Array<{ 
    path: string
    old: ApiEndpoint
    new: ApiEndpoint
    changes: string[]
  }>
  unchanged: Array<{ path: string; endpoint: ApiEndpoint }>
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
    
    return { docs1, docs2, isJson: docs1 !== null && docs2 !== null }
  }, [content1, content2])

  // Compute API diff for JSON docs
  const apiDiff = useMemo<ApiDiff | null>(() => {
    if (!parsedDocs.isJson || !parsedDocs.docs1 || !parsedDocs.docs2) return null
    
    const docs1 = parsedDocs.docs1
    const docs2 = parsedDocs.docs2
    const paths1 = new Set(Object.keys(docs1))
    const paths2 = new Set(Object.keys(docs2))
    
    const added: ApiDiff['added'] = []
    const removed: ApiDiff['removed'] = []
    const modified: ApiDiff['modified'] = []
    const unchanged: ApiDiff['unchanged'] = []
    
    // Find added endpoints (in docs2 but not in docs1)
    for (const path of paths2) {
      if (!paths1.has(path)) {
        added.push({ path, endpoint: docs2[path] })
      }
    }
    
    // Find removed endpoints (in docs1 but not in docs2)
    for (const path of paths1) {
      if (!paths2.has(path)) {
        removed.push({ path, endpoint: docs1[path] })
      }
    }
    
    // Find modified/unchanged endpoints
    for (const path of paths1) {
      if (paths2.has(path)) {
        const old = docs1[path]
        const newEndpoint = docs2[path]
        const changes = compareEndpoints(old, newEndpoint)
        
        if (changes.length > 0) {
          modified.push({ path, old, new: newEndpoint, changes })
        } else {
          unchanged.push({ path, endpoint: newEndpoint })
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

  // Get HTTP method from path
  const getMethodFromPath = (path: string): string => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    for (const method of methods) {
      if (path.toUpperCase().startsWith(method + ' ')) {
        return method
      }
    }
    return 'GET'
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
                  {apiDiff.added.map(({ path, endpoint }) => {
                    const method = getMethodFromPath(path)
                    const cleanPath = path.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, '')
                    return (
                      <div key={path} className="api-diff-card added">
                        <div className="api-diff-card-header">
                          <span className={`api-method ${getMethodColor(method)}`}>{method}</span>
                          <code className="api-path">{cleanPath}</code>
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
                  {apiDiff.removed.map(({ path, endpoint }) => {
                    const method = getMethodFromPath(path)
                    const cleanPath = path.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, '')
                    return (
                      <div key={path} className="api-diff-card removed">
                        <div className="api-diff-card-header">
                          <span className={`api-method ${getMethodColor(method)}`}>{method}</span>
                          <code className="api-path">{cleanPath}</code>
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
                  {apiDiff.modified.map(({ path, old, new: newEndpoint, changes }) => {
                    const method = getMethodFromPath(path)
                    const cleanPath = path.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, '')
                    const isExpanded = expandedApis.has(path)
                    return (
                      <div key={path} className="api-diff-card modified">
                        <div 
                          className="api-diff-card-header clickable"
                          onClick={() => toggleApi(path)}
                        >
                          <div className="api-diff-card-title">
                            <span className={`api-method ${getMethodColor(method)}`}>{method}</span>
                            <code className="api-path">{cleanPath}</code>
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
                                {old.params && old.params.length > 0 && (
                                  <div className="api-params-list">
                                    <strong>Params:</strong>
                                    {old.params.map((p, i) => (
                                      <span key={i} className="param-tag">{p.name}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="diff-new">
                                <h5>After</h5>
                                <p className="api-summary">{newEndpoint.summary}</p>
                                {newEndpoint.params && newEndpoint.params.length > 0 && (
                                  <div className="api-params-list">
                                    <strong>Params:</strong>
                                    {newEndpoint.params.map((p, i) => (
                                      <span key={i} className="param-tag">{p.name}</span>
                                    ))}
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
                  {apiDiff.unchanged.map(({ path }) => {
                    const method = getMethodFromPath(path)
                    const cleanPath = path.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, '')
                    return (
                      <div key={path} className="api-diff-card unchanged">
                        <div className="api-diff-card-header">
                          <span className={`api-method ${getMethodColor(method)}`}>{method}</span>
                          <code className="api-path">{cleanPath}</code>
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
  
  // Check params changes
  const oldParams = old.params || []
  const newParams = newEndpoint.params || []
  const oldParamNames = new Set(oldParams.map(p => p.name))
  const newParamNames = new Set(newParams.map(p => p.name))
  
  const addedParams = newParams.filter(p => !oldParamNames.has(p.name))
  const removedParams = oldParams.filter(p => !newParamNames.has(p.name))
  
  if (addedParams.length > 0) {
    changes.push(`+${addedParams.length} param${addedParams.length > 1 ? 's' : ''}`)
  }
  if (removedParams.length > 0) {
    changes.push(`-${removedParams.length} param${removedParams.length > 1 ? 's' : ''}`)
  }
  
  // Check for modified params (same name, different properties)
  for (const oldParam of oldParams) {
    const newParam = newParams.find(p => p.name === oldParam.name)
    if (newParam) {
      if (oldParam.type !== newParam.type || 
          oldParam.required !== newParam.required ||
          oldParam.description !== newParam.description) {
        changes.push(`Param '${oldParam.name}' modified`)
      }
    }
  }
  
  // Check responses changes
  const oldResponses = Object.keys(old.responses || {})
  const newResponses = Object.keys(newEndpoint.responses || {})
  
  if (oldResponses.length !== newResponses.length || 
      !oldResponses.every(r => newResponses.includes(r))) {
    changes.push('Responses changed')
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
