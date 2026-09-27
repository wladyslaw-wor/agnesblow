import 'dotenv/config'
import express from 'express'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { createSignupHandler } from './signup.js'

const app = express()
const port = Number(process.env.PORT) || 3001
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

app.disable('x-powered-by')
app.use(express.json({ limit: '10kb' }))
app.post('/api/signup', createSignupHandler())

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(projectRoot, 'dist'), { index: false, maxAge: '1h' }))
  app.get('*path', (_request, response) => response.sendFile(path.join(projectRoot, 'dist', 'index.html')))
}

app.listen(port, () => {
  console.log(`Signup server listening on http://localhost:${port}`)
})