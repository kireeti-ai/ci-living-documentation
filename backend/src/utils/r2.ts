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
  tags: string[]
  createdAt: string
  updatedAt: string
  title: string
  description?: string
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
  if (!r2Client) throw new Error('R2 not configured')
  
  const command = new ListObjectsV2Command({
    Bucket: DOCS_BUCKET,
    Prefix: `${projectId}/`,
    Delimiter: '/',
  })
  
  const response: ListObjectsV2CommandOutput = await r2Client.send(command)
  
  // CommonPrefixes contains the "folders" (commit hashes)
  const commitHashes = response.CommonPrefixes
    ?.map((prefix: CommonPrefix) => {
      // Remove project ID prefix and trailing slash
      const fullPath = prefix.Prefix || ''
      const parts = fullPath.split('/')
      return parts[1] // Get the commit hash part
    })
    .filter((v: string | undefined) => v && v !== '.emptyFolderPlaceholder') || []
  
  return commitHashes
}

/**
 * Get document metadata for a specific commit
 * Tries docs/summary/summary.json first, falls back to logs/epic4_execution.json
 */
export const getDocumentMetadata = async (projectId: string, commitHash: string): Promise<DocumentMetadata | null> => {
  if (!r2Client) throw new Error('R2 not configured')
  
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
      console.error('Error fetching metadata:', error)
    }
  }
  
  return null
}

/**
 * Get summary content for a specific commit
 * Tries docs/summary/summary.md first, falls back to summaries/summary.md
 */
export const getDocumentSummary = async (projectId: string, commitHash: string): Promise<string | null> => {
  if (!r2Client) throw new Error('R2 not configured')
  
  // Try new path first: docs/summary/summary.md
  const newKey = `${projectId}/${commitHash}/docs/summary/summary.md`
  // Fallback to old path: summaries/summary.md
  const oldKey = `${projectId}/${commitHash}/summaries/summary.md`
  
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
      
      return await streamToString(response.Body)
    } catch (error: any) {
      if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
        continue
      }
      console.error('Error fetching summary:', error)
    }
  }
  
  return null
}

/**
 * Get README content for a specific commit
 */
export const getDocumentReadme = async (projectId: string, commitHash: string): Promise<string | null> => {
  if (!r2Client) throw new Error('R2 not configured')
  
  const key = `${projectId}/${commitHash}/docs/README.generated.md`
  
  try {
    const command = new GetObjectCommand({
      Bucket: DOCS_BUCKET,
      Key: key,
    })
    
    const response = await r2Client.send(command)
    
    if (!response.Body) {
      return null
    }
    
    return await streamToString(response.Body)
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return null
    }
    console.error('Error fetching readme:', error)
    return null
  }
}

/**
 * Get API docs content for a specific commit (JSON format)
 * Path: docs/api/api-descriptions.json
 */
export const getDocumentContent = async (projectId: string, commitHash: string): Promise<string | null> => {
  if (!r2Client) throw new Error('R2 not configured')
  
  // New path: docs/api/api-descriptions.json
  const newKey = `${projectId}/${commitHash}/docs/api/api-descriptions.json`
  
  try {
    const command = new GetObjectCommand({
      Bucket: DOCS_BUCKET,
      Key: newKey,
    })
    
    const response = await r2Client.send(command)
    
    if (response.Body) {
      return await streamToString(response.Body)
    }
  } catch (error: any) {
    if (error.name !== 'NoSuchKey' && error.$metadata?.httpStatusCode !== 404) {
      console.error('Error fetching api-descriptions.json:', error)
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
    
    return await streamToString(response.Body)
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
  if (!r2Client) throw new Error('R2 not configured')
  
  const commits = await listProjectDocuments(projectId)
  const results: Array<{ commit: string; matches: string[]; metadata: DocumentMetadata }> = []
  
  for (const commit of commits) {
    const metadata = await getDocumentMetadata(projectId, commit)
    if (!metadata) continue
    
    // Apply filters
    if (filters?.branch && metadata.branch !== filters.branch) continue
    if (filters?.commit && commit !== filters.commit) continue
    if (filters?.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => metadata.tags.includes(tag))
      if (!hasMatchingTag) continue
    }
    
    const content = await getDocumentContent(projectId, commit)
    if (!content) continue
    
    // Search for query in content (case-insensitive)
    const queryLower = query.toLowerCase()
    const lines = content.split('\n')
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
  if (!r2Client) throw new Error('R2 not configured')
  
  const metadata = await getDocumentMetadata(projectId, commitHash)
  if (!metadata) throw new Error('Metadata not found')
  
  const updatedMetadata: DocumentMetadata = {
    ...metadata,
    tags,
    version: version || metadata.version,
    updatedAt: new Date().toISOString()
  }
  
  const key = `${projectId}/${commitHash}/logs/epic4_execution.json`
  
  const command = new PutObjectCommand({
    Bucket: DOCS_BUCKET,
    Key: key,
    Body: JSON.stringify(updatedMetadata, null, 2),
    ContentType: 'application/json',
  })
  
  await r2Client.send(command)
  
  return updatedMetadata
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
 * Upload document metadata to R2
 */
export const uploadDocumentMetadata = async (
  projectId: string,
  commitHash: string,
  metadata: DocumentMetadata
): Promise<void> => {
  if (!r2Client) throw new Error('R2 not configured')
  
  const key = `${projectId}/${commitHash}/logs/epic4_execution.json`
  
  const command = new PutObjectCommand({
    Bucket: DOCS_BUCKET,
    Key: key,
    Body: JSON.stringify(metadata, null, 2),
    ContentType: 'application/json',
  })
  
  await r2Client.send(command)
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
