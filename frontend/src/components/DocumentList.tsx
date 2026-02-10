import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  documentsApi,
  DocumentVersion,
  FiltersResponse,
  SearchResult,
} from '../services/api'

interface DocumentListProps {
  projectId: string
  canManage: boolean
}

const DocumentList = ({ projectId, canManage }: DocumentListProps) => {
  const navigate = useNavigate()
  
  // State
  const [documents, setDocuments] = useState<DocumentVersion[]>([])
  const [filters, setFilters] = useState<FiltersResponse>({ commits: [], branches: [], tags: [] })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filter state
  const [selectedBranch, setSelectedBranch] = useState<string>('')
  const [selectedCommit, setSelectedCommit] = useState<string>('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  
  // Compare state
  const [compareMode, setCompareMode] = useState(false)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([])

  // Test upload modal state
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    commitHash: '',
    title: '',
    summary: '',
    branch: 'test',
    description: '',
    tags: '',
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Delete confirmation state
  const [deleteCommit, setDeleteCommit] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load documents and filters
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const [docsResponse, filtersResponse] = await Promise.all([
          documentsApi.list(projectId),
          documentsApi.getFilters(projectId),
        ])
        setDocuments(docsResponse.data.documents)
        setFilters(filtersResponse.data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load documents')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [projectId])

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      if (!doc.metadata) return true // Show docs without metadata
      
      if (selectedBranch && doc.metadata.branch !== selectedBranch) return false
      if (selectedCommit && doc.commit !== selectedCommit) return false
      if (selectedTags.length > 0) {
        const hasMatchingTag = selectedTags.some(tag => doc.metadata?.tags.includes(tag))
        if (!hasMatchingTag) return false
      }
      
      return true
    })
  }, [documents, selectedBranch, selectedCommit, selectedTags])

  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    
    setIsSearching(true)
    try {
      const response = await documentsApi.search(projectId, searchQuery, {
        branch: selectedBranch || undefined,
        commit: selectedCommit || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      })
      setSearchResults(response.data.results)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults(null)
  }

  // Handle compare selection
  const toggleCompareSelection = (version: string) => {
    if (selectedForCompare.includes(version)) {
      setSelectedForCompare(selectedForCompare.filter(v => v !== version))
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, version])
    }
  }

  // Start comparison
  const startComparison = () => {
    if (selectedForCompare.length === 2) {
      navigate(`/projects/${projectId}/compare?v1=${encodeURIComponent(selectedForCompare[0])}&v2=${encodeURIComponent(selectedForCompare[1])}`)
    }
  }

  // Clear filters
  const clearFilters = () => {
    setSelectedBranch('')
    setSelectedCommit('')
    setSelectedTags([])
  }

  // Handle upload form change
  const handleUploadFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setUploadForm(prev => ({ ...prev, [name]: value }))
  }

  // Handle test upload
  const handleTestUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploadError(null)
    
    if (!uploadForm.commitHash.trim() || !uploadForm.title.trim()) {
      setUploadError('Commit hash and title are required')
      return
    }

    setIsUploading(true)
    try {
      await documentsApi.testUpload(projectId, {
        commitHash: uploadForm.commitHash,
        title: uploadForm.title,
        summary: uploadForm.summary || undefined,
        branch: uploadForm.branch || 'test',
        description: uploadForm.description || undefined,
        tags: uploadForm.tags ? uploadForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      })
      
      // Reload documents
      const [docsResponse, filtersResponse] = await Promise.all([
        documentsApi.list(projectId),
        documentsApi.getFilters(projectId),
      ])
      setDocuments(docsResponse.data.documents)
      setFilters(filtersResponse.data)
      
      // Reset form and close modal
      setShowUploadModal(false)
      setUploadForm({ commitHash: '', title: '', summary: '', branch: 'test', description: '', tags: '' })
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || 'Failed to upload document')
    } finally {
      setIsUploading(false)
    }
  }

  // Handle delete
  const handleDelete = async (commit: string) => {
    setIsDeleting(true)
    try {
      await documentsApi.delete(projectId, commit)
      
      // Reload documents
      const [docsResponse, filtersResponse] = await Promise.all([
        documentsApi.list(projectId),
        documentsApi.getFilters(projectId),
      ])
      setDocuments(docsResponse.data.documents)
      setFilters(filtersResponse.data)
      
      setDeleteCommit(null)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete document')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return <div className="loading">Loading documents...</div>
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>
  }

  return (
    <div className="documents-container">
      {/* Toolbar */}
      <div className="documents-toolbar">
        {/* Filters */}
        <div className="documents-filters">
          <div className="filter-group">
            <label>Branch:</label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
            >
              <option value="">All branches</option>
              {filters.branches.map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Commit:</label>
            <select
              value={selectedCommit}
              onChange={(e) => setSelectedCommit(e.target.value)}
            >
              <option value="">All commits</option>
              {filters.commits.map(commit => (
                <option key={commit} value={commit}>{commit.substring(0, 7)}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Tags:</label>
            <select
              multiple
              value={selectedTags}
              onChange={(e) => setSelectedTags(
                Array.from(e.target.selectedOptions, option => option.value)
              )}
              className="tags-select"
            >
              {filters.tags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          
          {(selectedBranch || selectedCommit || selectedTags.length > 0) && (
            <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
              Clear Filters
            </button>
          )}
        </div>
        
        {/* Search */}
        <div className="documents-search">
          <div className="search-input-group">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search functions, APIs, or keywords..."
              className="search-input"
            />
            <button 
              className="btn btn-primary btn-sm" 
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
            {searchResults !== null && (
              <button className="btn btn-secondary btn-sm" onClick={clearSearch}>
                Clear
              </button>
            )}
          </div>
        </div>
        
        {/* Compare toggle */}
        <div className="documents-compare">
          <button
            className={`btn btn-sm ${compareMode ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setCompareMode(!compareMode)
              setSelectedForCompare([])
            }}
          >
            {compareMode ? 'Cancel Compare' : 'Compare Versions'}
          </button>
          
          {compareMode && selectedForCompare.length === 2 && (
            <button className="btn btn-primary btn-sm" onClick={startComparison}>
              Compare Selected
            </button>
          )}
          
          {compareMode && (
            <span className="compare-hint">
              Select 2 versions to compare ({selectedForCompare.length}/2)
            </span>
          )}
        </div>

        {/* Test Upload Button */}
        {canManage && (
          <div className="documents-actions">
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowUploadModal(true)}
            >
              + Test Upload
            </button>
          </div>
        )}
      </div>
      
      {/* Search Results */}
      {searchResults !== null && (
        <div className="search-results">
          <h3>Search Results for "{searchQuery}"</h3>
          {searchResults.length === 0 ? (
            <p className="no-results">No results found</p>
          ) : (
            <div className="search-results-list">
              {searchResults.map((result, index) => (
                <div key={index} className="search-result-item">
                  <div className="search-result-header">
                    <span className="version-badge">{result.commit.substring(0, 7)}</span>
                    <span className="branch-badge">{result.metadata.branch}</span>
                    <button
                      className="btn btn-link"
                      onClick={() => navigate(`/projects/${projectId}/docs/${encodeURIComponent(result.commit)}`)}
                    >
                      View Document
                    </button>
                  </div>
                  <div className="search-matches">
                    <pre className="match-preview">
                      {highlightMatch(result.snippet, searchQuery)}
                    </pre>
                    {result.matchCount > 1 && (
                      <span className="more-matches">
                        +{result.matchCount - 1} more matches in document
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Documents List */}
      {searchResults === null && (
        <div className="documents-list">
          {filteredDocuments.length === 0 ? (
            <div className="empty-state">
              <p>No documents found</p>
              {(selectedBranch || selectedCommit || selectedTags.length > 0) && (
                <p>Try adjusting your filters</p>
              )}
            </div>
          ) : (
            <table className="documents-table">
              <thead>
                <tr>
                  {compareMode && <th>Compare</th>}
                  <th>Version</th>
                  <th>Branch</th>
                  <th>Commit</th>
                  <th>Tags</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((doc) => (
                  <tr key={doc.commit}>
                    {compareMode && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedForCompare.includes(doc.commit)}
                          onChange={() => toggleCompareSelection(doc.commit)}
                          disabled={
                            !selectedForCompare.includes(doc.commit) && 
                            selectedForCompare.length >= 2
                          }
                        />
                      </td>
                    )}
                    <td>
                      <span className="version-badge">{doc.commit.substring(0, 7)}</span>
                    </td>
                    <td>
                      {doc.metadata?.branch ? (
                        <a 
                          href={doc.metadata.branchUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="branch-link"
                        >
                          {doc.metadata.branch}
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      {doc.metadata?.commit ? (
                        <a 
                          href={doc.metadata.commitUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="commit-link"
                        >
                          {doc.metadata.commit.substring(0, 7)}
                        </a>
                      ) : '-'}
                    </td>
                    <td>
                      <div className="tags-list">
                        {doc.metadata?.tags.map(tag => (
                          <span key={tag} className="tag-badge">{tag}</span>
                        ))}
                      </div>
                    </td>
                    <td>
                      {doc.metadata?.createdAt 
                        ? new Date(doc.metadata.createdAt).toLocaleDateString()
                        : '-'}
                    </td>
                    <td>
                      <div className="actions-group">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/projects/${projectId}/docs/${encodeURIComponent(doc.commit)}`)}
                        >
                          View
                        </button>
                        {canManage && (
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => setDeleteCommit(doc.commit)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Test Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Upload Test Document</h2>
              <button className="btn-close" onClick={() => setShowUploadModal(false)}>×</button>
            </div>
            <form onSubmit={handleTestUpload}>
              <div className="form-group">
                <label htmlFor="commitHash">Commit Hash *</label>
                <input
                  type="text"
                  id="commitHash"
                  name="commitHash"
                  value={uploadForm.commitHash}
                  onChange={handleUploadFormChange}
                  placeholder="e.g., abc123def456 or test-doc-1"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label htmlFor="title">Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={uploadForm.title}
                  onChange={handleUploadFormChange}
                  placeholder="Document Title"
                />
              </div>
              <div className="form-group">
                <label htmlFor="branch">Branch</label>
                <input
                  type="text"
                  id="branch"
                  name="branch"
                  value={uploadForm.branch}
                  onChange={handleUploadFormChange}
                  placeholder="test"
                />
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <input
                  type="text"
                  id="description"
                  name="description"
                  value={uploadForm.description}
                  onChange={handleUploadFormChange}
                  placeholder="Brief description of the document"
                />
              </div>
              <div className="form-group">
                <label htmlFor="tags">Tags (comma-separated)</label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={uploadForm.tags}
                  onChange={handleUploadFormChange}
                  placeholder="e.g., test, api, draft"
                />
              </div>
              <div className="form-group">
                <label htmlFor="summary">Summary (Markdown)</label>
                <textarea
                  id="summary"
                  name="summary"
                  value={uploadForm.summary}
                  onChange={handleUploadFormChange}
                  placeholder="# Summary&#10;&#10;Brief overview of changes...&#10;&#10;Optional - will be shown in the Summary tab"
                  rows={10}
                  className="code-textarea"
                />
              </div>
              {uploadError && <div className="alert alert-error">{uploadError}</div>}
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowUploadModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isUploading}>
                  {isUploading ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCommit && (
        <div className="modal-overlay" onClick={() => setDeleteCommit(null)}>
          <div className="modal modal-danger" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Document</h2>
              <button className="btn-close" onClick={() => setDeleteCommit(null)}>×</button>
            </div>
            <p>
              Are you sure you want to delete commit <strong>{deleteCommit.substring(0, 7)}</strong>?
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setDeleteCommit(null)}>
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={() => handleDelete(deleteCommit)}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Helper function to highlight search matches
const highlightMatch = (text: string, query: string): JSX.Element => {
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i}>{part}</mark>
        ) : (
          part
        )
      )}
    </>
  )
}

// Escape regex special characters
const escapeRegex = (string: string): string => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default DocumentList
