const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/'
const MAX_QUERY_LENGTH = 120

export function normalizedLanguage(value) {
  const language = typeof value === 'string' ? value.split('-')[0].toLowerCase() : ''
  return ['de', 'en', 'fr'].includes(language) ? language : 'en'
}

export async function searchLocations(req, res) {
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  if (query.length < 3 || query.length > MAX_QUERY_LENGTH) {
    return res.status(400).json({ message: `Search text must be between 3 and ${MAX_QUERY_LENGTH} characters.` })
  }

  const parameters = new URLSearchParams({ q: query, limit: '6', lang: normalizedLanguage(req.query.lang) })
  try {
    const response = await fetch(`${PHOTON_ENDPOINT}?${parameters}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'RideNow/1.0 (address suggestions)',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!response.ok) {
      console.error(`Photon address search returned HTTP ${response.status}`)
      return res.status(response.status === 429 ? 503 : 502).json({
        message: 'Address search is temporarily unavailable. Try again or choose a point on the map.',
      })
    }
    const results = await response.json()
    return res.json(results)
  } catch (error) {
    console.error('Photon address search request failed:', error.message)
    const timedOut = error.name === 'TimeoutError' || error.name === 'AbortError'
    return res.status(timedOut ? 504 : 502).json({
      message: 'Address search is temporarily unavailable. Try again or choose a point on the map.',
    })
  }
}
