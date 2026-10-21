const EARTH_RADIUS_KM = 6371
const ROUTE_ALLOWANCE = 1.3
const BASE_FARE = 3.5
const PER_KM_RATE = 1.65
export const MAX_TRIP_DISTANCE_KM = 500

export function isCoordinatePair(value) {
  return Array.isArray(value)
    && value.length === 2
    && Number.isFinite(value[0])
    && Number.isFinite(value[1])
    && value[0] >= -90 && value[0] <= 90
    && value[1] >= -180 && value[1] <= 180
}

export function estimateFare(pickupCoords, destinationCoords) {
  const [lat1, lon1] = pickupCoords
  const [lat2, lon2] = destinationCoords
  const radians = (degrees) => degrees * Math.PI / 180
  const deltaLat = radians(lat2 - lat1)
  const deltaLon = radians(lon2 - lon1)
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(deltaLon / 2) ** 2
  const straightLineKm = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  const distanceKm = Math.max(0.5, Math.round(straightLineKm * ROUTE_ALLOWANCE * 10) / 10)
  const fare = Math.round((BASE_FARE + distanceKm * PER_KM_RATE) * 100) / 100
  return { distanceKm, fare }
}
