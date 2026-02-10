import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

const GITHUB_API_BASE = 'https://api.github.com'

// Webhook secret for verifying GitHub signatures
export const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || crypto.randomBytes(32).toString('hex')

// Backend URL for webhook callbacks
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/**
 * Parse GitHub URL to extract owner and repo
 * Supports formats like:
 * - https://github.com/owner/repo
 * - https://github.com/owner/repo.git
 * - git@github.com:owner/repo.git
 */
export const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    // Handle HTTPS URLs
    const httpsMatch = url.match(/github\.com[\/:]([^\/]+)\/([^\/\.]+)(\.git)?/)
    if (httpsMatch) {
      return { owner: httpsMatch[1], repo: httpsMatch[2] }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Check if a webhook already exists for our backend
 */
export const findExistingWebhook = async (
  owner: string,
  repo: string,
  accessToken: string
): Promise<{ id: number; url: string } | null> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/hooks`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!response.ok) {
      if (response.status === 403) {
        console.warn('Token lacks webhook permissions - skipping webhook check')
        return null
      }
      console.error('Failed to list webhooks:', response.status, await response.text())
      return null
    }

    const hooks = await response.json()
    
    // Look for our webhook by checking the URL
    const webhookUrl = `${BACKEND_URL}/webhooks/github`
    const existingHook = hooks.find((hook: any) => 
      hook.config?.url?.includes('/webhooks/github')
    )

    if (existingHook) {
      return { id: existingHook.id, url: existingHook.config.url }
    }

    return null
  } catch (error) {
    console.error('Error finding existing webhook:', error)
    return null
  }
}

/**
 * Create a webhook on a GitHub repository
 */
export const createGitHubWebhook = async (
  owner: string,
  repo: string,
  accessToken: string,
  projectId: string
): Promise<{ webhookId: number; success: boolean; error?: string }> => {
  try {
    // Check if webhook already exists
    const existing = await findExistingWebhook(owner, repo, accessToken)
    if (existing) {
      console.log(`Webhook already exists for ${owner}/${repo}: ${existing.id}`)
      return { webhookId: existing.id, success: true }
    }

    // Create webhook URL with project ID for routing
    const webhookUrl = `${BACKEND_URL}/webhooks/github`

    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'web',
        active: true,
        events: ['push', 'pull_request', 'release'],
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: WEBHOOK_SECRET,
          insecure_ssl: '0',
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to create webhook:', response.status, errorText)
      
      // Handle 403 - insufficient permissions
      if (response.status === 403) {
        return { 
          webhookId: 0, 
          success: false, 
          error: 'GitHub token lacks webhook permissions. Enable "admin:repo_hook" scope (classic) or "Webhooks: Read and write" (fine-grained).'
        }
      }
      
      // Handle specific errors
      if (response.status === 404) {
        return { webhookId: 0, success: false, error: 'Repository not found or no access' }
      }
      if (response.status === 422) {
        // Webhook might already exist
        const existingCheck = await findExistingWebhook(owner, repo, accessToken)
        if (existingCheck) {
          return { webhookId: existingCheck.id, success: true }
        }
        return { webhookId: 0, success: false, error: 'Webhook configuration invalid or already exists' }
      }
      return { webhookId: 0, success: false, error: `GitHub API error: ${response.status}` }
    }

    const hook = await response.json()
    console.log(`Created webhook for ${owner}/${repo}: ${hook.id}`)
    return { webhookId: hook.id, success: true }
  } catch (error: any) {
    console.error('Error creating webhook:', error)
    return { webhookId: 0, success: false, error: error.message }
  }
}

/**
 * Delete a webhook from a GitHub repository
 */
export const deleteGitHubWebhook = async (
  owner: string,
  repo: string,
  webhookId: number,
  accessToken: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!webhookId) {
      return { success: true } // No webhook to delete
    }

    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/hooks/${webhookId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text()
      console.error('Failed to delete webhook:', response.status, errorText)
      return { success: false, error: `Failed to delete webhook: ${response.status}` }
    }

    console.log(`Deleted webhook ${webhookId} from ${owner}/${repo}`)
    return { success: true }
  } catch (error: any) {
    console.error('Error deleting webhook:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Verify GitHub webhook signature
 */
export const verifyWebhookSignature = (
  payload: string,
  signature: string | undefined
): boolean => {
  if (!signature) {
    return false
  }

  const sig = Buffer.from(signature, 'utf8')
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  const digest = Buffer.from('sha256=' + hmac.update(payload).digest('hex'), 'utf8')

  if (sig.length !== digest.length) {
    return false
  }

  return crypto.timingSafeEqual(digest, sig)
}

/**
 * Get repository info from GitHub
 */
export const getRepoInfo = async (
  owner: string,
  repo: string,
  accessToken?: string
): Promise<{ name: string; defaultBranch: string; private: boolean } | null> => {
  try {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }
    
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, {
      headers,
    })

    if (!response.ok) {
      return null
    }

    const repoData = await response.json()
    return {
      name: repoData.name,
      defaultBranch: repoData.default_branch,
      private: repoData.private,
    }
  } catch (error) {
    console.error('Error getting repo info:', error)
    return null
  }
}
