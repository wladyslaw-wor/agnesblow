import { FormEvent, useState } from 'react'
import { siteConfig } from './siteConfig'

type SubmissionState = 'idle' | 'submitting' | 'success' | 'invalid' | 'error'

const emailPattern = /^[A-Z0-9][A-Z0-9.!#$%&'*+/=?^_`{|}~-]{0,63}@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i

function App() {
  const [email, setEmail] = useState('')
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const [pointer, setPointer] = useState({ x: 50, y: 36 })

  const message = {
    invalid: siteConfig.copy.invalidEmail,
    error: siteConfig.copy.error,
  }[submissionState as 'invalid' | 'error']

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submissionState === 'submitting') return

    const formData = new FormData(event.currentTarget)
    const trimmedEmail = email.trim()
    if (!emailPattern.test(trimmedEmail)) {
      setSubmissionState('invalid')
      return
    }

    setSubmissionState('submitting')
    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: trimmedEmail,
          website: formData.get('website'),
        }),
      })
      if (!response.ok) throw new Error('Signup request failed')
      const result: { ok?: boolean } = await response.json()
      if (!result.ok) throw new Error('Signup was not confirmed')
      setEmail('')
      setSubmissionState('success')
    } catch {
      setSubmissionState('error')
    }
  }

  return (
    <main
      className="page-shell"
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const x = ((event.clientX - rect.left) / rect.width) * 100
        const y = ((event.clientY - rect.top) / rect.height) * 100
        setPointer({ x, y })
      }}
      onMouseLeave={() => setPointer({ x: 50, y: 36 })}
      style={{
        '--site-font': siteConfig.appearance.font,
        '--pointer-x': `${pointer.x}%`,
        '--pointer-y': `${pointer.y}%`,
        '--desktop-image-position': siteConfig.appearance.desktopImagePosition,
        '--mobile-image-position': siteConfig.appearance.mobileImagePosition,
        '--desktop-logo-width': siteConfig.appearance.desktopLogoWidth,
        '--mobile-logo-width': siteConfig.appearance.mobileLogoWidth,
        '--content-width': siteConfig.appearance.contentWidth,
      } as React.CSSProperties}
    >
      <div className="background-layer" aria-hidden="true">
        <img className="background-image" src={siteConfig.assets.background} alt="" fetchPriority="high" />
        <div className="spotlight" />
        <div className="vignette" />
        <div className="grain" />
      </div>

      <header className="topbar">
        <a href="#" className="brand-mark" aria-label="Agnes Blow home">
          AB
        </a>
        <div className="status-pill">
          <span className="dot" aria-hidden="true" />
          <span>Coming soon</span>
        </div>
      </header>

      <div className="content-shell">
        <h1 className="sr-only">{siteConfig.copy.heading}</h1>
        <img className="brand-logo" src={siteConfig.assets.logo} alt={siteConfig.assets.logoAlt} />

        <div className="form-row">
          {submissionState === 'success' ? (
            <div className="success-text" role="status" aria-live="polite">
              {siteConfig.copy.success}
            </div>
          ) : (
            <form className="signup-form" onSubmit={handleSubmit} noValidate>
              <label className="visually-hidden" htmlFor="email-address">
                {siteConfig.copy.emailLabel}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder={siteConfig.copy.emailPlaceholder}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (submissionState !== 'submitting') setSubmissionState('idle')
                }}
                aria-invalid={submissionState === 'invalid'}
                aria-describedby={message ? 'form-message' : undefined}
                required
              />
              <div className="honeypot" aria-hidden="true">
                <label htmlFor="website">Leave this field empty</label>
                <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
              </div>
              <button type="submit" disabled={submissionState === 'submitting'}>
                {submissionState === 'submitting' ? siteConfig.copy.submitting : siteConfig.copy.submit}
              </button>
            </form>
          )}
        </div>

        {message && submissionState !== 'success' && (
          <p
            id="form-message"
            className="form-message"
            role={submissionState === 'invalid' || submissionState === 'error' ? 'alert' : 'status'}
            aria-live={submissionState === 'invalid' || submissionState === 'error' ? 'assertive' : 'polite'}
          >
            {message}
          </p>
        )}
      </div>
    </main>
  )
}

export default App