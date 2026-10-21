import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import app from './app.js'
import { normalizedLanguage } from './controllers/locationsController.js'

let server
let baseUrl

before(async () => {
  server = app.listen(0)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}/api`
})

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve())
  })
})

async function post(path, body, headers = {}) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

test('health endpoint responds without connecting to MongoDB', async () => {
  const response = await fetch(`${baseUrl}/health`)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { status: 'ok' })
  assert.equal(response.headers.get('cache-control'), 'no-store')
})

test('fare estimate accepts valid coordinate pairs and returns server-calculated fare', async () => {
  const response = await post('/rides/estimate', {
    pickupCoords: [37.7749, -122.4194],
    destinationCoords: [37.7849, -122.4094],
  })
  assert.equal(response.status, 200)
  const estimate = await response.json()
  assert.equal(typeof estimate.distanceKm, 'number')
  assert.equal(typeof estimate.fare, 'number')
  assert.ok(estimate.distanceKm > 0)
})

test('address search validates its query without calling the provider', async () => {
  const response = await fetch(`${baseUrl}/locations/search?q=ab`)
  assert.equal(response.status, 400)
  assert.match((await response.json()).message, /between 3 and 120 characters/)
})

test('address search maps browser locales to Photon-supported languages', () => {
  assert.equal(normalizedLanguage('en-US'), 'en')
  assert.equal(normalizedLanguage('fr-CA'), 'fr')
  assert.equal(normalizedLanguage('de-DE'), 'de')
  assert.equal(normalizedLanguage('hi-IN'), 'en')
  assert.equal(normalizedLanguage(undefined), 'en')
})

test('fare estimate rejects invalid and unsupported trip coordinates', async () => {
  const invalid = await post('/rides/estimate', {
    pickupCoords: [91, 0],
    destinationCoords: [0, 0],
  })
  assert.equal(invalid.status, 400)

  const tooLong = await post('/rides/estimate', {
    pickupCoords: [0, 0],
    destinationCoords: [0, 180],
  })
  assert.equal(tooLong.status, 400)
  assert.match((await tooLong.json()).message, /500 km/)
})

test('authentication rejects invalid input before requiring MongoDB', async () => {
  const signup = await post('/auth/signup', {})
  assert.equal(signup.status, 400)
  assert.match((await signup.json()).message, /Name/)

  const login = await post('/auth/login', {})
  assert.equal(login.status, 400)
  assert.match((await login.json()).message, /email and password/)
})

test('malformed JSON returns a client error instead of an internal server error', async () => {
  const response = await post('/rides/estimate', '{')
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { message: 'Request body contains invalid JSON.' })
})

test('protected ride history rejects missing or invalid bearer tokens', async () => {
  const missingToken = await fetch(`${baseUrl}/rides/mine`)
  assert.equal(missingToken.status, 401)

  const invalidToken = await fetch(`${baseUrl}/rides/mine`, {
    headers: { Authorization: 'Bearer invalid-token' },
  })
  assert.equal(invalidToken.status, 401)
})
