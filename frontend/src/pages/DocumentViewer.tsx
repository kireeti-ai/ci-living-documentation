import { useEffect, useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { documentsApi, DocumentMetadata, ArchitectureFile as ApiArchitectureFile } from '../services/api'
import Navbar from '../components/Navbar'
import AppThreeBackground from '../components/AppThreeBackground'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import mermaid from 'mermaid'

type Tab = 'summary' | 'readme' | 'architecture' | 'apis' | 'settings'

// API Endpoint structure from the docs JSON
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

interface ArtifactFile {
  folder: string
  name: string
  updatedLabel: string
}

interface ArchitecturePreviewFile extends ApiArchitectureFile {}

const MARKDOWN_EXTENSIONS = ['.md', '.markdown', '.mdx', '.txt', '.adoc', '.adr']
const MERMAID_EXTENSIONS = ['.mmd', '.mermaid']

const getLowerName = (name: string) => name.toLowerCase()
const isMarkdownFile = (name: string) => MARKDOWN_EXTENSIONS.some((ext) => getLowerName(name).endsWith(ext))
const isMermaidFile = (name: string) => MERMAID_EXTENSIONS.some((ext) => getLowerName(name).endsWith(ext))

mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  themeVariables: {
    darkMode: true,
    background: '#0b0f14',
    primaryColor: '#111827',
    primaryTextColor: '#e6edf3',
    primaryBorderColor: '#3b82f6',
    secondaryColor: '#1f2937',
    secondaryTextColor: '#e6edf3',
    tertiaryColor: '#0f172a',
    tertiaryTextColor: '#e6edf3',
    lineColor: '#94a3b8',
    textColor: '#e6edf3',
    nodeBorder: '#3b82f6',
    clusterBkg: '#111827',
    clusterBorder: '#334155',
    edgeLabelBackground: '#0f172a',
    fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
  },
})

const MermaidBlock = ({ code }: { code: string }) => {
  const [svg, setSvg] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    const render = async () => {
      try {
        const renderId = `md-mermaid-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        const { svg: renderedSvg } = await mermaid.render(renderId, code)
        if (!cancelled) {
          setSvg(renderedSvg)
          setError('')
        }
      } catch (err) {
        console.error('Markdown mermaid render failed:', err)
        if (!cancelled) {
          setSvg('')
          setError('Failed to render Mermaid block. Showing source.')
        }
      }
    }

    render()
    return () => {
      cancelled = true
    }
  }, [code])

  if (svg) {
    return <div className="architecture-diagram-preview markdown-mermaid-block" dangerouslySetInnerHTML={{ __html: svg }} />
  }

  return (
    <>
      {error && <p className="setting-note setting-note-warning">{error}</p>}
      <pre className="code-textarea architecture-code-preview">{code}</pre>
    </>
  )
}

const MarkdownRenderer = ({ content }: { content: string }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeRaw]}
    components={{
      code: ({ inline, className, children, ...props }: any) => {
        const rawCode = String(children ?? '').replace(/\n$/, '')
        const langMatch = /language-([\w-]+)/.exec(className || '')
        const language = (langMatch?.[1] || '').toLowerCase()
        const isMermaid = !inline && (language === 'mermaid' || language === 'mmd')

        if (isMermaid) {
          return <MermaidBlock code={rawCode} />
        }

        return (
          <code className={className} {...props}>
            {children}
          </code>
        )
      },
    }}
  >
    {content}
  </ReactMarkdown>
)

const DocumentViewer = () => {
  const { id, commit } = useParams<{ id: string; commit: string }>()
  const navigate = useNavigate()

  // State
  const [activeTab, setActiveTab] = useState<Tab>('summary')
  const [summaryContent, setSummaryContent] = useState<string | null>(null)
  const [readmeContent, setReadmeContent] = useState<string | null>(null)
  const [apiContent, setApiContent] = useState<string | null>(null)
  const [apiDocs, setApiDocs] = useState<ApiDocs | null>(null)
  const [architectureFiles, setArchitectureFiles] = useState<ArchitecturePreviewFile[]>([])
  const [activeArchitectureFile, setActiveArchitectureFile] = useState('')
  const [architectureSvg, setArchitectureSvg] = useState('')
  const [architectureRenderError, setArchitectureRenderError] = useState('')
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

  const formatRelativeTime = (isoString: string | null): string => {
    if (!isoString) return 'recently'
    const ts = new Date(isoString).getTime()
    if (Number.isNaN(ts)) return 'recently'
    const diffMs = Date.now() - ts
    const minutes = Math.floor(diffMs / 60000)
    if (minutes < 1) return 'moments ago'
    if (minutes < 60) return `${minutes} min ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours} hr ago`
    const days = Math.floor(hours / 24)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }

  const artifactFiles = useMemo<ArtifactFile[]>(() => {
    const defaultUpdatedLabel = formatRelativeTime(metadata?.updatedAt || null)

    const inferFromCurrentData = (): ArtifactFile[] => {
      const items: ArtifactFile[] = []
      if (readmeContent) {
        items.push({ folder: 'docs', name: 'README.generated.md', updatedLabel: defaultUpdatedLabel })
      }
      if (summaryContent) {
        items.push({ folder: 'summary', name: 'summary.md', updatedLabel: defaultUpdatedLabel })
      }
      if (apiContent) {
        items.push({ folder: 'api', name: 'api-description.json', updatedLabel: defaultUpdatedLabel })
      }

      for (const file of architectureFiles) {
        const normalized = file.name.replace(/^docs\//, '')
        const parts = normalized.split('/').filter(Boolean)
        if (parts.length === 0) continue
        const folder = parts.length > 1 ? parts[0] : 'docs'
        const name = parts.length > 1 ? parts.slice(1).join('/') : parts[0]
        items.push({
          folder,
          name,
          updatedLabel: formatRelativeTime(file.lastModified),
        })
      }

      return items
    }

    try {
      const raw = typeof apiContent === 'string' ? JSON.parse(apiContent) : apiContent
      const container = raw?.artifacts || raw?.generated_files || raw?.files || raw?.artifact_tree
      if (!Array.isArray(container)) {
        return inferFromCurrentData()
      }

      const normalized = container
        .filter((item: any) => item?.name && item?.folder)
        .map((item: any) => ({
          folder: String(item.folder),
          name: String(item.name),
          updatedLabel: String(item.updatedLabel || item.updated || 'recently'),
        }))

      return normalized.length > 0 ? normalized : inferFromCurrentData()
    } catch {
      return inferFromCurrentData()
    }
  }, [apiContent, architectureFiles, metadata?.updatedAt, readmeContent, summaryContent])

  const artifactGroups = useMemo(() => {
    return artifactFiles.reduce<Record<string, ArtifactFile[]>>((acc, file) => {
      if (!acc[file.folder]) acc[file.folder] = []
      acc[file.folder].push(file)
      return acc
    }, {})
  }, [artifactFiles])

  const selectedArchitecture = useMemo(() => {
    return architectureFiles.find((file) => file.name === activeArchitectureFile) || null
  }, [architectureFiles, activeArchitectureFile])

  useEffect(() => {
    const renderMermaid = async () => {
      if (!selectedArchitecture || !isMermaidFile(selectedArchitecture.name)) {
        setArchitectureSvg('')
        setArchitectureRenderError('')
        return
      }

      try {
        const renderId = `arch-${Date.now()}-${Math.floor(Math.random() * 10000)}`
        const { svg } = await mermaid.render(renderId, selectedArchitecture.content)
        setArchitectureSvg(svg)
        setArchitectureRenderError('')
      } catch (error) {
        console.error('Mermaid render failed:', error)
        setArchitectureSvg('')
        setArchitectureRenderError('Failed to render diagram, showing source instead.')
      }
    }

    renderMermaid()
  }, [selectedArchitecture])

  // Load document data
  useEffect(() => {
    const loadDocument = async () => {
      if (!id || !commit) return

      setIsLoading(true)
      setError(null)
      try {
        // Load summary, readme, API content, and metadata in parallel
        const [summaryRes, readmeRes, architectureRes, apiRes, metadataRes] = await Promise.allSettled([
          documentsApi.getSummary(id, commit),
          documentsApi.getReadme(id, commit),
          documentsApi.getArchitecture(id, commit),
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

        // Handle architecture files
        if (architectureRes.status === 'fulfilled') {
          const files = architectureRes.value.data.files || []
          setArchitectureFiles(files)
          setActiveArchitectureFile(files[0]?.name || '')
        }

        // Handle API content
        if (apiRes.status === 'fulfilled') {
          const content = apiRes.value.data.content
          setApiContent(typeof content === 'string' ? content : JSON.stringify(content, null, 2))
          setProjectName(apiRes.value.data.projectName)

          if (typeof content === 'object' && content !== null) {
            setApiDocs(content as unknown as ApiDocs)
          } else {
            // Try to parse API content as JSON
            try {
              const parsed = JSON.parse(content)
              setApiDocs(parsed)
            } catch {
              // If not valid JSON, keep as markdown
              setApiDocs(null)
            }
          }
        }

        // Handle metadata
        if (metadataRes.status === 'fulfilled') {
          setMetadata(metadataRes.value.data)
          // setEditableTags(metadataRes.value.data.tags)
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
    if (!apiDocs || !apiDocs.endpoints) return null
    if (!searchQuery.trim()) return apiDocs.endpoints

    const query = searchQuery.trim().toLowerCase()
    return apiDocs.endpoints.filter((endpoint) => {
      // Search in path/key
      if (endpoint.path?.toLowerCase().includes(query)) return true
      if (endpoint.key?.toLowerCase().includes(query)) return true
      // Search in summary
      if (endpoint.summary?.toLowerCase().includes(query)) return true
      // Search in method
      if (endpoint.method?.toLowerCase().includes(query)) return true
      // Search in parameters
      if (endpoint.parameters?.toLowerCase().includes(query)) return true
      // Search in responses
      if (endpoint.responses?.toLowerCase().includes(query)) return true
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
      setExpandedApis(new Set(filteredApis.map(e => e.key)))
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
  const renderApiCard = (endpoint: ApiEndpoint) => {
    const path = endpoint.path || endpoint.key.split(' ')[1] || ''
    const method = endpoint.method || endpoint.key.split(' ')[0] || 'GET'
    const isExpanded = expandedApis.has(endpoint.key)

    return (
      <div key={endpoint.key} className="api-card">
        <div
          className="api-card-header"
          onClick={() => toggleApi(endpoint.key)}
        >
          <div className="api-card-title">
            <span className={`api-method ${getMethodColor(method)}`}>
              {method}
            </span>
            <code className="api-path">{path}</code>
          </div>
          <div className="api-card-summary">
            {endpoint.summary}
          </div>
          <span className="api-expand-icon">{isExpanded ? 'v' : '>'}</span>
        </div>

        {isExpanded && (
          <div className="api-card-body">
            {/* Source File */}
            <div className="api-section">
              <span className="label">Source:</span> <code>{endpoint.source_file}</code>
            </div>

            {/* Parameters */}
            {endpoint.parameters && (
              <div className="api-section">
                <h4>Parameters</h4>
                <div className="api-params-text">
                  <p>{endpoint.parameters}</p>
                </div>
              </div>
            )}

            {/* Responses */}
            {endpoint.responses && (
              <div className="api-section">
                <h4>Responses</h4>
                <div className="api-responses-text">
                  <p>{endpoint.responses}</p>
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
        <MarkdownRenderer content={apiContent} />
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
    <div className="page-container document-viewer-shell">
      <AppThreeBackground variant="viewer" />
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
            <p className="document-kicker">Document Runtime</p>
            <h1>{metadata?.title || `Commit ${commit?.substring(0, 7)}`}</h1>
            {metadata?.description && (
              <p className="document-description">{metadata.description}</p>
            )}
            <div className="document-header-chips">
              <span className="document-header-chip">project::{projectName || 'unknown'}</span>
              <span className="document-header-chip">commit::{commit?.substring(0, 7)}</span>
            </div>
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
              {/* {metadata.tags.length > 0 && (
                <div className="metadata-item">
                  <span className="label">Tags:</span>
                  <div className="tags-list">
                    {metadata.tags.map(tag => (
                      <span key={tag} className="tag-badge">{tag}</span>
                    ))}
                  </div>
                </div>
              )} */}
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
            className={`tab ${activeTab === 'architecture' ? 'active' : ''}`}
            onClick={() => setActiveTab('architecture')}
          >
            Architecture
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
            <div className="artifact-tree-card">
              <h3>Generated Artifacts</h3>
              <div className="artifact-tree-grid">
                {Object.entries(artifactGroups).map(([folder, files]) => (
                  <div key={folder} className="artifact-folder">
                    <div className="artifact-folder-name">{folder}/</div>
                    <div className="artifact-file-list">
                      {files.map((file) => (
                        <div key={`${folder}-${file.name}`} className="artifact-file-item">
                          <span className="artifact-file-name">{file.name}</span>
                          <span className="artifact-file-time">{file.updatedLabel}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="document-content markdown-content">
              {summaryContent ? (
                <MarkdownRenderer content={summaryContent} />
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
                <MarkdownRenderer content={readmeContent} />
              ) : (
                <p>No README available for this commit.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'architecture' && (
          <div className="tab-content">
            {architectureFiles.length === 0 ? (
              <p>No architecture files found in bucket for this commit.</p>
            ) : (
              <div className="architecture-preview-layout">
                <aside className="architecture-file-list">
                  {architectureFiles.map((file) => (
                    <button
                      key={file.name}
                      className={`architecture-file-item ${activeArchitectureFile === file.name ? 'active' : ''}`}
                      onClick={() => setActiveArchitectureFile(file.name)}
                    >
                      <span className="architecture-file-name">{file.name}</span>
                      <span className="architecture-file-updated">{formatRelativeTime(file.lastModified)}</span>
                    </button>
                  ))}
                </aside>

                <section className="architecture-file-preview">
                  {selectedArchitecture ? (
                    <>
                      <div className="architecture-file-header">
                        <h3>{selectedArchitecture.name}</h3>
                        <span>{formatRelativeTime(selectedArchitecture.lastModified)}</span>
                      </div>
                      {isMarkdownFile(selectedArchitecture.name) ? (
                        <div className="markdown-content">
                          <MarkdownRenderer content={selectedArchitecture.content} />
                        </div>
                      ) : isMermaidFile(selectedArchitecture.name) && architectureSvg ? (
                        <div className="architecture-diagram-preview" dangerouslySetInnerHTML={{ __html: architectureSvg }} />
                      ) : (
                        <>
                          {architectureRenderError && <p className="setting-note setting-note-warning">{architectureRenderError}</p>}
                          <pre className="code-textarea architecture-code-preview">
                            {selectedArchitecture.content}
                          </pre>
                        </>
                      )}
                    </>
                  ) : (
                    <p>Select a file to preview.</p>
                  )}
                </section>
              </div>
            )}
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
                      x
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
                    filteredApis.map((endpoint) => renderApiCard(endpoint))
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
            <div className="doc-settings-shell">
              <div className="doc-settings-hero">
                <div>
                  <p className="doc-settings-kicker">Settings</p>
                  <h2>Document Configuration</h2>
                  <p>Manage versioning, tags, and metadata for this generated documentation commit.</p>
                </div>
                <div className="doc-settings-chips">
                  <span className="doc-settings-chip">{metadata?.branch || 'unknown branch'}</span>
                  <span className="doc-settings-chip">{metadata?.commit ? metadata.commit.substring(0, 7) : 'no commit'}</span>
                </div>
              </div>

              <div className="doc-settings-grid">
                <div className="doc-settings-card">
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
                              x
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
                </div>

                <div className="doc-settings-card">
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
