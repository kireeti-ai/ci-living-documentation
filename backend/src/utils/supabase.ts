import { createClient, SupabaseClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_KEY not set. Document storage features will be unavailable.')
}

// Create Supabase client
export const supabase: SupabaseClient | null = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

// Bucket name for project documents
export const DOCS_BUCKET = 'project_docs'

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

// Document structure stored in bucket
// Structure: project_name/version/document.md
//            project_name/version/metadata.json

/**
 * List all document versions for a project
 */
export const listProjectDocuments = async (projectName: string): Promise<string[]> => {
  if (!supabase) throw new Error('Supabase not configured')
  
  const { data, error } = await supabase.storage
    .from(DOCS_BUCKET)
    .list(projectName, {
      limit: 1000,
      sortBy: { column: 'created_at', order: 'desc' }
    })
  
  if (error) throw error
  
  // Filter to get unique folders (versions)
  const versions = data
    ?.filter((item: { id: string | null; name: string }) => item.id !== null && item.name !== '.emptyFolderPlaceholder')
    .map((item: { name: string }) => item.name) || []
  
  return versions
}

/**
 * Get document metadata for a specific version
 */
export const getDocumentMetadata = async (projectName: string, version: string): Promise<DocumentMetadata | null> => {
  if (!supabase) throw new Error('Supabase not configured')
  
  const path = `${projectName}/${version}/metadata.json`
  
  const { data, error } = await supabase.storage
    .from(DOCS_BUCKET)
    .download(path)
  
  if (error) {
    console.error('Error fetching metadata:', error)
    return null
  }
  
  const text = await data.text()
  return JSON.parse(text) as DocumentMetadata
}

/**
 * Get document content for a specific version
 */
export const getDocumentContent = async (projectName: string, version: string): Promise<string | null> => {
  if (!supabase) throw new Error('Supabase not configured')
  
  // First, list files in the version folder to find the markdown file
  const { data: files, error: listError } = await supabase.storage
    .from(DOCS_BUCKET)
    .list(`${projectName}/${version}`, {
      limit: 100
    })
  
  if (listError) {
    console.error('Error listing version files:', listError)
    return null
  }
  
  // Find markdown file (excluding metadata.json)
  const mdFile = files?.find((f: { name: string }) => f.name.endsWith('.md'))
  
  if (!mdFile) {
    console.error('No markdown file found in version folder')
    return null
  }
  
  const path = `${projectName}/${version}/${mdFile.name}`
  
  const { data, error } = await supabase.storage
    .from(DOCS_BUCKET)
    .download(path)
  
  if (error) {
    console.error('Error fetching document content:', error)
    return null
  }
  
  return await data.text()
}

/**
 * Get public URL for a document
 */
export const getDocumentPublicUrl = (projectName: string, version: string, filename: string): string | null => {
  if (!supabase) return null
  
  const path = `${projectName}/${version}/${filename}`
  const { data } = supabase.storage
    .from(DOCS_BUCKET)
    .getPublicUrl(path)
  
  return data.publicUrl
}

/**
 * Search documents content across all versions
 */
export const searchDocumentsContent = async (
  projectName: string, 
  query: string,
  filters?: { branch?: string; version?: string; tags?: string[] }
): Promise<Array<{ version: string; matches: string[]; metadata: DocumentMetadata }>> => {
  if (!supabase) throw new Error('Supabase not configured')
  
  const versions = await listProjectDocuments(projectName)
  const results: Array<{ version: string; matches: string[]; metadata: DocumentMetadata }> = []
  
  for (const version of versions) {
    const metadata = await getDocumentMetadata(projectName, version)
    if (!metadata) continue
    
    // Apply filters
    if (filters?.branch && metadata.branch !== filters.branch) continue
    if (filters?.version && version !== filters.version) continue
    if (filters?.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some(tag => metadata.tags.includes(tag))
      if (!hasMatchingTag) continue
    }
    
    const content = await getDocumentContent(projectName, version)
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
      results.push({ version, matches: matches.slice(0, 10), metadata })
    }
  }
  
  return results
}

/**
 * Update document tags (for owners/admins)
 */
export const updateDocumentTags = async (
  projectName: string, 
  version: string, 
  tags: string[]
): Promise<DocumentMetadata | null> => {
  if (!supabase) throw new Error('Supabase not configured')
  
  const metadata = await getDocumentMetadata(projectName, version)
  if (!metadata) throw new Error('Metadata not found')
  
  const updatedMetadata: DocumentMetadata = {
    ...metadata,
    tags,
    updatedAt: new Date().toISOString()
  }
  
  const path = `${projectName}/${version}/metadata.json`
  
  const { error } = await supabase.storage
    .from(DOCS_BUCKET)
    .upload(path, JSON.stringify(updatedMetadata, null, 2), {
      contentType: 'application/json',
      upsert: true
    })
  
  if (error) throw error
  
  return updatedMetadata
}

/**
 * Create a project folder in the bucket
 * Creates an empty placeholder file to initialize the folder
 */
export const createProjectFolder = async (projectName: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured')
  
  // Create a placeholder file to initialize the folder
  const placeholderPath = `${projectName}/.emptyFolderPlaceholder`
  
  const { error } = await supabase.storage
    .from(DOCS_BUCKET)
    .upload(placeholderPath, '', {
      contentType: 'text/plain',
      upsert: true
    })
  
  if (error && !error.message.includes('already exists')) {
    throw error
  }
}

/**
 * Delete a project folder and all its contents from the bucket
 */
export const deleteProjectFolder = async (projectName: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase not configured')
  
  // List all files in the project folder recursively
  const allFiles: string[] = []
  
  const listRecursive = async (path: string) => {
    const { data, error } = await supabase.storage
      .from(DOCS_BUCKET)
      .list(path, { limit: 1000 })
    
    if (error) throw error
    
    for (const item of data || []) {
      const fullPath = path ? `${path}/${item.name}` : item.name
      
      // If it's a folder (no metadata), recurse into it
      if (item.id === null) {
        await listRecursive(fullPath)
      } else {
        allFiles.push(fullPath)
      }
    }
  }
  
  await listRecursive(projectName)
  
  // Delete all files if any exist
  if (allFiles.length > 0) {
    const { error: deleteError } = await supabase.storage
      .from(DOCS_BUCKET)
      .remove(allFiles)
    
    if (deleteError) throw deleteError
  }
}

export default supabase
