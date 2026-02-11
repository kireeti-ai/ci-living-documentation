import { Router, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { projects, projectMembers } from '../db/schema.js'
import { eq, and, or } from 'drizzle-orm'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import {
  listProjectDocuments,
  getDocumentMetadata,
  getDocumentContent,
  getDocumentSummary,
  getDocumentReadme,
  searchDocumentsContent,
  updateDocumentTags,
  uploadDocument,
  uploadDocumentMetadata,
  deleteDocumentVersion,
  DocumentMetadata
} from '../utils/r2.js'

const router = Router()

// All routes require authentication
router.use(authenticate)

// Validation schemas
const searchSchema = z.object({
  query: z.string().min(1),
  branch: z.string().optional(),
  commit: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

const updateTagsSchema = z.object({
  tags: z.array(z.string()),
  version: z.string().optional(),
})

const testUploadSchema = z.object({
  commitHash: z.string().min(1).max(100),
  title: z.string().min(1).max(255),
  summary: z.string().min(1),
  docs: z.string().optional(),
  branch: z.string().optional().default('test'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  version: z.string().optional().default('1.0.0'),
})

// Helper function to check if user is project member
const isProjectMember = async (projectId: string, userId: string) => {
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)))
    .limit(1)
  return member
}

// Helper function to check if user is project owner or admin
const isProjectAdminOrOwner = async (projectId: string, userId: string) => {
  const [member] = await db
    .select()
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
        or(eq(projectMembers.role, 'owner'), eq(projectMembers.role, 'admin'))
      )
    )
    .limit(1)
  return member
}

// Helper function to get project name by ID
const getProjectById = async (projectId: string) => {
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  return project
}

// GET /projects/:id/documents - List all commit hashes for a project
router.get('/:id/documents', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if user is a member
    const member = await isProjectMember(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Access denied' })
    }

    // Get project
    const project = await getProjectById(id)
    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    // List documents from R2 storage using projectId
    const commitHashes = await listProjectDocuments(project.id)

    // Get metadata for each commit
    const documentsWithMetadata: Array<{ commit: string; metadata: DocumentMetadata | null }> = []
    
    for (const commit of commitHashes) {
      const metadata = await getDocumentMetadata(project.id, commit)
      documentsWithMetadata.push({ commit, metadata })
    }

    return res.json({
      projectId: id,
      projectName: project.name,
      documents: documentsWithMetadata,
    })
  } catch (error: any) {
    console.error('List documents error:', error)
    return res.status(500).json({ detail: error.message || 'Failed to list documents' })
  }
})

// GET /projects/:id/documents/filters - Get available filter options (branches, tags)
// NOTE: This route MUST be defined before /:id/documents/:commit to avoid "filters" being matched as a commit
router.get('/:id/documents/filters', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const member = await isProjectMember(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Access denied' })
    }

    const project = await getProjectById(id)
    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

      const commits = await listProjectDocuments(project.id)

      const branches = new Set<string>()
      const tags = new Set<string>()

      for (const commit of commits) {
        const metadata = await getDocumentMetadata(project.id, commit)
        if (metadata) {
          if (metadata.branch) branches.add(metadata.branch)
          if (Array.isArray(metadata.tags)) {
            metadata.tags.forEach(tag => tags.add(tag))
          }
        }
      }

      // Always return arrays, never undefined
      return res.json({
        commits: Array.isArray(commits) ? commits : [],
        branches: Array.from(branches),
        tags: Array.from(tags),
      })
  } catch (error: any) {
    console.error('Get filters error:', error)
    return res.status(500).json({ detail: error.message || 'Failed to get filters' })
  }
})

// POST /projects/:id/documents/search - Search across all document commits
// NOTE: This route MUST be defined before /:id/documents/:commit to avoid "search" being matched as a commit
router.post('/:id/documents/search', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const validation = searchSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const member = await isProjectMember(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Access denied' })
    }

    const project = await getProjectById(id)
    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    const { query, branch, commit, tags } = validation.data

    const results = await searchDocumentsContent(project.id, query, {
      branch,
      commit,
      tags,
    })

    return res.json({
      projectId: id,
      projectName: project.name,
      query,
      results,
    })
  } catch (error: any) {
    console.error('Search documents error:', error)
    return res.status(500).json({ detail: error.message || 'Failed to search documents' })
  }
})

// GET /projects/:id/documents/:commit - Get specific document commit details & content
router.get('/:id/documents/:commit', async (req: AuthRequest, res: Response) => {
  try {
    const { id, commit } = req.params
    const userId = req.user!.id

    // Check if user is a member
    const member = await isProjectMember(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Access denied' })
    }

    const project = await getProjectById(id)
    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    const metadata = await getDocumentMetadata(project.id, commit)
    const content = await getDocumentContent(project.id, commit)

    if (!metadata && !content) {
      return res.status(404).json({ detail: 'Document commit not found' })
    }

    return res.json({
      projectId: id,
      projectName: project.name,
      commit,
      metadata,
      content,
    })
  } catch (error: any) {
    console.error('Get document error:', error)
    return res.status(500).json({ detail: error.message || 'Failed to get document' })
  }
})

// GET /projects/:id/documents/:commit/summary - Get summary for a commit
router.get('/:id/documents/:commit/summary', async (req: AuthRequest, res: Response) => {
  try {
    const { id, commit } = req.params
    const userId = req.user!.id

    const member = await isProjectMember(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Access denied' })
    }

    const project = await getProjectById(id)
    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    const summary = await getDocumentSummary(project.id, commit)

    if (!summary) {
      return res.status(404).json({ detail: 'Summary not found' })
    }
    console.log("Summary", summary);
    return res.json({
      projectId: id,
      projectName: project.name,
      commit,
      content: summary,
    })
  } catch (error: any) {
    console.error('Get summary error:', error)
    return res.status(500).json({ detail: error.message || 'Failed to get summary' })
  }
})

// GET /projects/:id/documents/:commit/readme - Get README for a commit
router.get('/:id/documents/:commit/readme', async (req: AuthRequest, res: Response) => {
  try {
    const { id, commit } = req.params
    const userId = req.user!.id

    const member = await isProjectMember(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Access denied' })
    }

    const project = await getProjectById(id)
    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    const readme = await getDocumentReadme(project.id, commit)

    if (!readme) {
      return res.status(404).json({ detail: 'README not found' })
    }

    return res.json({
      projectId: id,
      projectName: project.name,
      commit,
      content: readme,
    })
  } catch (error: any) {
    console.error('Get readme error:', error)
    return res.status(500).json({ detail: error.message || 'Failed to get readme' })
  }
})

// GET /projects/:id/documents/:commit/metadata - Get only metadata for a commit
router.get('/:id/documents/:commit/metadata', async (req: AuthRequest, res: Response) => {
  try {
    const { id, commit } = req.params
    const userId = req.user!.id

    const member = await isProjectMember(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Access denied' })
    }

    const project = await getProjectById(id)
    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    const metadata = await getDocumentMetadata(project.id, commit)

    if (!metadata) {
      return res.status(404).json({ detail: 'Metadata not found' })
    }

    return res.json(metadata)
  } catch (error: any) {
    console.error('Get metadata error:', error)
    return res.status(500).json({ detail: error.message || 'Failed to get metadata' })
  }
})

// PUT /projects/:id/documents/:commit/tags - Update document tags and version (owner/admin only)
router.put('/:id/documents/:commit/tags', async (req: AuthRequest, res: Response) => {
  try {
    const { id, commit } = req.params
    const userId = req.user!.id

    const validation = updateTagsSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    // Check if user is owner or admin
    const member = await isProjectAdminOrOwner(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Only project owners and admins can update tags' })
    }

    const project = await getProjectById(id)
    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    const { tags, version } = validation.data

    const updatedMetadata = await updateDocumentTags(project.id, commit, tags, version)

    return res.json({
      message: 'Document updated successfully',
      metadata: updatedMetadata,
    })
  } catch (error: any) {
    console.error('Update tags error:', error)
    return res.status(500).json({ detail: error.message || 'Failed to update tags' })
  }
})

// POST /projects/:id/documents/test-upload - Upload a test document (owner/admin only)
router.post('/:id/documents/test-upload', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const validation = testUploadSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    // Check if user is owner or admin
    const member = await isProjectAdminOrOwner(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Only project owners and admins can upload test documents' })
    }

    const project = await getProjectById(id)
    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    const { commitHash, title, summary, docs, branch, description, tags, version } = validation.data

    // Create metadata
    const metadata: DocumentMetadata = {
      version: version || '1.0.0',
      branch: branch || 'test',
      commit: commitHash,
      commitUrl: '',
      branchUrl: '',
      tags: tags || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      title,
      description: description || 'Test document uploaded manually',
    }

    // Upload summary
    await uploadDocument(project.id, commitHash, 'summaries', 'summary.md', summary)
    
    // Upload docs if provided
    if (docs) {
      await uploadDocument(project.id, commitHash, 'docs', `${title.replace(/[^a-zA-Z0-9]/g, '-')}.md`, docs)
    }
    
    // Upload metadata
    await uploadDocumentMetadata(project.id, commitHash, metadata)

    return res.status(201).json({
      message: 'Test document uploaded successfully',
      commit: commitHash,
      metadata,
    })
  } catch (error: any) {
    console.error('Test upload error:', error)
    return res.status(500).json({ detail: error.message || 'Failed to upload test document' })
  }
})

// DELETE /projects/:id/documents/:commit - Delete a document commit (owner/admin only)
router.delete('/:id/documents/:commit', async (req: AuthRequest, res: Response) => {
  try {
    const { id, commit } = req.params
    const userId = req.user!.id

    // Check if user is owner or admin
    const member = await isProjectAdminOrOwner(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Only project owners and admins can delete documents' })
    }

    const project = await getProjectById(id)
    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    // Check if document exists
    const metadata = await getDocumentMetadata(project.id, commit)
    if (!metadata) {
      return res.status(404).json({ detail: 'Document commit not found' })
    }

    // Delete the document commit
    await deleteDocumentVersion(project.id, commit)

    return res.json({
      message: 'Document deleted successfully',
      commit,
    })
  } catch (error: any) {
    console.error('Delete document error:', error)
    return res.status(500).json({ detail: error.message || 'Failed to delete document' })
  }
})

export default router
