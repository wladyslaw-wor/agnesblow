import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const EMAIL_PATTERN = /^[A-Z0-9][A-Z0-9.!#$%&'*+/=?^_`{|}~-]{0,63}@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i
const WINDOW_MS = 15 * 60 * 1000
const MAX_REQUESTS_PER_WINDOW = 5
const requestCounts = new Map()
const CSV_HEADER = 'email,subscribed_at_utc\n'

function quoteCsv(value) {
  return `"${String(value).replaceAll('"', '""')}"`
}

function parseCsvRows(contents) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false

  for (let index = 0; index < contents.length; index += 1) {
    const character = contents[index]
    if (quoted) {
      if (character === '"' && contents[index + 1] === '"') {
        field += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        field += character
      }
    } else if (character === '"' && field.length === 0) {
      quoted = true
    } else if (character === ',') {
      row.push(field)
      field = ''
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''))
      rows.push(row)
      row = []
      field = ''
    } else {
      field += character
    }
  }

  if (field.length > 0 || row.length > 0) rows.push([...row, field])
  return rows
}

async function readCsv(filePath) {
  try {
    return await readFile(filePath, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return ''
    throw error
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

export function createSignupHandler({ filePath = path.resolve('data/signups.csv') } = {}) {
  let writeQueue = Promise.resolve()

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

    try {
      const saveTask = writeQueue.then(async () => {
        await mkdir(path.dirname(filePath), { recursive: true })
        let contents = await readCsv(filePath)
        if (!contents) {
          await writeFile(filePath, CSV_HEADER, { encoding: 'utf8', flag: 'wx', mode: 0o640 }).catch((error) => {
            if (error.code !== 'EEXIST') throw error
          })
          contents = await readFile(filePath, 'utf8')
        }

        const exists = parseCsvRows(contents).slice(1).some(
          ([storedEmail]) => storedEmail?.trim().toLowerCase() === email.toLowerCase(),
        )
        if (!exists) {
          await appendFile(filePath, `${quoteCsv(email)},${quoteCsv(new Date().toISOString())}\n`, {
            encoding: 'utf8',
            mode: 0o640,
          })
        }
        return exists
      })
      writeQueue = saveTask.catch(() => {})
      const exists = await saveTask

      return response.status(200).json({ ok: true, duplicate: exists })
    } catch (error) {
      console.error('CSV signup write failed:', error)
      return response.status(500).json({ ok: false })
    }
  }
}

export function createCsvHandler({ filePath = path.resolve('data/signups.csv') } = {}) {
  return async (_request, response) => {
    try {
      const contents = (await readCsv(filePath)) || CSV_HEADER
      response.set({
        'Cache-Control': 'no-store',
        'Content-Disposition': 'inline; filename="signups.csv"',
        'X-Robots-Tag': 'noindex, nofollow',
      })
      return response.type('text/csv').send(contents)
    } catch (error) {
      console.error('CSV signup read failed:', error)
      return response.status(500).type('text/plain').send('Unable to read signup list.')
    }
  }
}