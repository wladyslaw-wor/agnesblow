import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import express from 'express'
import { createSignupHandler } from './signup.js'

const app = express()
app.use(express.json())
app.post('/api/signup', createSignupHandler())

let server
let baseUrl

before(async () => {
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  delete process.env.GOOGLE_SHEETS_ID
  delete process.env.GOOGLE_SHEETS_TAB
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve)
  })
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
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

test('does not confirm a valid address until Sheets is configured', async () => {
  const response = await submit({ email: 'person@example.com' })
  assert.equal(response.status, 503)
  assert.deepEqual(await response.json(), { ok: false })
})