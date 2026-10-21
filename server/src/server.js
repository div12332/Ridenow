import 'dotenv/config'
import app from './app.js'
import { connectDatabase } from './config/db.js'

const { PORT = 5000, MONGODB_URI, JWT_SECRET } = process.env

if (!MONGODB_URI) throw new Error('MONGODB_URI is required. Copy server/.env.example to server/.env and configure it.')
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET must be configured and at least 32 characters long.')

await connectDatabase(MONGODB_URI)
app.listen(PORT, () => console.info(`RideNow API listening on port ${PORT}`))
