export const siteConfig = {
  title: 'Coming Soon',
  description: 'Get notified when we go online.',
  copy: {
    heading: 'GET NOTIFIED WHEN WE GO ONLINE',
    emailLabel: 'Email address',
    emailPlaceholder: 'Email address',
    submit: 'Notify me →',
    submitting: 'Submitting…',
    success: "You're on the list.",
    invalidEmail: 'Please enter a valid email address.',
    error: 'Something went wrong. Please try again.',
  },
  assets: {
    background: '/assets/backdrop.jpg',
    logo: '/assets/logo.png',
    logoAlt: 'Agnes Blow',
  },
  appearance: {
    font: 'IBM Plex Mono, ui-monospace, monospace',
    desktopImagePosition: '50% 26%',
    mobileImagePosition: '50% 26%',
    desktopLogoWidth: 'min(40vw, 780px)',
    mobileLogoWidth: 'min(82vw, 420px)',
    contentWidth: '600px',
  },
} as const