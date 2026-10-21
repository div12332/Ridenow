import mongoose from 'mongoose'

const coordinateSchema = new mongoose.Schema({
  lat: { type: Number, required: true, min: -90, max: 90 },
  lng: { type: Number, required: true, min: -180, max: 180 },
}, { _id: false })

const rideSchema = new mongoose.Schema({
  passenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  pickup: { type: String, required: true, trim: true, maxlength: 160 },
  destination: { type: String, required: true, trim: true, maxlength: 160 },
  pickupCoords: { type: coordinateSchema, required: true },
  destinationCoords: { type: coordinateSchema, required: true },
  distanceKm: { type: Number, required: true, min: 0.1, max: 500 },
  estimatedFare: { type: Number, required: true, min: 1, max: 10000 },
  status: {
    type: String,
    enum: ['requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled'],
    default: 'requested',
    index: true,
  },
}, { timestamps: true })

rideSchema.index({ status: 1, createdAt: -1 })

export default mongoose.model('Ride', rideSchema)
