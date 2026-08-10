/* ═══════════════════════════════════════════════
   LegalTek AI — LoginPage.jsx
   Firebase Auth: Email/Password + Google
   Visual: navy · parchment · gold (matches fase3)
═══════════════════════════════════════════════ */

const { useState } = React;
const { Spinner } = window;

function LoginPage() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const auth = window.firebaseAuth;
  const firebaseReady = !!auth;

  function mapAuthError(code) {
    const map = {
      'auth/invalid-email':           'Invalid email address.',
      'auth/user-disabled':           'This account has been disabled.',
      'auth/user-not-found':          'No account found with this email.',
      'auth/wrong-password':          'Incorrect password.',
      'auth/email-already-in-use':    'This email is already registered.',
      'auth/weak-password':           'Password should be at least 6 characters.',
      'auth/popup-closed-by-user':    'Sign-in was cancelled.',
      'auth/account-exists-with-different-credential':
        'An account already exists with this email using a different sign-in method.',
    };
    return map[code] || code || 'Authentication failed.';
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!firebaseReady) {
      setError('Firebase is not configured. Edit firebase-config.js with your project keys.');
      return;
    }
    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'register') {
        await auth.createUserWithEmailAndPassword(email.trim(), password);
      } else {
        await auth.signInWithEmailAndPassword(email.trim(), password);
      }
    } catch (err) {
      setError(mapAuthError(err.code));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    if (!firebaseReady) {
      setError('Firebase is not configured. Edit firebase-config.js with your project keys.');
      return;
    }
    setLoading(true);
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await auth.signInWithPopup(provider);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(mapAuthError(err.code));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full w-full animated-bg flex items-center justify-center p-6 overflow-y-auto">
      <div
        className="glass w-full max-w-[420px] rounded-lg p-8 flex flex-col gap-6"
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.1)',
        }}>

        {/* Brand */}
        <div className="text-center">
          <div
            className="w-14 h-14 mx-auto rounded-lg flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, rgba(13,27,42,0.95), rgba(26,58,92,0.9))',
              border: '1px solid rgba(212,175,55,0.35)',
              boxShadow: '0 4px 20px rgba(13,27,42,0.15)',
            }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: '#0d1b2a' }}>LegalTek AI</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Sign in to continue</p>
        </div>

        {!firebaseReady && (
          <div
            className="text-sm px-3 py-2.5 rounded-lg"
            style={{
              background: 'rgba(180,83,9,0.08)',
              border: '1px solid rgba(180,83,9,0.25)',
              color: '#92400e',
            }}>
            <strong className="block mb-1">Firebase not configured</strong>
            Add your Firebase keys in <code className="text-xs bg-white/50 px-1 rounded">fase3/firebase-config.js</code> and reload.
          </div>
        )}

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading || !firebaseReady}
          className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(13,27,42,0.12)',
            color: '#374151',
          }}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.1)' }} />
          <span className="text-[11px] uppercase tracking-wider" style={{ color: '#9ca3af' }}>or email</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(0,0,0,0.1)' }} />
        </div>

        {/* Toggle */}
        <div className="flex rounded-lg p-0.5" style={{ background: 'rgba(13,27,42,0.06)' }}>
          <button
            type="button"
            onClick={() => { setMode('signin'); setError(null); }}
            className="flex-1 py-2 text-xs font-semibold rounded-md transition-all"
            style={{
              background: mode === 'signin' ? '#fff' : 'transparent',
              color: mode === 'signin' ? '#0d1b2a' : '#6b7280',
              boxShadow: mode === 'signin' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            Sign in
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError(null); }}
            className="flex-1 py-2 text-xs font-semibold rounded-md transition-all"
            style={{
              background: mode === 'register' ? '#fff' : 'transparent',
              color: mode === 'register' ? '#0d1b2a' : '#6b7280',
              boxShadow: mode === 'register' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}>
            Create account
          </button>
        </div>

        <form onSubmit={handleEmailSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'rgba(13,27,42,0.55)' }}>Email</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all chat-input"
              style={{ border: '1px solid rgba(13,27,42,0.14)' }}
              placeholder="you@firm.com"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1" style={{ color: 'rgba(13,27,42,0.55)' }}>Password</label>
            <input
              type="password"
              autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all chat-input"
              style={{ border: '1px solid rgba(13,27,42,0.14)' }}
              placeholder="••••••••"
            />
          </div>
          {mode === 'register' && (
            <div>
              <label className="block text-[11px] font-semibold mb-1" style={{ color: 'rgba(13,27,42,0.55)' }}>Confirm password</label>
              <input
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none transition-all chat-input"
                style={{ border: '1px solid rgba(13,27,42,0.14)' }}
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 px-1">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !firebaseReady}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50">
            {loading ? <Spinner size={16} /> : null}
            {mode === 'register' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-[11px]" style={{ color: '#9ca3af' }}>
          Protected access. Legal documents are confidential.
        </p>
      </div>
    </div>
  );
}

window.LoginPage = LoginPage;
