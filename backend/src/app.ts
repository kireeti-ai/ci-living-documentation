import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import usersRoutes from './routes/users.js'
import projectsRoutes from './routes/projects.js'
import invitationsRoutes from './routes/invitations.js'
import documentsRoutes from './routes/documents.js'
import webhooksRoutes from './routes/webhooks.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 8000

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))
app.use(express.json())

// Routes
app.use('/auth', authRoutes)
app.use('/users', usersRoutes)
app.use('/projects', projectsRoutes)
app.use('/invitations', invitationsRoutes)
app.use('/projects', documentsRoutes)
app.use('/webhooks', webhooksRoutes)

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err)
  res.status(err.status || 500).json({
    detail: err.message || 'Internal server error',
  })
})

// 404 handler
app.use((req, res) => {
  res.status(404).json({ detail: 'Not found' })
})

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})

export default app
