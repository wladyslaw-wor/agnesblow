import { FormEvent, useState } from 'react'
import { siteConfig } from './siteConfig'

type SubmissionState = 'idle' | 'submitting' | 'success' | 'invalid' | 'error'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function App() {
  const [email, setEmail] = useState('')
  const [submissionState, setSubmissionState] = useState<SubmissionState>('idle')
  const message = {
    success: siteConfig.copy.success,
    invalid: siteConfig.copy.invalidEmail,
    error: siteConfig.copy.error,
  }[submissionState as 'success' | 'invalid' | 'error']

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
      className="page"
      style={{
        '--site-font': siteConfig.appearance.font,
        '--desktop-image-position': siteConfig.appearance.desktopImagePosition,
        '--mobile-image-position': siteConfig.appearance.mobileImagePosition,
        '--desktop-logo-width': siteConfig.appearance.desktopLogoWidth,
        '--mobile-logo-width': siteConfig.appearance.mobileLogoWidth,
        '--content-width': siteConfig.appearance.contentWidth,
      } as React.CSSProperties}
    >
      <section className="image-panel" aria-label="Fashion portrait">
        <img className="background-image" src={siteConfig.assets.background} alt="" fetchPriority="high" />
      </section>
      <section className="signup-panel" aria-labelledby="signup-heading">
        <img className="logo" src={siteConfig.assets.logo} alt={siteConfig.assets.logoAlt} />
        <div className="signup-content">
          <h1 id="signup-heading">{siteConfig.copy.heading}</h1>
          <form onSubmit={handleSubmit} noValidate>
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
          <p
            id="form-message"
            className="form-message"
            role={submissionState === 'invalid' || submissionState === 'error' ? 'alert' : 'status'}
            aria-live={submissionState === 'invalid' || submissionState === 'error' ? 'assertive' : 'polite'}
          >
            {message ?? ''}
          </p>
        </div>
      </section>
    </main>
  )
}

export default App