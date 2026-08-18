/**
 * LegalTek AI — Next.js config
 *
 * The browser calls a same-origin path (NEXT_PUBLIC_API_URL, default "/api")
 * and Next proxies it to the Express backend. Same origin means no CORS setup,
 * no preflight on uploads, and the backend URL stays out of the client bundle —
 * change BACKEND_URL and restart, no rebuild needed.
 *
 * To call Express directly instead (separate deploys, CDN in front of Next),
 * set NEXT_PUBLIC_API_URL to its absolute URL and enable cors() over there.
 */

const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async rewrites() {
    return [
      // Bare "/api?action=…" — the shape lib/api.js calls.
      { source: '/api', destination: `${BACKEND_URL}/api` },
      { source: '/api/:path*', destination: `${BACKEND_URL}/api/:path*` },
      // Uploaded .docx files served off the backend's uploads/ directory.
      { source: '/uploads/:path*', destination: `${BACKEND_URL}/uploads/:path*` },
    ];
  },
};

export default nextConfig;
