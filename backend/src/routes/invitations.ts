import { Router, Request, Response } from 'express'
import { db } from '../db/index.js'
import { projectInvitations, projectMembers, projects, users } from '../db/schema.js'
import { eq, and, gt } from 'drizzle-orm'
import { authenticate, AuthRequest } from '../middleware/auth.js'

const router = Router()

// GET /invitations/:token - Get invitation details (public)
router.get('/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params

    const [invitation] = await db
      .select({
        id: projectInvitations.id,
        email: projectInvitations.email,
        status: projectInvitations.status,
        expiresAt: projectInvitations.expiresAt,
        projectId: projectInvitations.projectId,
        projectName: projects.name,
        inviterName: users.username,
      })
      .from(projectInvitations)
      .innerJoin(projects, eq(projectInvitations.projectId, projects.id))
      .innerJoin(users, eq(projectInvitations.invitedById, users.id))
      .where(eq(projectInvitations.token, token))
      .limit(1)

    if (!invitation) {
      return res.status(404).json({ detail: 'Invitation not found' })
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ detail: `Invitation has already been ${invitation.status}` })
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      // Update status to expired
      await db
        .update(projectInvitations)
        .set({ status: 'expired' })
        .where(eq(projectInvitations.id, invitation.id))

      return res.status(400).json({ detail: 'Invitation has expired' })
    }

    return res.json({
      id: invitation.id,
      email: invitation.email,
      projectName: invitation.projectName,
      inviterName: invitation.inviterName,
      expiresAt: invitation.expiresAt,
    })
  } catch (error) {
    console.error('Get invitation error:', error)
    return res.status(500).json({ detail: 'Failed to get invitation details' })
  }
})

// POST /invitations/:token/accept - Accept invitation (requires auth)
router.post('/:token/accept', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params
    const userId = req.user!.id
    const userEmail = req.user!.email

    const [invitation] = await db
      .select()
      .from(projectInvitations)
      .where(eq(projectInvitations.token, token))
      .limit(1)

    if (!invitation) {
      return res.status(404).json({ detail: 'Invitation not found' })
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ detail: `Invitation has already been ${invitation.status}` })
    }

    if (new Date(invitation.expiresAt) < new Date()) {
      await db
        .update(projectInvitations)
        .set({ status: 'expired' })
        .where(eq(projectInvitations.id, invitation.id))

      return res.status(400).json({ detail: 'Invitation has expired' })
    }

    // Verify the invitation is for this user's email
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      return res.status(403).json({ detail: 'This invitation is for a different email address' })
    }

    // Check if user is already a member
    const [existingMember] = await db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, invitation.projectId), eq(projectMembers.userId, userId)))
      .limit(1)

    if (existingMember) {
      // Update invitation status and return
      await db
        .update(projectInvitations)
        .set({ status: 'accepted' })
        .where(eq(projectInvitations.id, invitation.id))

      return res.status(400).json({ detail: 'You are already a member of this project' })
    }

    // Add user as a member
    await db.insert(projectMembers).values({
      projectId: invitation.projectId,
      userId,
      role: 'member',
    })

    // Update invitation status
    await db
      .update(projectInvitations)
      .set({ status: 'accepted', invitedUserId: userId })
      .where(eq(projectInvitations.id, invitation.id))

    // Get project details
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, invitation.projectId))
      .limit(1)

    return res.json({
      message: 'Invitation accepted successfully',
      project: {
        id: project.id,
        name: project.name,
      },
    })
  } catch (error) {
    console.error('Accept invitation error:', error)
    return res.status(500).json({ detail: 'Failed to accept invitation' })
  }
})

// POST /invitations/:token/decline - Decline invitation (requires auth)
router.post('/:token/decline', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { token } = req.params
    const userEmail = req.user!.email

    const [invitation] = await db
      .select()
      .from(projectInvitations)
      .where(eq(projectInvitations.token, token))
      .limit(1)

    if (!invitation) {
      return res.status(404).json({ detail: 'Invitation not found' })
    }

    if (invitation.status !== 'pending') {
      return res.status(400).json({ detail: `Invitation has already been ${invitation.status}` })
    }

    // Verify the invitation is for this user's email
    if (invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      return res.status(403).json({ detail: 'This invitation is for a different email address' })
    }

    // Update invitation status
    await db
      .update(projectInvitations)
      .set({ status: 'declined' })
      .where(eq(projectInvitations.id, invitation.id))

    return res.json({ message: 'Invitation declined' })
  } catch (error) {
    console.error('Decline invitation error:', error)
    return res.status(500).json({ detail: 'Failed to decline invitation' })
  }
})

export default router
