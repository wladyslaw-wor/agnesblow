import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createCsvHandler, createSignupHandler } from './signup.js'

const app = express()
const port = Number(process.env.PORT) || 3001
const host = process.env.HOST || '127.0.0.1'
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const signupsFile = path.resolve(process.env.SIGNUPS_FILE || path.join(projectRoot, 'data', 'signups.csv'))

app.disable('x-powered-by')
app.set('trust proxy', 'loopback')
app.use(express.json({ limit: '10kb' }))
app.get('/signups.csv', createCsvHandler({ filePath: signupsFile }))
app.post('/api/signup', createSignupHandler({ filePath: signupsFile }))

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(projectRoot, 'dist'), { index: false, maxAge: '1h' }))
  app.get('*path', (_request, response) => response.sendFile(path.join(projectRoot, 'dist', 'index.html')))
}

app.listen(port, host, () => {
  console.log(`Signup server listening on http://${host}:${port}`)
})