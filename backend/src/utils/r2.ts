import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2CommandOutput,
  CommonPrefix,
  _Object
} from '@aws-sdk/client-s3'
import dotenv from 'dotenv'
import { db } from '../db/index.js'
import { documentVersions } from '../db/schema.js'
import { eq, and, desc } from 'drizzle-orm'

dotenv.config()

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME
const R2_ENDPOINT = process.env.R2_ENDPOINT

if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.warn('Warning: R2 credentials not fully set. Document storage features will be unavailable.')
}

// Create R2 client (S3-compatible)
export const r2Client: S3Client | null = R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY
  ? new S3Client({
    region: 'auto',
    endpoint: R2_ENDPOINT || `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  })
  : null

// Bucket name for project documents
export const DOCS_BUCKET = R2_BUCKET_NAME || 'ci-living-docs'

// Document metadata interface
export interface DocumentMetadata {
  version: string
  branch: string
  commit: string
  commitUrl: string
  branchUrl: string
  tags: string[] | null
  createdAt: string
  updatedAt: string
  title: string
  description?: string
}

export interface ArchitectureFile {
  name: string
  content: string
  lastModified: string | null
}

// Helper to convert stream to string
const streamToString = async (stream: any): Promise<string> => {
  const chunks: Uint8Array[] = []
  for await (const chunk of stream) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf-8')
}

/**
 * List all commit hashes for a project
 */
export const listProjectDocuments = async (projectId: string): Promise<string[]> => {
  // Query DB for document versions
  const docs = await db.query.documentVersions.findMany({
    where: eq(documentVersions.projectId, projectId),
    orderBy: [desc(documentVersions.createdAt)],
    columns: {
      commitIdx: true
    }
  })

  return docs.map(d => d.commitIdx)
}

/**
 * Get document metadata for a specific commit
 * Queries DB first, falls back to R2 JSON if DB missing (migration support)
 */
export const getDocumentMetadata = async (projectId: string, commitHash: string): Promise<DocumentMetadata | null> => {
  try {
    // 1. Try DB
    const doc = await db.query.documentVersions.findFirst({
      where: and(
        eq(documentVersions.projectId, projectId),
        eq(documentVersions.commitIdx, commitHash)
      )
    })

    if (doc) {
      // Return metadata from DB
      return {
        version: doc.version || '0.0.0',
        branch: doc.branch || '',
        commit: doc.commitIdx,
        commitUrl: '', // TODO: generating URLs requires project context (repo URL)
        branchUrl: '',
        tags: doc.tags || [],
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        title: doc.title || commitHash.substring(0, 7),
        description: doc.description || ''
      }
    }

    // 2. Fallback to R2 (if configured)
    if (!r2Client) return null

    // Try new path first: docs/summary/summary.json
    const newKey = `${projectId}/${commitHash}/docs/summary/summary.json`
    // Fallback to old path: logs/epic4_execution.json
    const oldKey = `${projectId}/${commitHash}/logs/epic4_execution.json`

    for (const key of [newKey, oldKey]) {
      try {
        const command = new GetObjectCommand({
          Bucket: DOCS_BUCKET,
          Key: key,
        })

        const response = await r2Client.send(command)

        if (!response.Body) {
          continue
        }

        const text = await streamToString(response.Body)
        return JSON.parse(text) as DocumentMetadata
      } catch (error: any) {
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
          continue
        }
        console.error('Error fetching metadata from R2:', error)
      }
    }
  } catch (error) {
    console.error('Error in getDocumentMetadata:', error)
  }

  return null
}

/**
 * Get summary content for a specific commit
 * Tries multiple paths where summary might be stored
 */
export const getDocumentSummary = async (projectId: string, commitHash: string): Promise<string | null> => {
  if (!r2Client) throw new Error('R2 not configured')

  // Try multiple possible paths for summary
  const possiblePaths = [
    `${projectId}/${commitHash}/docs/summary/summary.md`,
    `${projectId}/${commitHash}/summaries/summary.md`,
    `${projectId}/${commitHash}/docs/summary.md`,
    `${projectId}/${commitHash}/summary.md`,
  ]

  for (const key of possiblePaths) {
    try {
      const command = new GetObjectCommand({
        Bucket: DOCS_BUCKET,
        Key: key,
      })

      const response = await r2Client.send(command)

      if (!response.Body) {
        continue
      }

      console.log(`Found summary at: ${key}`)
      return await streamToString(response.Body)
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        continue
      }
      console.error('Error fetching summary:', error)
    }
  }

  console.log(`No summary found for ${projectId}/${commitHash} in any of the expected paths`)
  return null
}

/**
 * Get README content for a specific commit
 * Tries multiple paths where README might be stored
 */
export const getDocumentReadme = async (projectId: string, commitHash: string): Promise<string | null> => {
  if (!r2Client) throw new Error('R2 not configured')

  // Try multiple possible paths for README
  const possiblePaths = [
    `${projectId}/${commitHash}/docs/README.generated.md`,
    `${projectId}/${commitHash}/docs/README.md`,
    `${projectId}/${commitHash}/README.generated.md`,
    `${projectId}/${commitHash}/README.md`,
  ]

  for (const key of possiblePaths) {
    try {
      const command = new GetObjectCommand({
        Bucket: DOCS_BUCKET,
        Key: key,
      })

      const response = await r2Client.send(command)

      if (!response.Body) {
        continue
      }

      console.log(`Found README at: ${key}`)
      return await streamToString(response.Body)
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        continue
      }
      console.error('Error fetching readme:', error)
    }
  }

  console.log(`No README found for ${projectId}/${commitHash} in any of the expected paths`)
  return null
}

/**
 * Get architecture files for a specific commit
 * Path: docs/architecture/*
 */
export const getDocumentArchitecture = async (
  projectId: string,
  commitHash: string
): Promise<ArchitectureFile[]> => {
  if (!r2Client) throw new Error('R2 not configured')

  try {
    const architectureFolders = ['architecture', 'arch', 'adr', 'adrs', 'diagrams', 'er', 'schema', 'schemas']
    const allowedExts = ['.mmd', '.mermaid', '.md', '.markdown', '.mdx', '.txt', '.adoc', '.json', '.yaml', '.yml']

    const prefixes = [
      `${projectId}/${commitHash}/docs/architecture/`,
      `${projectId}/${commitHash}/docs/arch/`,
      `${projectId}/${commitHash}/docs/adr/`,
      `${projectId}/${commitHash}/docs/adrs/`,
      `${projectId}/${commitHash}/architecture/`,
      `${projectId}/${commitHash}/arch/`,
      `${projectId}/${commitHash}/adr/`,
      `${projectId}/${commitHash}/adrs/`,
      `${projectId}/${commitHash}/docs/`,
    ]

    const keyMap = new Map<string, _Object>()

    for (const prefix of prefixes) {
      const listCommand = new ListObjectsV2Command({
        Bucket: DOCS_BUCKET,
        Prefix: prefix,
      })

      const listResponse = await r2Client.send(listCommand)
      const files = (listResponse.Contents || []).filter((item: _Object) => {
        const key = item.Key || ''
        if (!key || key.endsWith('/')) return false

        const lower = key.toLowerCase()
        const hasSupportedExt = allowedExts.some((ext) => lower.endsWith(ext))
        const fromArchitecturePath = architectureFolders.some((folder) => lower.includes(`/${folder}/`))
        const isArchitectureNamedFile = lower.includes('architecture')

        return fromArchitecturePath || (isArchitectureNamedFile && hasSupportedExt)
      })

      for (const file of files) {
        if (file.Key) keyMap.set(file.Key, file)
      }
    }

    const files = Array.from(keyMap.values()).sort((a: _Object, b: _Object) =>
      (a.Key || '').localeCompare(b.Key || '')
    )

    const results: ArchitectureFile[] = []
    const commitPrefix = `${projectId}/${commitHash}/`

    for (const file of files) {
      if (!file.Key) continue

      try {
        const getCommand = new GetObjectCommand({
          Bucket: DOCS_BUCKET,
          Key: file.Key,
        })

        const response = await r2Client.send(getCommand)
        if (!response.Body) continue

        const content = await streamToString(response.Body)
        results.push({
          name: file.Key.replace(commitPrefix, ''),
          content,
          lastModified: file.LastModified ? file.LastModified.toISOString() : null,
        })
      } catch (error: any) {
        console.error(`Error reading architecture file ${file.Key}:`, error)
      }
    }

    return results
  } catch (error: any) {
    console.error('Error fetching architecture files:', error)
    return []
  }
}

/**
 * Get API docs content for a specific commit (JSON format)
 * Path: docs/api/api-description.json (fallback: api-descriptions.json)
 * Returns parsed JSON object if file is JSON, otherwise string
 */
export const getDocumentContent = async (projectId: string, commitHash: string): Promise<any | null> => {
  if (!r2Client) throw new Error('R2 not configured')

  // Preferred path plus backward-compatible fallback
  const apiKeys = [
    `${projectId}/${commitHash}/docs/api/api-description.json`,
    `${projectId}/${commitHash}/docs/api/api-descriptions.json`,
    `${projectId}/${commitHash}/api/api-description.json`,
    `${projectId}/${commitHash}/api/api-descriptions.json`,
  ]

  for (const key of apiKeys) {
    try {
      const command = new GetObjectCommand({
        Bucket: DOCS_BUCKET,
        Key: key,
      })

      const response = await r2Client.send(command)

      if (response.Body) {
        const text = await streamToString(response.Body)
        try {
          return JSON.parse(text)
        } catch (e) {
          console.warn(`Failed to parse ${key.split('/').pop()}, returning text`, e)
          return text
        }
      }
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        continue
      }
      console.error(`Error fetching ${key.split('/').pop()}:`, error)
    }
  }

  // Fallback: try to find any file in the docs folder (old behavior)
  const prefix = `${projectId}/${commitHash}/docs/`

  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: DOCS_BUCKET,
      Prefix: prefix,
    })

    const listResponse = await r2Client.send(listCommand)
    const files: _Object[] = listResponse.Contents || []

    // Find markdown or json file (excluding api/ and summary/ subdirs)
    const docFile = files.find((f: _Object) => {
      const key = f.Key || ''
      return (key.endsWith('.md') || key.endsWith('.json')) &&
        !key.includes('/api/') &&
        !key.includes('/summary/')
    })

    if (!docFile || !docFile.Key) {
      return null
    }

    const getCommand = new GetObjectCommand({
      Bucket: DOCS_BUCKET,
      Key: docFile.Key,
    })

    const response = await r2Client.send(getCommand)

    if (!response.Body) {
      return null
    }

    const text = await streamToString(response.Body)
    if (docFile.Key.endsWith('.json')) {
      try {
        return JSON.parse(text)
      } catch (e) {
        return text
      }
    }
    return text
  } catch (error: any) {
    console.error('Error fetching document content:', error)
    return null
  }
}

/**
 * Get public URL for a document
 * Note: R2 public access must be enabled for the bucket
 */
export const getDocumentPublicUrl = (projectId: string, commitHash: string, subdir: string, filename: string): string | null => {
  if (!R2_ACCOUNT_ID || !DOCS_BUCKET) return null

  const key = `${projectId}/${commitHash}/${subdir}/${filename}`
  // R2 public URL format (requires public bucket or custom domain)
  return `https://${DOCS_BUCKET}.${R2_ACCOUNT_ID}.r2.dev/${key}`
}

/**
 * Search documents content across all commits
 */
export const searchDocumentsContent = async (
  projectId: string,
  query: string,
  filters?: { branch?: string; commit?: string; tags?: string[] }
): Promise<Array<{ commit: string; matches: string[]; metadata: DocumentMetadata }>> => {
  // First get all commits, optionally filtered by DB metadata
  const commits = await listProjectDocuments(projectId)

  const results: Array<{ commit: string; matches: string[]; metadata: DocumentMetadata }> = []

  for (const commit of commits) {
    const metadata = await getDocumentMetadata(projectId, commit)
    if (!metadata) continue

    // Apply filters
    if (filters?.branch && metadata.branch !== filters.branch) continue
    if (filters?.commit && commit !== filters.commit) continue
    if (filters?.tags && filters.tags.length > 0) {
      const hasMatchingTag = Array.isArray(metadata.tags) && filters.tags.some(tag => metadata.tags && metadata.tags.includes(tag))
      if (!hasMatchingTag) continue
    }

    const content = await getDocumentContent(projectId, commit)
    if (!content) continue

    // Convert object to string for text search if needed
    let contentStr: string
    if (typeof content !== 'string') {
      contentStr = JSON.stringify(content, null, 2)
    } else {
      contentStr = content
    }

    // Search for query in content (case-insensitive)
    const queryLower = query.toLowerCase()
    const lines = contentStr.split('\n')
    const matches: string[] = []

    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(queryLower)) {
        // Include context (line before and after)
        const start = Math.max(0, index - 1)
        const end = Math.min(lines.length - 1, index + 1)
        const context = lines.slice(start, end + 1).join('\n')
        matches.push(context)
      }
    })

    if (matches.length > 0) {
      results.push({ commit, matches: matches.slice(0, 10), metadata })
    }
  }

  return results
}

/**
 * Update document metadata (tags, version, etc.) for owners/admins
 */
export const updateDocumentTags = async (
  projectId: string,
  commitHash: string,
  tags: string[],
  version?: string
): Promise<DocumentMetadata | null> => {

  const updated = await db
    .update(documentVersions)
    .set({
      tags: tags,
      version: version,
      updatedAt: new Date(),
    })
    .where(and(
      eq(documentVersions.projectId, projectId),
      eq(documentVersions.commitIdx, commitHash)
    ))
    .returning()

  if (!updated.length) return null

  const doc = updated[0]
  return {
    version: doc.version || '',
    branch: doc.branch || '',
    commit: doc.commitIdx,
    commitUrl: '',
    branchUrl: '',
    tags: doc.tags || [],
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    title: doc.title || '',
    description: doc.description || ''
  }
}

/**
 * Create a project folder in the bucket
 * Creates an empty placeholder file to initialize the folder
 */
export const createProjectFolder = async (projectId: string): Promise<void> => {
  if (!r2Client) throw new Error('R2 not configured')

  // Create a placeholder file to initialize the folder
  const key = `${projectId}/.emptyFolderPlaceholder`

  const command = new PutObjectCommand({
    Bucket: DOCS_BUCKET,
    Key: key,
    Body: '',
    ContentType: 'text/plain',
  })

  await r2Client.send(command)
}

/**
 * Delete a project folder and all its contents from the bucket
 */
export const deleteProjectFolder = async (projectId: string): Promise<void> => {
  if (!r2Client) throw new Error('R2 not configured')

  // List all files in the project folder
  const allKeys: string[] = []
  let continuationToken: string | undefined

  do {
    const command = new ListObjectsV2Command({
      Bucket: DOCS_BUCKET,
      Prefix: `${projectId}/`,
      ContinuationToken: continuationToken,
    })

    const response = await r2Client.send(command)

    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key) {
          allKeys.push(item.Key)
        }
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  // Delete all files if any exist
  if (allKeys.length > 0) {
    // R2/S3 allows deleting up to 1000 objects at once
    const batchSize = 1000
    for (let i = 0; i < allKeys.length; i += batchSize) {
      const batch = allKeys.slice(i, i + batchSize)

      const deleteCommand = new DeleteObjectsCommand({
        Bucket: DOCS_BUCKET,
        Delete: {
          Objects: batch.map(key => ({ Key: key })),
        },
      })

      await r2Client.send(deleteCommand)
    }
  }
}

/**
 * Upload a document to R2
 */
export const uploadDocument = async (
  projectId: string,
  commitHash: string,
  subdir: 'summaries' | 'docs' | 'logs',
  filename: string,
  content: string,
  contentType: string = 'text/markdown'
): Promise<void> => {
  if (!r2Client) throw new Error('R2 not configured')

  const key = `${projectId}/${commitHash}/${subdir}/${filename}`

  const command = new PutObjectCommand({
    Bucket: DOCS_BUCKET,
    Key: key,
    Body: content,
    ContentType: contentType,
  })

  await r2Client.send(command)
}

/**
 * Upload document metadata to DB (Upsert)
 */
export const uploadDocumentMetadata = async (
  projectId: string,
  commitHash: string,
  metadata: DocumentMetadata
): Promise<void> => {

  await db
    .insert(documentVersions)
    .values({
      projectId,
      commitIdx: commitHash,
      branch: metadata.branch,
      version: metadata.version || '0.0.0',
      title: metadata.title,
      description: metadata.description,
      tags: metadata.tags,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: [documentVersions.projectId, documentVersions.commitIdx],
      set: {
        branch: metadata.branch,
        version: metadata.version,
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        updatedAt: new Date()
      }
    })
}

/**
 * Delete a specific commit folder from R2
 */
export const deleteDocumentVersion = async (
  projectId: string,
  commitHash: string
): Promise<void> => {
  if (!r2Client) throw new Error('R2 not configured')

  const prefix = `${projectId}/${commitHash}/`

  // List all files in the commit folder
  const allKeys: string[] = []
  let continuationToken: string | undefined

  do {
    const command = new ListObjectsV2Command({
      Bucket: DOCS_BUCKET,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    })

    const response = await r2Client.send(command)

    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key) {
          allKeys.push(item.Key)
        }
      }
    }

    continuationToken = response.NextContinuationToken
  } while (continuationToken)

  // Delete all files in the commit folder
  if (allKeys.length > 0) {
    const deleteCommand = new DeleteObjectsCommand({
      Bucket: DOCS_BUCKET,
      Delete: {
        Objects: allKeys.map(key => ({ Key: key })),
      },
    })

    await r2Client.send(deleteCommand)
  }
}

export default r2Client
