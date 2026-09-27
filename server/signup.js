import { google } from 'googleapis'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 5
const requestCounts = new Map()

function getServiceAccount() {
  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!rawCredentials) return null

  try {
    return JSON.parse(rawCredentials)
  } catch {
    throw new Error('Google service account credentials are not valid JSON')
  }
}

function isRateLimited(ipAddress) {
  const now = Date.now()
  const recentRequests = (requestCounts.get(ipAddress) ?? []).filter((time) => now - time < WINDOW_MS)
  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    requestCounts.set(ipAddress, recentRequests)
    return true
  }
  recentRequests.push(now)
  requestCounts.set(ipAddress, recentRequests)
  return false
}

export function createSignupHandler() {
  return async (request, response) => {
    if (isRateLimited(request.ip)) {
      return response.status(429).json({ ok: false })
    }

    const email = typeof request.body?.email === 'string' ? request.body.email.trim() : ''
    const honeypot = typeof request.body?.website === 'string' ? request.body.website : ''
    if (honeypot) return response.status(400).json({ ok: false })
    if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
      return response.status(400).json({ ok: false })
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_ID
    const sheetTab = process.env.GOOGLE_SHEETS_TAB
    let credentials
    try {
      credentials = getServiceAccount()
    } catch (error) {
      console.error(error)
      return response.status(503).json({ ok: false })
    }
    if (!spreadsheetId || !sheetTab || !credentials) {
      return response.status(503).json({ ok: false })
    }

    try {
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      })
      const sheets = google.sheets({ version: 'v4', auth })
      const range = `'${sheetTab.replaceAll("'", "''")}'!A:A`
      const existingRows = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range,
        valueRenderOption: 'UNFORMATTED_VALUE',
      })
      const exists = (existingRows.data.values ?? []).some(
        ([storedEmail]) => typeof storedEmail === 'string' && storedEmail.trim().toLowerCase() === email.toLowerCase(),
      )

      if (!exists) {
        await sheets.spreadsheets.values.append({
          spreadsheetId,
          range: `'${sheetTab.replaceAll("'", "''")}'!A:B`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            values: [[email, new Date().toISOString()]],
          },
        })
      }

      return response.status(200).json({ ok: true, duplicate: exists })
    } catch (error) {
      console.error('Google Sheets signup failed:', error)
      return response.status(503).json({ ok: false })
    }
  }
}