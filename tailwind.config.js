/**
 * LegalTek AI — Tailwind config
 * Ported from the inline `tailwind.config` that index.html handed to the CDN build.
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    /* Tighter border radius — legal/professional feel */
    borderRadius: {
      none: '0px',
      sm: '3px',
      DEFAULT: '4px',
      md: '5px',
      lg: '7px',
      xl: '9px',
      '2xl': '11px',
      '3xl': '14px',
      full: '9999px',
    },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
