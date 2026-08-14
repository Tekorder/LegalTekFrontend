/* ═══════════════════════════════════════════════
   LegalTek AI — app/layout.jsx
   Replaces index.html. Fonts, global CSS and the #app-root shell that
   global.css sizes to 100% height (was #root).
═══════════════════════════════════════════════ */

import './globals.css';

export const metadata = {
  title: 'LegalTek AI — Legal Assistant',
  description: 'Intelligent legal analysis: cases, clients, documents, hearings and billing.',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Inter over a plain <link>, same as index.html did — not next/font.
            next/font downloads the .woff2 at BUILD time, so a build machine
            without access to fonts.gstatic.com fails outright; this just falls
            back to system-ui until the stylesheet lands. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div id="app-root">{children}</div>
      </body>
    </html>
  );
}
