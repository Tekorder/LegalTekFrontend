'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — lib/firebase.js
   Was firebase-config.js + the compat CDN scripts in index.html.

   Now the modular ("v9+") SDK from npm. Keys come from NEXT_PUBLIC_FIREBASE_*
   in .env.local — they are public by design (Firebase gates access with
   security rules and authorized domains, not with the API key), but keeping
   them in env means dev / staging / prod can point at different projects.

   Setup:
   1. Firebase Console → https://console.firebase.google.com → create/open project
   2. Build → Authentication → Get started → enable "Email/Password" and "Google"
   3. Project settings → Your apps → Web (</>) → copy the config into .env.local
   4. Authentication → Settings → Authorized domains → add your Next.js host
═══════════════════════════════════════════════ */

import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** False when .env.local is missing keys — LoginPage shows a setup notice. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let cachedAuth = null;

/**
 * Auth instance, or null on the server / when unconfigured.
 *
 * Built lazily instead of at module scope: this module is imported by client
 * components, and Next still renders those once on the server, where
 * getAuth() has no browser persistence to attach to.
 */
export function getFirebaseAuth() {
  if (typeof window === 'undefined') return null;
  if (!isFirebaseConfigured) {
    console.warn('[LegalTek] Firebase env vars missing — see .env.local.example');
    return null;
  }
  if (cachedAuth) return cachedAuth;

  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    cachedAuth = getAuth(app);
    return cachedAuth;
  } catch (e) {
    console.error('[LegalTek] Firebase init failed:', e);
    return null;
  }
}

/** Google provider, pre-set to always show the account chooser. */
export function makeGoogleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return provider;
}

/** Sign out — safe to call when Firebase never initialised. */
export function signOutUser() {
  const auth = getFirebaseAuth();
  if (auth) return signOut(auth);
  return Promise.resolve();
}
