import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import authRoutes from './routes/auth.js'
import locationRoutes from './routes/locations.js'
import rideRoutes from './routes/rides.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app = express()
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist')

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({
  origin: process.env.CLIENT_ORIGIN?.split(',').map((origin) => origin.trim()) || 'http://localhost:5173',
}))
app.use(express.json({ limit: '20kb' }))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false }))
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store')
  next()
})
app.get('/api/health', (req, res) => res.json({ status: 'ok' }))
app.use('/api/auth', authRoutes)
app.use('/api/locations', locationRoutes)
app.use('/api/rides', rideRoutes)
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist, { index: false }))
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    return res.sendFile(path.join(clientDist, 'index.html'), (error) => {
      if (error) next(error)
    })
  })
}
app.use(notFound)
app.use(errorHandler)

export default app
