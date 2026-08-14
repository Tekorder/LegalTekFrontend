'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — app/page.jsx
   AUTH ROOT — Login lives HERE (before any case/chat UI)
   Was the Root component at the bottom of app.jsx.

   Client component on purpose: the whole app is Firebase-auth gated and
   localStorage-backed, so there is nothing to render on the server. The first
   server pass renders the spinner branch (ready === false) and hydration takes
   over from there.
═══════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

import { getFirebaseAuth, signOutUser } from '@/lib/firebase';
import { apiPost, setUserId, clearUserId } from '@/lib/api';
import { Spinner } from '@/lib/icons';

import LoginPage from '@/components/LoginPage';
import HomeSidebar from '@/components/HomeSidebar';
import CasesHome from '@/components/CasesHome';
import ClientsHome from '@/components/ClientsHome';
import AccountHome from '@/components/AccountHome';
import AppShell from '@/components/AppShell';

export default function Page() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState(null);
  /** Wait for users.sync_firebase + Personal workspace */
  const [backendSynced, setBackendSynced] = useState(false);
  const [personalCase, setPersonalCase] = useState(null);
  const [workspaceError, setWorkspaceError] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [topView, setTopView] = useState('cases'); // 'cases' | 'clients' | 'account'

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setReady(true);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      if (!u) clearUserId();
      setUser(u);
      setBackendSynced(false);
      setSelectedCase(null);
      setReady(true);
    });
  }, []);

  /* After Firebase login: sync MySQL user_id → localStorage (demo) */
  useEffect(() => {
    if (!user || !user.uid) return;
    let cancelled = false;
    (async () => {
      setWorkspaceError(null);
      setPersonalCase(null);
      try {
        const data = await apiPost('users.sync_firebase', {
          firebase_uid: user.uid,
          email:        user.email || '',
          name:         user.displayName || '',
          photo_url:    user.photoURL || '',
        });
        if (!cancelled && data.user_id) setUserId(data.user_id);
        if (!cancelled && data.personal_case) setPersonalCase(data.personal_case);
        else if (!cancelled) setWorkspaceError('Could not load your workspace. Update the API and refresh.');
      } catch (e) {
        console.warn('[LegalTek] users.sync_firebase:', e.message);
        if (!cancelled) setWorkspaceError(e.message || 'Sync failed');
      } finally {
        if (!cancelled) setBackendSynced(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!ready) {
    return (
      <div className="h-full w-full animated-bg flex items-center justify-center">
        <Spinner size={28} />
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (!backendSynced) {
    return (
      <div className="h-full w-full animated-bg flex flex-col items-center justify-center gap-3">
        <Spinner size={28} />
        <p className="text-sm" style={{ color: '#6b7280' }}>Syncing your account…</p>
      </div>
    );
  }

  if (workspaceError) {
    return (
      <div className="h-full w-full animated-bg flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-red-600 text-sm max-w-md">{workspaceError}</p>
        <button
          type="button"
          onClick={signOutUser}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: 'rgba(13,27,42,0.9)', border: '1px solid rgba(212,175,55,0.3)' }}>
          Sign out
        </button>
      </div>
    );
  }

  if (!personalCase) {
    return (
      <div className="h-full w-full animated-bg flex flex-col items-center justify-center gap-3">
        <Spinner size={28} />
        <p className="text-sm" style={{ color: '#6b7280' }}>Preparing workspace…</p>
      </div>
    );
  }

  if (!selectedCase) {
    return (
      <div className="h-screen w-full flex overflow-hidden">
        <HomeSidebar
          topView={topView}
          onSwitchView={setTopView}
          userDisplayName={user.displayName}
          userEmail={user.email}
          onSignOut={signOutUser}
        />
        <div className="flex-1 overflow-hidden">
          {topView === 'clients' ? (
            <ClientsHome
              userDisplayName={user.displayName}
              userEmail={user.email}
            />
          ) : topView === 'account' ? (
            <AccountHome />
          ) : (
            <CasesHome
              onSelectCase={setSelectedCase}
              userDisplayName={user.displayName}
              userEmail={user.email}
            />
          )}
        </div>
      </div>
    );
  }

  return <AppShell user={user} initialCase={selectedCase} onBackToCases={() => setSelectedCase(null)} />;
}
