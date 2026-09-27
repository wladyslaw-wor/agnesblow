export const siteConfig = {
  title: 'Coming Soon',
  description: 'Get notified when we go online.',
  copy: {
    heading: 'GET NOTIFIED WHEN WE GO ONLINE',
    emailLabel: 'Email address',
    emailPlaceholder: 'Email address',
    submit: 'NOTIFY ME',
    submitting: 'SUBMITTING…',
    success: "You’re on the list. We’ll let you know when we go online.",
    invalidEmail: 'Please enter a valid email address.',
    error: 'Something went wrong. Please try again.',
    publicListNotice: 'Email addresses and signup dates are publicly listed.',
    publicListLink: 'View list',
  },
  assets: {
    background: '/assets/background.avif',
    logo: '/assets/logo.webp',
    logoAlt: 'Designer logo',
  },
  appearance: {
    font: 'Helvetica Neue, Helvetica, Arial, sans-serif',
    desktopImagePosition: '44% center',
    mobileImagePosition: '39% center',
    desktopLogoWidth: '156px',
    mobileLogoWidth: '128px',
    contentWidth: '360px',
  },
} as const