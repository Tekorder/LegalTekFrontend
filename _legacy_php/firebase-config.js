/**
 * LegalTek AI — Firebase configuration
 *
 * 1. Firebase Console → https://console.firebase.google.com → Create / open project
 * 2. Build → Authentication → Get started → enable "Email/Password" and "Google"
 * 3. Project settings (gear) → Your apps → Web (</>) → Register app → copy config here
 * 4. Authentication → Sign-in method → Google → enable + set support email
 *
 * This file is loaded BEFORE React (see index.html).
 */
(function () {
  var firebaseConfig = {
    apiKey:            'AIzaSyBOr6OyBlZwqWL6bzyH9yTntpC9cYyZ45Q',
    authDomain:        'youtask-3bf9b.firebaseapp.com',
    projectId:         'youtask-3bf9b',
    storageBucket:     'youtask-3bf9b.firebasestorage.app',
    messagingSenderId: '992755645262',
    appId:             '1:992755645262:web:a83c0524a505bff5fdbc1f',
  };

  window.firebaseAuth = null;

  if (typeof firebase === 'undefined') {
    console.warn('[LegalTek] Firebase SDK not loaded. Check index.html script order.');
    return;
  }

  try {
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    window.firebaseAuth = firebase.auth();
  } catch (e) {
    console.error('[LegalTek] Firebase init failed — edit fase3/firebase-config.js with your keys:', e);
  }
})();
