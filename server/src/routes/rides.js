import { Router } from 'express'
import {
  acceptRide, cancelRide, createRide, getDriverRides, getEstimate, getMyRides, updateRideStatus,
} from '../controllers/ridesController.js'
import { requireAuth, requireRole } from '../middleware/auth.js'

const router = Router()

router.post('/estimate', getEstimate)
router.post('/', requireAuth, requireRole('passenger'), createRide)
router.get('/mine', requireAuth, getMyRides)
router.get('/driver', requireAuth, requireRole('driver'), getDriverRides)
router.post('/:id/accept', requireAuth, requireRole('driver'), acceptRide)
router.patch('/:id/status', requireAuth, requireRole('driver'), updateRideStatus)
router.post('/:id/cancel', requireAuth, requireRole('passenger'), cancelRide)

export default router
