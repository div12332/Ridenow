import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateFare, isCoordinatePair } from './fare.js'

test('accepts valid latitude and longitude pairs', () => {
  assert.equal(isCoordinatePair([37.7749, -122.4194]), true)
  assert.equal(isCoordinatePair([-90, 180]), true)
  assert.equal(isCoordinatePair([91, 0]), false)
  assert.equal(isCoordinatePair([0, -181]), false)
  assert.equal(isCoordinatePair([0]), false)
  assert.equal(isCoordinatePair(['0', '0']), false)
})

test('returns the minimum estimated trip distance and a positive fare for colocated points', () => {
  assert.deepEqual(estimateFare([0, 0], [0, 0]), { distanceKm: 0.5, fare: 4.33 })
})

test('applies the documented route allowance to straight-line distance', () => {
  const result = estimateFare([0, 0], [0, 1])
  assert.equal(result.distanceKm, 144.6)
  assert.equal(result.fare, 242.09)
})
