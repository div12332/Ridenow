import Ride from '../models/Ride.js'
import { estimateFare, isCoordinatePair, MAX_TRIP_DISTANCE_KM } from '../utils/fare.js'

function validRideInput(body) {
  return typeof body.pickup === 'string'
    && body.pickup.trim().length > 0 && body.pickup.trim().length <= 160
    && typeof body.destination === 'string'
    && body.destination.trim().length > 0 && body.destination.trim().length <= 160
    && isCoordinatePair(body.pickupCoords)
    && isCoordinatePair(body.destinationCoords)
}

function toCoordinates(pair) {
  return { lat: pair[0], lng: pair[1] }
}

export function getEstimate(req, res) {
  const { pickupCoords, destinationCoords } = req.body || {}
  if (!isCoordinatePair(pickupCoords) || !isCoordinatePair(destinationCoords)) {
    return res.status(400).json({ message: 'Choose valid pickup and destination points on the map.' })
  }
  const estimate = estimateFare(pickupCoords, destinationCoords)
  if (estimate.distanceKm > MAX_TRIP_DISTANCE_KM) {
    return res.status(400).json({ message: `Trips must be ${MAX_TRIP_DISTANCE_KM} km or shorter.` })
  }
  return res.json(estimate)
}

export async function createRide(req, res, next) {
  try {
    const body = req.body || {}
    if (!validRideInput(body)) {
      return res.status(400).json({ message: 'Enter valid pickup and destination names and select both map points.' })
    }
    const { pickup, destination, pickupCoords, destinationCoords } = body
    const estimate = estimateFare(pickupCoords, destinationCoords)
    if (estimate.distanceKm > MAX_TRIP_DISTANCE_KM) {
      return res.status(400).json({ message: `Trips must be ${MAX_TRIP_DISTANCE_KM} km or shorter.` })
    }
    const ride = await Ride.create({
      passenger: req.user.id,
      pickup: pickup.trim(),
      destination: destination.trim(),
      pickupCoords: toCoordinates(pickupCoords),
      destinationCoords: toCoordinates(destinationCoords),
      distanceKm: estimate.distanceKm,
      estimatedFare: estimate.fare,
    })
    return res.status(201).json({ ride })
  } catch (error) {
    return next(error)
  }
}

export async function getMyRides(req, res, next) {
  try {
    const query = req.user.role === 'driver' ? { driver: req.user.id } : { passenger: req.user.id }
    const rides = await Ride.find(query)
      .populate('passenger', 'name')
      .populate('driver', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
    return res.json({ rides })
  } catch (error) {
    return next(error)
  }
}

export async function getDriverRides(req, res, next) {
  try {
    const rides = await Ride.find({
      $or: [{ status: 'requested' }, { driver: req.user.id, status: { $in: ['accepted', 'arrived', 'in_progress'] } }],
    })
      .populate('passenger', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
    return res.json({ rides })
  } catch (error) {
    return next(error)
  }
}

export async function acceptRide(req, res, next) {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, status: 'requested', driver: null },
      { $set: { status: 'accepted', driver: req.user.id } },
      { new: true, runValidators: true },
    ).populate('passenger', 'name')
    if (!ride) return res.status(409).json({ message: 'This ride is no longer available.' })
    return res.json({ ride })
  } catch (error) {
    return next(error)
  }
}

const nextStatuses = {
  accepted: ['arrived'],
  arrived: ['in_progress'],
  in_progress: ['completed'],
}

export async function updateRideStatus(req, res, next) {
  try {
    const { status } = req.body || {}
    const ride = await Ride.findOne({ _id: req.params.id, driver: req.user.id })
    if (!ride) return res.status(404).json({ message: 'Ride not found.' })
    if (!nextStatuses[ride.status]?.includes(status)) {
      return res.status(409).json({ message: `A ride cannot move from ${ride.status} to ${status}.` })
    }
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: ride.id, driver: req.user.id, status: ride.status },
      { $set: { status } },
      { new: true, runValidators: true },
    ).populate('passenger', 'name')
    if (!updatedRide) return res.status(409).json({ message: 'Ride status changed. Refresh and try again.' })
    return res.json({ ride: updatedRide })
  } catch (error) {
    return next(error)
  }
}

export async function cancelRide(req, res, next) {
  try {
    const ride = await Ride.findOneAndUpdate(
      { _id: req.params.id, passenger: req.user.id, status: 'requested' },
      { $set: { status: 'cancelled' } },
      { new: true, runValidators: true },
    )
    if (!ride) return res.status(409).json({ message: 'Only a ride awaiting a driver can be cancelled.' })
    return res.json({ ride })
  } catch (error) {
    return next(error)
  }
}
