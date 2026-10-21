import assert from 'node:assert/strict'
import test from 'node:test'
import { formatPhotonFeature, parsePhotonResults } from './geocoding.js'

test('formats a Photon result and converts longitude-latitude to map order', () => {
  assert.deepEqual(formatPhotonFeature({
    properties: { name: 'Connaught Place', city: 'New Delhi', state: 'Delhi', country: 'India' },
    geometry: { coordinates: [77.2193804, 28.6317695] },
  }), {
    label: 'Connaught Place, New Delhi, Delhi, India',
    coordinates: [28.6317695, 77.2193804],
  })
})

test('formats street addresses without a place name', () => {
  assert.deepEqual(formatPhotonFeature({
    properties: { housenumber: '10', street: 'Downing Street', city: 'London', country: 'United Kingdom' },
    geometry: { coordinates: [-0.1276, 51.5034] },
  }), {
    label: '10 Downing Street, London, United Kingdom',
    coordinates: [51.5034, -0.1276],
  })
})

test('filters malformed geocoder results', () => {
  assert.equal(formatPhotonFeature({ properties: { name: 'No coordinates' } }), null)
  assert.equal(formatPhotonFeature({
    properties: { name: 'Out of range' },
    geometry: { coordinates: [200, 91] },
  }), null)
  assert.deepEqual(parsePhotonResults({ features: [{ properties: { name: 'Missing geometry' } }] }), [])
  assert.deepEqual(parsePhotonResults(null), [])
})
