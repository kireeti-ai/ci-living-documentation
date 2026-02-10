import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { documentsApi, DocumentMetadata } from '../services/api'
import Navbar from '../components/Navbar'

const EditDocumentTags = () => {
  const { id, version } = useParams<{ id: string; version: string }>()
  const navigate = useNavigate()

  // State
  const [metadata, setMetadata] = useState<DocumentMetadata | null>(null)
  const [projectName, setProjectName] = useState<string>('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load document metadata
  useEffect(() => {
    const loadMetadata = async () => {
      if (!id || !version) return

      setIsLoading(true)
      setError(null)
      try {
        const response = await documentsApi.get(id, version)
        setMetadata(response.data.metadata)
        setProjectName(response.data.projectName)
        setTags(response.data.metadata?.tags || [])
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load metadata')
      } finally {
        setIsLoading(false)
      }
    }

    loadMetadata()
  }, [id, version])

  // Add tag
  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase()
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag])
      setNewTag('')
    }
  }

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove))
  }

  // Save tags
  const handleSave = async () => {
    if (!id || !version) return

    setIsSaving(true)
    setError(null)
    setSuccess(null)
    try {
      await documentsApi.updateTags(id, version, tags)
      setSuccess('Tags updated successfully!')
      setTimeout(() => {
        navigate(`/projects/${id}/docs/${encodeURIComponent(version)}`)
      }, 1500)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update tags')
    } finally {
      setIsSaving(false)
    }
  }

  // Handle key press in tag input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  if (isLoading) {
    return (
      <div className="page-container">
        <Navbar />
        <main className="main-content">
          <div className="loading">Loading...</div>
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
            <button className="btn-link" onClick={() => navigate(`/projects/${id}/docs/${encodeURIComponent(version || '')}`)}>
              {version}
            </button>
            <span>/</span>
            <span>Edit Tags</span>
          </div>
        </div>

        <div className="edit-tags-container">
          <h1>Edit Document Tags</h1>

          {metadata && (
            <div className="document-summary">
              <p><strong>Version:</strong> {version}</p>
              <p><strong>Branch:</strong> {metadata.branch}</p>
              <p><strong>Created:</strong> {new Date(metadata.createdAt).toLocaleString()}</p>
            </div>
          )}

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          {/* Current Tags */}
          <div className="tags-section">
            <h3>Current Tags</h3>
            <div className="tags-list editable">
              {tags.length === 0 ? (
                <p className="no-tags">No tags yet</p>
              ) : (
                tags.map(tag => (
                  <span key={tag} className="tag-badge editable">
                    {tag}
                    <button 
                      className="tag-remove" 
                      onClick={() => handleRemoveTag(tag)}
                      title="Remove tag"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Add New Tag */}
          <div className="add-tag-section">
            <h3>Add New Tag</h3>
            <div className="add-tag-form">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter tag name..."
                className="tag-input"
              />
              <button 
                className="btn btn-secondary btn-sm" 
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                Add Tag
              </button>
            </div>
            <p className="hint">Press Enter to add a tag</p>
          </div>

          {/* Actions */}
          <div className="edit-tags-actions">
            <button 
              className="btn btn-secondary"
              onClick={() => navigate(`/projects/${id}/docs/${encodeURIComponent(version || '')}`)}
            >
              Cancel
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Tags'}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default EditDocumentTags
