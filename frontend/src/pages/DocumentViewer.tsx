import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { documentsApi, DocumentMetadata } from '../services/api'
import Navbar from '../components/Navbar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

type Tab = 'summary' | 'readme' | 'apis' | 'settings'

// API Endpoint structure from the docs JSON
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

const DocumentViewer = () => {
  const { id, commit } = useParams<{ id: string; commit: string }>()
  const navigate = useNavigate()

  // State
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const [summaryContent, setSummaryContent] = useState<string | null>(null)
  const [readmeContent, setReadmeContent] = useState<string | null>(null)
  const [apiContent, setApiContent] = useState<string | null>(null)
  const [apiDocs, setApiDocs] = useState<ApiDocs | null>(null)
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search state (for APIs tab)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedApis, setExpandedApis] = useState<Set<string>>(new Set())

  // Settings state
  const [editableTags, setEditableTags] = useState<string[]>([])
  const [editableVersion, setEditableVersion] = useState('')
  const [newTag, setNewTag] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Load document data
  useEffect(() => {
    const loadDocument = async () => {
      if (!id || !commit) return

      setIsLoading(true)
      setError(null)
      try {
        // Load summary, readme, API content, and metadata in parallel
        const [summaryRes, readmeRes, apiRes, metadataRes] = await Promise.allSettled([
          documentsApi.getSummary(id, commit),
          documentsApi.getReadme(id, commit),
          documentsApi.get(id, commit),
          documentsApi.getMetadata(id, commit),
        ])

        // Handle summary
        if (summaryRes.status === 'fulfilled') {
          setSummaryContent(summaryRes.value.data.content)
        }

        // Handle readme
        if (readmeRes.status === 'fulfilled') {
          setReadmeContent(readmeRes.value.data.content)
        }

        // Handle API content
        if (apiRes.status === 'fulfilled') {
          setApiContent(apiRes.value.data.content)
          setProjectName(apiRes.value.data.projectName)
          
          // Try to parse API content as JSON
          try {
            const parsed = JSON.parse(apiRes.value.data.content)
            setApiDocs(parsed)
          } catch {
            // If not valid JSON, keep as markdown
            setApiDocs(null)
          }
        }

        // Handle metadata
        if (metadataRes.status === 'fulfilled') {
          setMetadata(metadataRes.value.data)
          setEditableTags(metadataRes.value.data.tags)
          setEditableVersion(metadataRes.value.data.version)
        }
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load document')
      } finally {
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [id, commit])

  // Filter APIs based on search query
  const filteredApis = useMemo(() => {
    if (!apiDocs) return null
    if (!searchQuery.trim()) return Object.entries(apiDocs)
    
    const query = searchQuery.trim().toLowerCase()
    return Object.entries(apiDocs).filter(([path, endpoint]) => {
      // Search in path
      if (path.toLowerCase().includes(query)) return true
      // Search in summary
      if (endpoint.summary?.toLowerCase().includes(query)) return true
      // Search in params
      if (endpoint.params?.some(p => 
        p.name?.toLowerCase().includes(query) || 
        p.description?.toLowerCase().includes(query)
      )) return true
      return false
    })
  }, [apiDocs, searchQuery])

  // Toggle API expansion
  const toggleApi = useCallback((path: string) => {
    setExpandedApis(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  // Expand all / Collapse all
  const expandAll = useCallback(() => {
    if (filteredApis) {
      setExpandedApis(new Set(filteredApis.map(([path]) => path)))
    }
  }, [filteredApis])

  const collapseAll = useCallback(() => {
    setExpandedApis(new Set())
  }, [])

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === 'apis' && e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        document.getElementById('doc-search-input')?.focus()
      }
      if (e.key === 'Escape') {
        clearSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTab])

  // Get HTTP method from path (if included) or default
  const getMethodFromPath = (path: string): string => {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    for (const method of methods) {
      if (path.toUpperCase().startsWith(method + ' ')) {
        return method
      }
    }
    return 'GET'
  }

  // Get method color class
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

  // Render API card
  const renderApiCard = (path: string, endpoint: ApiEndpoint) => {
    const isExpanded = expandedApis.has(path)
    const method = getMethodFromPath(path)
    let cleanPath = path.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/i, '')
    // Ensure API path starts with /
    if (cleanPath && !cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath
    }

    return (
      <div key={path} className="api-card">
        <div 
          className="api-card-header"
          onClick={() => toggleApi(path)}
        >
          <div className="api-card-title">
            <span className={`api-method ${getMethodColor(method)}`}>
              {method}
            </span>
            <code className="api-path">{cleanPath}</code>
          </div>
          <div className="api-card-summary">
            {endpoint.summary}
          </div>
          <span className="api-expand-icon">{isExpanded ? '▼' : '▶'}</span>
        </div>
        
        {isExpanded && (
          <div className="api-card-body">
            {/* Parameters */}
            {endpoint.params && endpoint.params.length > 0 && (
              <div className="api-section">
                <h4>Parameters</h4>
                <div className="api-params">
                  {endpoint.params.map((param, idx) => (
                    <div key={idx} className="api-param">
                      <div className="param-header">
                        <code className="param-name">{param.name}</code>
                        {param.type && <span className="param-type">{param.type}</span>}
                        {param.required && <span className="param-required">required</span>}
                      </div>
                      {param.description && (
                        <p className="param-description">{param.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Responses */}
            {endpoint.responses && Object.keys(endpoint.responses).length > 0 && (
              <div className="api-section">
                <h4>Responses</h4>
                <div className="api-responses">
                  {Object.entries(endpoint.responses).map(([code, response]) => (
                    <div key={code} className="api-response">
                      <span className={`response-code ${code.startsWith('2') ? 'success' : code.startsWith('4') || code.startsWith('5') ? 'error' : 'info'}`}>
                        {code}
                      </span>
                      <span className="response-description">
                        {response.description || 'No description'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // Render markdown content with search highlighting (fallback for non-JSON)
  const renderHighlightedContent = () => {
    if (!apiContent) return null
    
    if (!searchQuery.trim()) {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {apiContent}
        </ReactMarkdown>
      )
    }

    const parts: JSX.Element[] = []
    const query = searchQuery.trim()
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi')
    const splitContent = apiContent.split(regex)
    
    splitContent.forEach((part, i) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        parts.push(
          <mark key={i} className="search-highlight current">
            {part}
          </mark>
        )
      } else {
        parts.push(<span key={i}>{part}</span>)
      }
    })

    return <div className="highlighted-content">{parts}</div>
  }

  // Handle tag addition
  const handleAddTag = () => {
    if (newTag.trim() && !editableTags.includes(newTag.trim())) {
      setEditableTags([...editableTags, newTag.trim()])
      setNewTag('')
    }
  }

  // Handle tag removal
  const handleRemoveTag = (tagToRemove: string) => {
    setEditableTags(editableTags.filter(tag => tag !== tagToRemove))
  }

  // Save settings
  const handleSaveSettings = async () => {
    if (!id || !commit) return

    setIsSaving(true)
    try {
      await documentsApi.updateTags(id, commit, editableTags, editableVersion)
      
      // Update local metadata
      if (metadata) {
        setMetadata({
          ...metadata,
          tags: editableTags,
          version: editableVersion,
          updatedAt: new Date().toISOString(),
        })
      }
      
      alert('Settings saved successfully!')
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <Navbar />
        <main className="main-content">
          <div className="loading">Loading document...</div>
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
      <main className="main-content">
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
            <span>Documents</span>
            <span>/</span>
            <span>{commit?.substring(0, 7)}</span>
          </div>
        </div>

        {/* Document Header */}
        <div className="document-header">
          <div className="document-title">
            <h1>{metadata?.title || `Commit ${commit?.substring(0, 7)}`}</h1>
            {metadata?.description && (
              <p className="document-description">{metadata.description}</p>
            )}
          </div>
          
          {/* Metadata */}
          {metadata && (
            <div className="document-metadata">
              <div className="metadata-item">
                <span className="label">Version:</span>
                <span>{metadata.version}</span>
              </div>
              <div className="metadata-item">
                <span className="label">Branch:</span>
                {metadata.branch && metadata.branchUrl ? (
                  <a href={metadata.branchUrl} target="_blank" rel="noopener noreferrer">
                    {metadata.branch}
                  </a>
                ) : (
                  <span>{metadata.branch || 'N/A'}</span>
                )}
              </div>
              <div className="metadata-item">
                <span className="label">Commit:</span>
                {metadata.commit && metadata.commitUrl ? (
                  <a href={metadata.commitUrl} target="_blank" rel="noopener noreferrer">
                    {metadata.commit.substring(0, 7)}
                  </a>
                ) : (
                  <span>{metadata.commit ? metadata.commit.substring(0, 7) : 'N/A'}</span>
                )}
              </div>
              <div className="metadata-item">
                <span className="label">Created:</span>
                <span>{new Date(metadata.createdAt).toLocaleString()}</span>
              </div>
              {metadata.tags.length > 0 && (
                <div className="metadata-item">
                  <span className="label">Tags:</span>
                  <div className="tags-list">
                    {metadata.tags.map(tag => (
                      <span key={tag} className="tag-badge">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            Summary
          </button>
          <button
            className={`tab ${activeTab === 'readme' ? 'active' : ''}`}
            onClick={() => setActiveTab('readme')}
          >
            README
          </button>
          <button
            className={`tab ${activeTab === 'apis' ? 'active' : ''}`}
            onClick={() => setActiveTab('apis')}
          >
            APIs
          </button>
          <button
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'summary' && (
          <div className="tab-content">
            <div className="document-content markdown-content">
              {summaryContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {summaryContent}
                </ReactMarkdown>
              ) : (
                <p>No summary available for this commit.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'readme' && (
          <div className="tab-content">
            <div className="document-content markdown-content">
              {readmeContent ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                  {readmeContent}
                </ReactMarkdown>
              ) : (
                <p>No README available for this commit.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'apis' && (
          <div className="tab-content">
            {/* Search Bar */}
            <div className="document-search-bar">
              <div className="search-input-wrapper">
                <input
                  id="doc-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search APIs by path, name, or description (Ctrl+F)..."
                  className="search-input"
                />
                {searchQuery && (
                  <>
                    <span className="match-count">
                      {filteredApis 
                        ? `${filteredApis.length} result${filteredApis.length !== 1 ? 's' : ''}` 
                        : 'No matches'}
                    </span>
                    <button className="btn-icon" onClick={clearSearch} title="Clear (Esc)">
                      ×
                    </button>
                  </>
                )}
              </div>
              {apiDocs && (
                <div className="search-actions">
                  <button className="btn btn-sm btn-secondary" onClick={expandAll}>
                    Expand All
                  </button>
                  <button className="btn btn-sm btn-secondary" onClick={collapseAll}>
                    Collapse All
                  </button>
                </div>
              )}
            </div>

            {/* API Content */}
            <div className="document-content">
              {apiDocs && filteredApis ? (
                <div className="api-cards">
                  {filteredApis.length > 0 ? (
                    filteredApis.map(([path, endpoint]) => renderApiCard(path, endpoint))
                  ) : (
                    <p className="no-results">No APIs found matching "{searchQuery}"</p>
                  )}
                </div>
              ) : apiContent ? (
                <div className="markdown-content">
                  {renderHighlightedContent()}
                </div>
              ) : (
                <p>No API documentation available for this commit.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="tab-content">
            <div className="settings-form">
              <h2>Document Settings</h2>
              
              {/* Version Field */}
              <div className="form-group">
                <label htmlFor="version">Version Number</label>
                <input
                  id="version"
                  type="text"
                  value={editableVersion}
                  onChange={(e) => setEditableVersion(e.target.value)}
                  placeholder="e.g., 1.0.0, v2.1.0"
                  className="input"
                />
                <small className="form-hint">
                  Assign a semantic version to this commit (e.g., for releases/milestones)
                </small>
              </div>

              {/* Tags Field */}
              <div className="form-group">
                <label htmlFor="tags">Tags</label>
                <div className="tags-editor">
                  <div className="tags-list">
                    {editableTags.map(tag => (
                      <span key={tag} className="tag-badge editable">
                        {tag}
                        <button
                          type="button"
                          className="tag-remove"
                          onClick={() => handleRemoveTag(tag)}
                          title="Remove tag"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="tag-input-wrapper">
                    <input
                      id="new-tag"
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddTag()
                        }
                      }}
                      placeholder="Add a tag..."
                      className="input"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleAddTag}
                    >
                      Add Tag
                    </button>
                  </div>
                </div>
                <small className="form-hint">
                  Add tags like "release", "stable", "beta", "milestone", etc.
                </small>
              </div>

              {/* Metadata Display */}
              <div className="form-group">
                <label>Commit Information (Read-only)</label>
                <div className="metadata-display">
                  <div className="metadata-row">
                    <span className="label">Commit Hash:</span>
                    <code>{metadata?.commit}</code>
                  </div>
                  <div className="metadata-row">
                    <span className="label">Branch:</span>
                    <span>{metadata?.branch}</span>
                  </div>
                  <div className="metadata-row">
                    <span className="label">Created:</span>
                    <span>{metadata?.createdAt ? new Date(metadata.createdAt).toLocaleString() : 'N/A'}</span>
                  </div>
                  <div className="metadata-row">
                    <span className="label">Last Updated:</span>
                    <span>{metadata?.updatedAt ? new Date(metadata.updatedAt).toLocaleString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="form-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="document-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => navigate(`/projects/${id}`)}
          >
            Back to Project
          </button>
        </div>
      </main>
    </div>
  )
}

// Escape regex special characters
const escapeRegex = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default DocumentViewer
