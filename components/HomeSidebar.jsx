'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/HomeSidebar.jsx
   Top-level nav sidebar: Projects / Clients / Account
═══════════════════════════════════════════════ */

import { Ico } from '@/lib/icons';

const HOME_NAV_ITEMS = [
  { key: 'cases',   label: 'Projects', icon: 'shield'   },
  { key: 'clients', label: 'Clients',  icon: 'users'    },
  { key: 'account', label: 'Account',  icon: 'settings' },
];

function HomeSidebar({ topView, onSwitchView, userDisplayName, userEmail, onSignOut }) {
  return (
    <aside
      className="h-full w-64 flex flex-col glass-dark flex-shrink-0"
      style={{ borderRight: '1px solid rgba(212,175,55,0.18)' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4"
        style={{ borderBottom: '1px solid rgba(212,175,55,0.14)' }}>
        <div className="btn-primary w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center">
          <Ico name="shield" size={18} stroke="white" />
        </div>
        <div className="overflow-hidden">
          <h1 className="text-white font-bold text-base leading-none grad-text">LegalTek</h1>
          <p className="text-[11px] mt-0.5" style={{ color: 'rgba(212,175,55,0.75)' }}>AI Legal Assistant</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5">
        {HOME_NAV_ITEMS.map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSwitchView(item.key)}
            className="w-full py-2.5 px-3 rounded-lg text-sm font-medium flex items-center gap-2.5 transition-all text-left"
            style={{
              background: topView === item.key ? 'rgba(212,175,55,0.2)' : 'transparent',
              color:      topView === item.key ? '#f8e870' : 'rgba(212,175,55,0.75)',
            }}
            onMouseEnter={(e) => { if (topView !== item.key) e.currentTarget.style.background = 'rgba(212,175,55,0.08)'; }}
            onMouseLeave={(e) => { if (topView !== item.key) e.currentTarget.style.background = 'transparent'; }}>
            <Ico name={item.icon} size={15} stroke="currentColor" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User + sign out */}
      <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(212,175,55,0.14)' }}>
        {(userDisplayName || userEmail) && (
          <p className="text-xs truncate px-1 mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {userDisplayName || userEmail}
          </p>
        )}
        {onSignOut && (
          <button
            type="button"
            onClick={onSignOut}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors"
            style={{ border: '1px solid rgba(212,175,55,0.2)', color: 'rgba(212,175,55,0.75)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.color = '#f8e870'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.2)'; e.currentTarget.style.color = 'rgba(212,175,55,0.75)'; }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}

export default HomeSidebar;
