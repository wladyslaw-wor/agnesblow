import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { siteConfig } from './siteConfig'
import './styles.css'

document.title = siteConfig.title
document.querySelector('meta[name="description"]')?.setAttribute('content', siteConfig.description)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)