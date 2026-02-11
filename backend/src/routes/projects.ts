import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '../db/index.js'
import { projects, projectMembers, projectInvitations, projectSettings, users } from '../db/schema.js'
import { eq, or, and } from 'drizzle-orm'
import { authenticate, AuthRequest } from '../middleware/auth.js'
import { sendProjectInviteEmail } from '../utils/email.js'
import { createProjectFolder, deleteProjectFolder } from '../utils/r2.js'
import { createGitHubWebhook, deleteGitHubWebhook, parseGitHubUrl } from '../utils/github.js'
import crypto from 'crypto'

/**
 * Fetch the latest commit and default branch from a GitHub repository
 */
const getRepoLatestInfo = async (
  githubUrl: string,
  githubToken: string
): Promise<{ branch: string; commitHash: string }> => {
  const defaultResult = { branch: 'main', commitHash: 'initial' }
  
  try {
    const parsed = parseGitHubUrl(githubUrl)
    if (!parsed) {
      console.warn('Could not parse GitHub URL:', githubUrl)
      return defaultResult
    }

    const { owner, repo } = parsed

    // Get repository info to find default branch
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })

    if (!repoResponse.ok) {
      console.warn(`Failed to fetch repo info: ${repoResponse.status}`)
      return defaultResult
    }

    const repoData = await repoResponse.json()
    const defaultBranch = repoData.default_branch || 'main'

    // Get latest commit on the default branch
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?sha=${defaultBranch}&per_page=1`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )

    if (!commitsResponse.ok) {
      console.warn(`Failed to fetch commits: ${commitsResponse.status}`)
      return { branch: defaultBranch, commitHash: 'initial' }
    }

    const commits = await commitsResponse.json()
    const latestCommit = commits[0]?.sha || 'initial'

    return {
      branch: defaultBranch,
      commitHash: latestCommit,
    }
  } catch (error) {
    console.error('Failed to get repo latest info:', error)
    return defaultResult
  }
}

/**
 * Trigger initial document generation for a project.
 * This is called asynchronously after project creation to not block the response.
 */
const triggerInitialDocGeneration = async (
  projectId: string,
  projectName: string,
  githubUrl: string,
  githubToken: string
) => {
  console.log(`Triggering initial document generation for project: ${projectName}`)
  
  try {
    // Get the actual latest commit and default branch from GitHub
    const { branch, commitHash } = await getRepoLatestInfo(githubUrl, githubToken)
    console.log(`Using branch: ${branch}, commit: ${commitHash.substring(0, 7)}`)

    // Step 1: Call code-detect API to analyze the repository
    const analyzeResponse = await fetch('https://code-detect.onrender.com/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        repo_url: githubUrl.endsWith('.git') ? githubUrl : `${githubUrl}.git`,
        branch,
        github_token: githubToken,
        project_id: projectId,
        new_user: true,
      }),
    })

    if (!analyzeResponse.ok) {
      console.error(`Code-detect API error: ${analyzeResponse.status} ${await analyzeResponse.text()}`)
      return
    }

    const analysisResult = await analyzeResponse.json()
    console.log(`Code-detect analysis completed for ${projectName}`)

    // Step 2: Call generate-docs API
    const generateDocsResponse = await fetch('https://ci-docs-gen.onrender.com/generate-docs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch,
        commit_hash: commitHash,
        impact_report: analysisResult,
        project_id: projectId,
        repo_url: githubUrl,
      }),
    })

    if (!generateDocsResponse.ok) {
      console.error(`Generate-docs API error: ${generateDocsResponse.status} ${await generateDocsResponse.text()}`)
      return
    }

    console.log(`Documentation generated for ${projectName}`)

    // Step 3: Call generate-summary API
    const generateSummaryResponse = await fetch('https://ci-living-documentation.onrender.com/generate-summary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        impact_report: analysisResult,
        drift_report: {},
        commit_sha: commitHash,
        project_id: projectId,
      }),
    })

    if (!generateSummaryResponse.ok) {
      console.error(`Generate-summary API error: ${generateSummaryResponse.status} ${await generateSummaryResponse.text()}`)
      return
    }

    console.log(`Initial documentation generation completed for ${projectName} (branch: ${branch}, commit: ${commitHash.substring(0, 7)})`)
  } catch (error) {
    console.error(`Failed to trigger initial doc generation for ${projectName}:`, error)
  }
}

const router = Router()

// All routes require authentication
router.use(authenticate)

// Validation schemas
const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  githubUrl: z.string().url({ message: 'GitHub URL is required and must be a valid URL' }),
  // Optional settings during creation
  autoGenerateDocs: z.boolean().optional(),
  githubAccessToken: z.string().optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  // Note: githubUrl is not editable after creation
})

const inviteMemberSchema = z.object({
  email: z.string().email(),
})

const updateSettingsSchema = z.object({
  autoGenerateDocs: z.boolean().optional(),
  githubAccessToken: z.string().optional().nullable(),
})

const updateMemberRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'member']),
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

// GET /projects - Get all projects for the authenticated user
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.id

    // Get all projects where user is a member
    const userProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        githubUrl: projects.githubUrl,
        ownerId: projects.ownerId,
        createdAt: projects.createdAt,
        updatedAt: projects.updatedAt,
        memberRole: projectMembers.role,
      })
      .from(projects)
      .innerJoin(projectMembers, eq(projects.id, projectMembers.projectId))
      .where(eq(projectMembers.userId, userId))

    return res.json(userProjects)
  } catch (error) {
    console.error('Get projects error:', error)
    return res.status(500).json({ detail: 'Failed to fetch projects' })
  }
})

// POST /projects - Create a new project
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const validation = createProjectSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { name, description, githubUrl, autoGenerateDocs, githubAccessToken } = validation.data
    const userId = req.user!.id

    // Create the project
    const [newProject] = await db
      .insert(projects)
      .values({
        name,
        description: description || null,
        githubUrl: githubUrl,
        ownerId: userId,
      })
      .returning()

    // Add the creator as an owner member
    await db.insert(projectMembers).values({
      projectId: newProject.id,
      userId,
      role: 'owner',
    })

    // Create project settings with provided values
    const settingsAutoGenerate = autoGenerateDocs ?? false
    const settingsToken = githubAccessToken || null
    let webhookId: string | null = null

    // Create GitHub webhook if we have an access token
    if (settingsToken && githubUrl) {
      try {
        const parsed = parseGitHubUrl(githubUrl)
        if (parsed) {
          const webhookResult = await createGitHubWebhook(parsed.owner, parsed.repo, settingsToken, newProject.id)
          if (webhookResult.success) {
            webhookId = webhookResult.webhookId.toString()
            console.log(`Created webhook ${webhookId} for project ${name}`)
          } else {
            console.warn(`Webhook creation failed: ${webhookResult.error}`)
          }
        }
      } catch (webhookError) {
        console.warn('Could not create GitHub webhook:', webhookError)
        // Don't fail project creation if webhook creation fails
      }
    }
    
    await db.insert(projectSettings).values({
      projectId: newProject.id,
      autoGenerateDocs: settingsAutoGenerate,
      githubAccessToken: settingsToken,
      githubWebhookId: webhookId,
    })

    // Trigger initial document generation if autoGenerateDocs is enabled and we have a token
    if (settingsAutoGenerate && settingsToken && githubUrl) {
      // Run asynchronously without blocking the response
      triggerInitialDocGeneration(newProject.id, name, githubUrl, settingsToken)
        .catch(err => console.error('Initial doc generation failed:', err))
    }

    return res.status(201).json({
      ...newProject,
      memberRole: 'owner',
      settings: {
        autoGenerateDocs: settingsAutoGenerate,
        hasGithubToken: !!settingsToken,
        hasWebhook: !!webhookId,
      },
    })
  } catch (error) {
    console.error('Create project error:', error)
    return res.status(500).json({ detail: 'Failed to create project' })
  }
})

// GET /projects/:id - Get project details
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if user is a member
    const member = await isProjectMember(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Access denied' })
    }

    // Get project details
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)

    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    // Get project members
    const members = await db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        role: projectMembers.role,
        joinedAt: projectMembers.joinedAt,
        email: users.email,
        username: users.username,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.projectId, id))

    // Get pending invitations
    const invitations = await db
      .select()
      .from(projectInvitations)
      .where(and(eq(projectInvitations.projectId, id), eq(projectInvitations.status, 'pending')))

    // Get project settings
    const [settings] = await db
      .select()
      .from(projectSettings)
      .where(eq(projectSettings.projectId, id))
      .limit(1)

    return res.json({
      ...project,
      memberRole: member.role,
      members,
      pendingInvitations: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        createdAt: inv.createdAt,
      })),
      settings: settings ? {
        autoGenerateDocs: settings.autoGenerateDocs,
        hasGithubToken: !!settings.githubAccessToken,
        hasWebhook: !!settings.githubWebhookId,
      } : {
        autoGenerateDocs: false,
        hasGithubToken: false,
        hasWebhook: false,
      },
    })
  } catch (error) {
    console.error('Get project error:', error)
    return res.status(500).json({ detail: 'Failed to fetch project' })
  }
})

// PUT /projects/:id - Update project
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const validation = updateProjectSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    // Check if user is owner or admin
    const member = await isProjectAdminOrOwner(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Only project owners and admins can update settings' })
    }

    const { name, description } = validation.data

    const updateData: any = { updatedAt: new Date() }
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description

    const [updatedProject] = await db
      .update(projects)
      .set(updateData)
      .where(eq(projects.id, id))
      .returning()

    if (!updatedProject) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    return res.json(updatedProject)
  } catch (error) {
    console.error('Update project error:', error)
    return res.status(500).json({ detail: 'Failed to update project' })
  }
})

// PUT /projects/:id/settings - Update project settings
router.put('/:id/settings', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const validation = updateSettingsSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    // Check if user is owner or admin
    const member = await isProjectAdminOrOwner(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Only project owners and admins can update settings' })
    }

    const { autoGenerateDocs, githubAccessToken } = validation.data

    // Get project details for GitHub URL
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)

    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    // Check if settings exist
    const [existingSettings] = await db
      .select()
      .from(projectSettings)
      .where(eq(projectSettings.projectId, id))
      .limit(1)

    const updateData: any = { updatedAt: new Date() }
    if (autoGenerateDocs !== undefined) updateData.autoGenerateDocs = autoGenerateDocs
    
    let newWebhookId: string | null = null

    // Handle GitHub token changes and webhook management
    if (githubAccessToken !== undefined) {
      const newToken = githubAccessToken || null
      const oldToken = existingSettings?.githubAccessToken
      const oldWebhookId = existingSettings?.githubWebhookId

      // Token is being changed
      if (newToken !== oldToken) {
        // Delete old webhook if it exists
        if (oldWebhookId && oldToken && project.githubUrl) {
          try {
            const parsed = parseGitHubUrl(project.githubUrl)
            if (parsed) {
              await deleteGitHubWebhook(parsed.owner, parsed.repo, parseInt(oldWebhookId), oldToken)
              console.log(`Deleted old webhook ${oldWebhookId} for project ${project.name}`)
            }
          } catch (error) {
            console.warn('Could not delete old webhook:', error)
          }
        }

        // Create new webhook if new token provided
        if (newToken && project.githubUrl) {
          try {
            const parsed = parseGitHubUrl(project.githubUrl)
            if (parsed) {
              const webhookResult = await createGitHubWebhook(parsed.owner, parsed.repo, newToken, project.id)
              if (webhookResult.success) {
                newWebhookId = webhookResult.webhookId.toString()
                console.log(`Created new webhook ${newWebhookId} for project ${project.name}`)
              } else {
                console.warn(`Webhook creation failed: ${webhookResult.error}`)
              }
            }
          } catch (error) {
            console.warn('Could not create new webhook:', error)
          }
        }

        updateData.githubAccessToken = newToken
        updateData.githubWebhookId = newWebhookId
      }
    }

    if (existingSettings) {
      // Update existing settings
      const [updatedSettings] = await db
        .update(projectSettings)
        .set(updateData)
        .where(eq(projectSettings.projectId, id))
        .returning()

      return res.json({
        autoGenerateDocs: updatedSettings.autoGenerateDocs,
        hasGithubToken: !!updatedSettings.githubAccessToken,
        hasWebhook: !!updatedSettings.githubWebhookId,
      })
    } else {
      // Create new settings with webhook if token provided
      if (githubAccessToken && project.githubUrl) {
        try {
          const parsed = parseGitHubUrl(project.githubUrl)
          if (parsed) {
            const webhookResult = await createGitHubWebhook(parsed.owner, parsed.repo, githubAccessToken, project.id)
            if (webhookResult.success) {
              newWebhookId = webhookResult.webhookId.toString()
              console.log(`Created webhook ${newWebhookId} for project ${project.name}`)
            }
          }
        } catch (error) {
          console.warn('Could not create webhook:', error)
        }
      }

      const [newSettings] = await db
        .insert(projectSettings)
        .values({
          projectId: id,
          autoGenerateDocs: autoGenerateDocs ?? false,
          githubAccessToken: githubAccessToken || null,
          githubWebhookId: newWebhookId,
        })
        .returning()

      return res.json({
        autoGenerateDocs: newSettings.autoGenerateDocs,
        hasGithubToken: !!newSettings.githubAccessToken,
        hasWebhook: !!newSettings.githubWebhookId,
      })
    }
  } catch (error) {
    console.error('Update project settings error:', error)
    return res.status(500).json({ detail: 'Failed to update project settings' })
  }
})

// POST /projects/:id/generate-docs - Manually trigger documentation generation
router.post('/:id/generate-docs', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if user is owner or admin
    const member = await isProjectAdminOrOwner(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Only project owners and admins can trigger documentation generation' })
    }

    // Get project details
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)

    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    if (!project.githubUrl) {
      return res.status(400).json({ detail: 'Project has no GitHub URL configured' })
    }

    // Get project settings for the GitHub token
    const [settings] = await db
      .select()
      .from(projectSettings)
      .where(eq(projectSettings.projectId, id))
      .limit(1)

    if (!settings?.githubAccessToken) {
      return res.status(400).json({ detail: 'GitHub access token is required to generate documentation' })
    }

    // Trigger documentation generation asynchronously
    triggerInitialDocGeneration(project.id, project.name, project.githubUrl, settings.githubAccessToken)
      .catch(err => console.error('Manual doc generation failed:', err))

    return res.json({ 
      message: 'Documentation generation started', 
      projectId: id,
      projectName: project.name 
    })
  } catch (error) {
    console.error('Trigger doc generation error:', error)
    return res.status(500).json({ detail: 'Failed to trigger documentation generation' })
  }
})

// DELETE /projects/:id - Delete project (owner only)
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    // Check if user is owner
    const [member] = await db
      .select()
      .from(projectMembers)
      .where(
        and(
          eq(projectMembers.projectId, id),
          eq(projectMembers.userId, userId),
          eq(projectMembers.role, 'owner')
        )
      )
      .limit(1)

    if (!member) {
      return res.status(403).json({ detail: 'Only project owners can delete projects' })
    }

    // Get project and settings for cleanup
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)

    const [settings] = await db
      .select()
      .from(projectSettings)
      .where(eq(projectSettings.projectId, id))
      .limit(1)

    // Delete GitHub webhook if exists
    if (project && settings?.githubWebhookId && settings?.githubAccessToken && project.githubUrl) {
      try {
        const parsed = parseGitHubUrl(project.githubUrl)
        if (parsed) {
          const deleted = await deleteGitHubWebhook(
            parsed.owner,
            parsed.repo,
            parseInt(settings.githubWebhookId),
            settings.githubAccessToken
          )
          if (deleted.success) {
            console.log(`Deleted webhook ${settings.githubWebhookId} for project ${project.name}`)
          }
        }
      } catch (webhookError) {
        console.warn('Could not delete GitHub webhook:', webhookError)
        // Continue with project deletion even if webhook deletion fails
      }
    }

    // Delete project folder from R2 bucket
    if (project) {
      try {
        await deleteProjectFolder(project.id)
      } catch (bucketError) {
        console.warn('Could not delete project folder from bucket:', bucketError)
        // Continue with project deletion even if bucket operation fails
      }
    }

    await db.delete(projects).where(eq(projects.id, id))

    return res.json({ message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Delete project error:', error)
    return res.status(500).json({ detail: 'Failed to delete project' })
  }
})

// POST /projects/:id/invite - Invite a member to the project
router.post('/:id/invite', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const userId = req.user!.id

    const validation = inviteMemberSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { email } = validation.data

    // Check if user is owner or admin
    const member = await isProjectAdminOrOwner(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Only project owners and admins can invite members' })
    }

    // Get project details
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)

    if (!project) {
      return res.status(404).json({ detail: 'Project not found' })
    }

    // Check if user is already a member
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existingUser) {
      const existingMember = await isProjectMember(id, existingUser.id)
      if (existingMember) {
        return res.status(400).json({ detail: 'User is already a member of this project' })
      }
    }

    // Check if there's already a pending invitation
    const [existingInvitation] = await db
      .select()
      .from(projectInvitations)
      .where(
        and(
          eq(projectInvitations.projectId, id),
          eq(projectInvitations.email, email),
          eq(projectInvitations.status, 'pending')
        )
      )
      .limit(1)

    if (existingInvitation) {
      return res.status(400).json({ detail: 'An invitation is already pending for this email' })
    }

    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create invitation
    const [invitation] = await db
      .insert(projectInvitations)
      .values({
        projectId: id,
        email,
        invitedUserId: existingUser?.id || null,
        invitedById: userId,
        token,
        status: 'pending',
        expiresAt,
      })
      .returning()

    // Send invitation email
    const inviterUser = req.user!
    await sendProjectInviteEmail(email, project.name, inviterUser.username, token)

    return res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        createdAt: invitation.createdAt,
      },
    })
  } catch (error) {
    console.error('Invite member error:', error)
    return res.status(500).json({ detail: 'Failed to send invitation' })
  }
})

// DELETE /projects/:id/invite/:invitationId - Cancel an invitation
router.delete('/:id/invite/:invitationId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, invitationId } = req.params
    const userId = req.user!.id

    // Check if user is owner or admin
    const member = await isProjectAdminOrOwner(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Only project owners and admins can cancel invitations' })
    }

    await db
      .delete(projectInvitations)
      .where(and(eq(projectInvitations.id, invitationId), eq(projectInvitations.projectId, id)))

    return res.json({ message: 'Invitation cancelled successfully' })
  } catch (error) {
    console.error('Cancel invitation error:', error)
    return res.status(500).json({ detail: 'Failed to cancel invitation' })
  }
})

// PATCH /projects/:id/members/:memberId/role - Update a member's role
router.patch('/:id/members/:memberId/role', async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params
    const userId = req.user!.id

    const validation = updateMemberRoleSchema.safeParse(req.body)
    if (!validation.success) {
      return res.status(400).json({ detail: validation.error.errors[0].message })
    }

    const { role } = validation.data

    // Check if user is owner or admin
    const requester = await isProjectAdminOrOwner(id, userId)
    if (!requester) {
      return res.status(403).json({ detail: 'Only project owners and admins can change member roles' })
    }

    // Get the target member
    const [targetMember] = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.id, memberId))
      .limit(1)

    if (!targetMember) {
      return res.status(404).json({ detail: 'Member not found' })
    }

    // Verify the member belongs to this project
    if (targetMember.projectId !== id) {
      return res.status(400).json({ detail: 'Member does not belong to this project' })
    }

    // Cannot change your own role
    if (targetMember.userId === userId) {
      return res.status(400).json({ detail: 'Cannot change your own role' })
    }

    // Check if changing to/from owner role
    if (role === 'owner' || targetMember.role === 'owner') {
      // Only current owner can transfer ownership
      if (requester.role !== 'owner') {
        return res.status(403).json({ detail: 'Only the project owner can transfer ownership' })
      }

      if (role === 'owner') {
        // Transfer ownership: demote current owner to admin
        await db
          .update(projectMembers)
          .set({ role: 'admin' })
          .where(eq(projectMembers.id, requester.id))
      }
    }

    // Update the target member's role
    const [updatedMember] = await db
      .update(projectMembers)
      .set({ role })
      .where(eq(projectMembers.id, memberId))
      .returning()

    // Get member details with user info
    const [memberWithUser] = await db
      .select({
        id: projectMembers.id,
        userId: projectMembers.userId,
        role: projectMembers.role,
        joinedAt: projectMembers.joinedAt,
        email: users.email,
        username: users.username,
      })
      .from(projectMembers)
      .innerJoin(users, eq(projectMembers.userId, users.id))
      .where(eq(projectMembers.id, memberId))
      .limit(1)

    return res.json(memberWithUser)
  } catch (error) {
    console.error('Update member role error:', error)
    return res.status(500).json({ detail: 'Failed to update member role' })
  }
})

// DELETE /projects/:id/members/:memberId - Remove a member from the project
router.delete('/:id/members/:memberId', async (req: AuthRequest, res: Response) => {
  try {
    const { id, memberId } = req.params
    const userId = req.user!.id

    // Check if user is owner or admin
    const member = await isProjectAdminOrOwner(id, userId)
    if (!member) {
      return res.status(403).json({ detail: 'Only project owners and admins can remove members' })
    }

    // Cannot remove the owner
    const [targetMember] = await db
      .select()
      .from(projectMembers)
      .where(eq(projectMembers.id, memberId))
      .limit(1)

    if (!targetMember) {
      return res.status(404).json({ detail: 'Member not found' })
    }

    if (targetMember.role === 'owner') {
      return res.status(400).json({ detail: 'Cannot remove the project owner' })
    }

    await db.delete(projectMembers).where(eq(projectMembers.id, memberId))

    return res.json({ message: 'Member removed successfully' })
  } catch (error) {
    console.error('Remove member error:', error)
    return res.status(500).json({ detail: 'Failed to remove member' })
  }
})

export default router
