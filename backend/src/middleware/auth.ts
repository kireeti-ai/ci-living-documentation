import { Request, Response, NextFunction } from 'express'
import { verifyToken, JwtPayload } from '../utils/jwt.js'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { eq } from 'drizzle-orm'

// Extend Express Request type
export interface AuthRequest extends Request {
  user?: {
    id: string
    email: string
    username: string
    role: string
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        username: string
        role: string
      }
    }
  }
}

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ detail: 'Access token required' })
    }

    const token = authHeader.split(' ')[1]
    const payload = verifyToken(token)

    if (!payload) {
      return res.status(401).json({ detail: 'Invalid or expired token' })
    }

    // Verify user still exists and is active
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1)

    if (!user) {
      return res.status(401).json({ detail: 'User not found' })
    }

    if (!user.isActive) {
      return res.status(401).json({ detail: 'Account not verified' })
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      username: user.username,
      role: payload.role,
    }

    next()
  } catch (error) {
    return res.status(401).json({ detail: 'Authentication failed' })
  }
}

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ detail: 'Authentication required' })
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ detail: 'Admin access required' })
  }

  next()
}
