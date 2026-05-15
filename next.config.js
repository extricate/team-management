/** @type {import('next').NextConfig} */
const { version } = require('./package.json')

const csp = [
  "default-src 'self'",
  // 'unsafe-inline' required for Next.js App Router RSC streaming scripts and styled-jsx
  // 'unsafe-eval' required by React in development mode for call-stack reconstruction
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV !== 'production' ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Content-Security-Policy', value: csp },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
];

const nextConfig = {
  output: "standalone",
  serverExternalPackages: ["postgres"],
  env: {
    APP_VERSION: version,
  },
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};

module.exports = nextConfig;