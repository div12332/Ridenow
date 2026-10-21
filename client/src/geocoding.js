export function formatPhotonFeature(feature) {
  const properties = feature?.properties || {}
  const primary = properties.name
    || [properties.housenumber, properties.street].filter(Boolean).join(' ')
    || properties.street
    || properties.city
  if (!primary || !Array.isArray(feature?.geometry?.coordinates)) return null

  const context = [
    properties.city || properties.locality || properties.district,
    properties.state,
    properties.country,
  ].filter((part, index, parts) => part && part !== primary && parts.indexOf(part) === index)
  const [longitude, latitude] = feature.geometry.coordinates
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)
    || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null

  return {
    label: [primary, context.join(', ')].filter(Boolean).join(', '),
    coordinates: [latitude, longitude],
  }
}

export function parsePhotonResults(payload) {
  if (!Array.isArray(payload?.features)) return []
  return payload.features
    .map(formatPhotonFeature)
    .filter(Boolean)
}
