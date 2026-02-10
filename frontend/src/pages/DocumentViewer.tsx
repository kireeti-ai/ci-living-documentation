import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { documentsApi, DocumentMetadata } from '../services/api'
import Navbar from '../components/Navbar'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Tab = 'summary' | 'apis' | 'settings'

const DocumentViewer = () => {
  const { id, commit } = useParams<{ id: string; commit: string }>()
  const navigate = useNavigate()

  // State
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const [summaryContent, setSummaryContent] = useState<string | null>(null)
  const [apiContent, setApiContent] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Search state (for APIs tab)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0)
  const [matches, setMatches] = useState<number[]>([])

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
        // Load summary, API content, and metadata in parallel
        const [summaryRes, apiRes, metadataRes] = await Promise.all([
          documentsApi.getSummary(id, commit),
          documentsApi.get(id, commit),
          documentsApi.getMetadata(id, commit),
        ])

        setSummaryContent(summaryRes.data.content)
        setApiContent(apiRes.data.content)
        setMetadata(metadataRes.data)
        setProjectName(apiRes.data.projectName)
        
        // Initialize settings
        setEditableTags(metadataRes.data.tags)
        setEditableVersion(metadataRes.data.version)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load document')
      } finally {
        setIsLoading(false)
      }
    }

    loadDocument()
  }, [id, commit])

  // Highlight search matches in API content
  const highlightedContent = useMemo(() => {
    if (!apiContent || !searchQuery.trim()) return apiContent

    const query = searchQuery.trim().toLowerCase()
    const contentLower = apiContent.toLowerCase()
    const matchIndices: number[] = []
    
    let pos = 0
    while (true) {
      const idx = contentLower.indexOf(query, pos)
      if (idx === -1) break
      matchIndices.push(idx)
      pos = idx + 1
    }
    
    setMatches(matchIndices)
    return apiContent
  }, [apiContent, searchQuery])

  // Navigate through matches
  const goToMatch = useCallback((direction: 'prev' | 'next') => {
    if (matches.length === 0) return

    let newIndex = currentMatchIndex
    if (direction === 'next') {
      newIndex = (currentMatchIndex + 1) % matches.length
    } else {
      newIndex = currentMatchIndex === 0 ? matches.length - 1 : currentMatchIndex - 1
    }
    setCurrentMatchIndex(newIndex)

    // Scroll to match
    const matchElement = document.querySelector(`[data-match-index="${newIndex}"]`)
    if (matchElement) {
      matchElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [currentMatchIndex, matches.length])

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setMatches([])
    setCurrentMatchIndex(0)
  }

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeTab === 'apis' && e.key === 'f' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        document.getElementById('doc-search-input')?.focus()
      }
      if (activeTab === 'apis' && searchQuery && e.key === 'Enter') {
        goToMatch(e.shiftKey ? 'prev' : 'next')
      }
      if (e.key === 'Escape') {
        clearSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [activeTab, searchQuery, goToMatch])

  // Render content with highlighted search matches
  const renderHighlightedContent = () => {
    if (!highlightedContent) return null
    
    if (!searchQuery.trim()) {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {highlightedContent}
        </ReactMarkdown>
      )
    }

    const parts: JSX.Element[] = []
    const query = searchQuery.trim()
    const regex = new RegExp(`(${escapeRegex(query)})`, 'gi')
    const splitContent = highlightedContent.split(regex)
    
    let matchCount = 0
    splitContent.forEach((part, i) => {
      if (part.toLowerCase() === query.toLowerCase()) {
        const isCurrentMatch = matchCount === currentMatchIndex
        parts.push(
          <mark 
            key={i} 
            data-match-index={matchCount}
            className={`search-highlight ${isCurrentMatch ? 'current' : ''}`}
          >
            {part}
          </mark>
        )
        matchCount++
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
                <a href={metadata.branchUrl} target="_blank" rel="noopener noreferrer">
                  {metadata.branch}
                </a>
              </div>
              <div className="metadata-item">
                <span className="label">Commit:</span>
                <a href={metadata.commitUrl} target="_blank" rel="noopener noreferrer">
                  {metadata.commit.substring(0, 7)}
                </a>
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
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summaryContent}
                </ReactMarkdown>
              ) : (
                <p>No summary available for this commit.</p>
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
                  placeholder="Search in API documentation (Ctrl+F)..."
                  className="search-input"
                />
                {searchQuery && (
                  <>
                    <span className="match-count">
                      {matches.length > 0 
                        ? `${currentMatchIndex + 1} of ${matches.length}` 
                        : 'No matches'}
                    </span>
                    <button 
                      className="btn-icon" 
                      onClick={() => goToMatch('prev')}
                      disabled={matches.length === 0}
                      title="Previous match (Shift+Enter)"
                    >
                      ↑
                    </button>
                    <button 
                      className="btn-icon" 
                      onClick={() => goToMatch('next')}
                      disabled={matches.length === 0}
                      title="Next match (Enter)"
                    >
                      ↓
                    </button>
                    <button className="btn-icon" onClick={clearSearch} title="Clear (Esc)">
                      ×
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* API Content */}
            <div className="document-content markdown-content">
              {apiContent ? (
                renderHighlightedContent()
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
