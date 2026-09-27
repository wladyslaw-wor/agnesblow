import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import express from 'express'
import { createCsvHandler, createSignupHandler } from './signup.js'

const testDirectory = mkdtempSync(path.join(tmpdir(), 'agnesblow-signups-'))
const csvPath = path.join(testDirectory, 'signups.csv')
const app = express()
app.use(express.json())
app.get('/signups.csv', createCsvHandler({ filePath: csvPath }))
app.post('/api/signup', createSignupHandler({ filePath: csvPath }))

let server
let baseUrl

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
  rmSync(testDirectory, { recursive: true, force: true })
})

async function submit(payload) {
  return fetch(`${baseUrl}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

test('rejects an invalid email on the server', async () => {
  const response = await submit({ email: 'not-an-email' })
  assert.equal(response.status, 400)
})

test('rejects a filled honeypot without claiming success', async () => {
  const response = await submit({ email: 'person@example.com', website: 'bot-value' })
  assert.equal(response.status, 400)
  assert.deepEqual(await response.json(), { ok: false })
})

test('appends a valid address once and treats concurrent repeats as duplicates', async () => {
  const responses = await Promise.all([
    submit({ email: ' person@example.com ' }),
    submit({ email: 'PERSON@example.com' }),
  ])
  const results = await Promise.all(responses.map((response) => response.json()))
  assert.ok(responses.every((response) => response.status === 200))
  assert.equal(results.filter((result) => result.duplicate === false).length, 1)
  assert.equal(results.filter((result) => result.duplicate === true).length, 1)

  const rows = readFileSync(csvPath, 'utf8').trim().split('\n')
  assert.equal(rows.length, 2)
  assert.equal(rows[0], 'email,subscribed_at_utc')
  assert.match(rows[1], /^"person@example\.com","\d{4}-\d\d-\d\dT.*Z"$/i)
})

test('serves the accumulated CSV at the public direct URL', async () => {
  const response = await fetch(`${baseUrl}/signups.csv`)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-type'), /text\/csv/)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.match(await response.text(), /person@example\.com/i)
})