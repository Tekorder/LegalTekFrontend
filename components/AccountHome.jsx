'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/AccountHome.jsx
   Account settings: profile (read-only) + change password
═══════════════════════════════════════════════ */

import { useState } from 'react';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from 'firebase/auth';

import { getFirebaseAuth } from '@/lib/firebase';
import { Ico, Spinner } from '@/lib/icons';

function mapAccountAuthError(code) {
  const map = {
    'auth/wrong-password':        'Current password is incorrect.',
    'auth/weak-password':         'New password should be at least 6 characters.',
    'auth/requires-recent-login': 'Please sign out and sign in again before changing your password.',
    'auth/too-many-requests':     'Too many attempts. Try again later.',
  };
  return map[code] || code || 'Could not update password.';
}

function AccountHome() {
  const currentUser = getFirebaseAuth()?.currentUser ?? null;

  const providers          = currentUser?.providerData?.map(p => p.providerId) || [];
  const hasPasswordProvider = providers.includes('password');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const [success,     setSuccess]     = useState(null);
  const [validateMsg, setValidateMsg] = useState(null);

  async function handleChangePassword(e) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentUser) { setError('No active session.'); return; }
    if (newPassword.length < 6) { setError('New password should be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }

    setSaving(true);
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      setSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(mapAccountAuthError(err.code));
    } finally {
      setSaving(false);
    }
  }

  function handleValidateAccount() {
    setValidateMsg('Account validation isn’t available yet — coming in a future update.');
  }

  return (
    <div className="h-full flex flex-col animated-bg overflow-hidden" style={{ color: '#1a1a2e' }}>

      {/* Header */}
      <header className="glass flex-shrink-0 px-8 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <h2 className="font-semibold text-lg" style={{ color: '#0d1b2a' }}>Account</h2>
        <p className="text-gray-400 text-xs mt-0.5">Manage your profile and security</p>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-lg flex flex-col gap-6">

          {/* Profile */}
          <section className="glass rounded-lg p-6" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: '#0d1b2a' }}>
              <Ico name="users" size={15} stroke="#d4af37" />
              Profile
            </h3>

            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                  Name
                </label>
                <div
                  className="w-full px-4 py-2.5 rounded-lg text-sm"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#374151' }}>
                  {currentUser?.displayName || '—'}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                  Email
                </label>
                <div
                  className="w-full px-4 py-2.5 rounded-lg text-sm"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#374151' }}>
                  {currentUser?.email || '—'}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-5" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
              <button
                type="button"
                onClick={handleValidateAccount}
                className="px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                style={{ border: '1px solid rgba(13,27,42,0.14)', color: '#0d1b2a' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(13,27,42,0.14)'; }}>
                <Ico name="shield" size={14} stroke="currentColor" />
                Validate Account
              </button>
              {validateMsg && (
                <p className="text-xs mt-2" style={{ color: '#9ca3af' }}>{validateMsg}</p>
              )}
            </div>
          </section>

          {/* Change password */}
          <section className="glass rounded-lg p-6" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#0d1b2a' }}>
              <Ico name="settings" size={15} stroke="#d4af37" />
              Change Password
            </h3>

            {!hasPasswordProvider ? (
              <p className="text-sm mt-3" style={{ color: '#6b7280' }}>
                Your account is signed in with Google. Password changes aren't available for Google accounts.
              </p>
            ) : (
              <form onSubmit={handleChangePassword} className="flex flex-col gap-3 mt-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                    Current password
                  </label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                    New password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                    Confirm new password
                  </label>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
                    placeholder="••••••••"
                  />
                </div>

                {error   && <p className="text-sm text-red-600 px-1">{error}</p>}
                {success && <p className="text-sm px-1" style={{ color: '#059669' }}>{success}</p>}

                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 mt-1">
                  {saving ? <><Spinner size={14} /> Updating…</> : 'Update Password'}
                </button>
              </form>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default AccountHome;
