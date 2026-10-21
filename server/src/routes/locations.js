import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { searchLocations } from '../controllers/locationsController.js'

const router = Router()

router.get('/search', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
}), searchLocations)

export default router
