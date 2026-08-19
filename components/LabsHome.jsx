'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/LabsHome.jsx
   Labs index: a card grid of every lab, mirroring CasesHome.

   The grid is driven entirely by `labs.list` from the backend, so a new lab
   registered in LegalTekBackend/src/labs/index.js appears here — card, run
   form, and results table — with no change to this file.
═══════════════════════════════════════════════ */

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { Ico, Spinner } from '@/lib/icons';

/* ══════════════════════════════════════════════════════
   LAB CARD
══════════════════════════════════════════════════════ */
function LabCard({ lab, aiAvailable, onOpen }) {
  const disabled = lab.requiresAI && !aiAvailable;

  return (
    <div
      onClick={() => !disabled && onOpen(lab)}
      className={`rounded-lg p-5 flex flex-col gap-4 group transition-all duration-200 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      style={{
        background: 'linear-gradient(145deg, rgba(10,22,36,0.97), rgba(18,38,62,0.95))',
        border:     '1px solid rgba(212,175,55,0.18)',
        boxShadow:  '0 2px 14px rgba(0,0,0,0.14)',
        opacity:    disabled ? 0.55 : 1,
      }}
      onMouseEnter={e => {
        if (disabled) return;
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.45)';
        e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.22)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(212,175,55,0.18)';
        e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.14)';
      }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1.5 flex-shrink-0"
          style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.28)' }}>
          <Ico name={lab.icon || 'chart'} size={11} stroke="currentColor" />
          Lab
        </span>
        <span className="text-[11px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.38)' }}>
          up to {lab.maxFiles} files
        </span>
      </div>

      {/* Title + description */}
      <div className="min-w-0">
        <h3 className="text-white font-semibold text-base leading-snug truncate">{lab.name}</h3>
        <p className="text-[11px] mt-0.5" style={{ color: 'rgba(212,175,55,0.75)' }}>{lab.tagline}</p>
        <p className="text-xs mt-2 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {lab.description}
        </p>
      </div>

      {/* Accepted formats */}
      <div className="flex flex-wrap gap-1.5">
        {(lab.accepts || []).map(ext => (
          <span key={ext}
            className="text-[10px] font-medium px-1.5 py-0.5 rounded uppercase"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.45)' }}>
            {ext.replace('.', '')}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid rgba(212,175,55,0.14)' }}>
        {disabled ? (
          <span className="text-[11px]" style={{ color: '#f87171' }}>Needs a Claude API key</span>
        ) : (
          <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {(lab.skills || []).length} skills
          </span>
        )}
        <button
          type="button"
          disabled={disabled}
          onClick={e => { e.stopPropagation(); if (!disabled) onOpen(lab); }}
          className="flex items-center gap-1.5 text-xs font-semibold transition-colors disabled:opacity-40"
          style={{ color: '#d4af37' }}
          onMouseEnter={e => { if (!disabled) e.currentTarget.style.color = '#f8e870'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#d4af37'; }}>
          Open Lab
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LABS HOME
══════════════════════════════════════════════════════ */
function LabsHome({ onSelectLab, userDisplayName, userEmail }) {
  const [labs, setLabs] = useState([]);
  const [ai, setAi] = useState({ available: false, model: null, reason: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadLabs(); }, []);

  async function loadLabs() {
    setLoading(true);
    try {
      const data = await apiFetch('labs.list');
      setLabs(data.labs || []);
      setAi(data.ai || { available: false });
      setError(null);
    } catch (e) {
      setError('Could not load labs: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full flex flex-col animated-bg overflow-hidden" style={{ color: '#1a1a2e' }}>
      {/* Header */}
      <header
        className="glass flex-shrink-0 px-8 py-4 flex items-center justify-between gap-4"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="min-w-0">
          <p className="text-gray-800 font-medium text-sm truncate max-w-md">
            Labs{userDisplayName ? ` — ${userDisplayName.split(' ')[0]}` : userEmail ? ` — ${userEmail.split('@')[0]}` : ''}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            {labs.length} lab{labs.length !== 1 ? 's' : ''} available
          </p>
        </div>
        <span
          className="text-[11px] font-medium px-2.5 py-1 rounded flex items-center gap-1.5 flex-shrink-0"
          style={ai.available
            ? { background: 'rgba(5,150,105,0.1)', color: '#047857', border: '1px solid rgba(5,150,105,0.25)' }
            : { background: 'rgba(185,28,28,0.08)', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.2)' }}>
          <span className={`w-1.5 h-1.5 rounded-full ${ai.available ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {ai.available ? ai.model : 'AI offline'}
        </span>
      </header>

      {/* Error banner */}
      {error && (
        <div
          className="flex-shrink-0 mx-8 mt-4 px-4 py-3 rounded-lg text-sm text-red-600 flex items-center gap-3"
          style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)' }}>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}>
            <Ico name="close" size={13} stroke="currentColor" />
          </button>
        </div>
      )}

      {!ai.available && !loading && (
        <div
          className="flex-shrink-0 mx-8 mt-4 px-4 py-3 rounded-lg text-sm flex items-start gap-3"
          style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)', color: '#92400e' }}>
          <Ico name="empty" size={14} stroke="currentColor" className="mt-0.5 flex-shrink-0" />
          <span className="flex-1">
            The AI steps are unavailable — {ai.reason || 'no API key configured'}. Labs with a deterministic core still run; labs that need the model are disabled.
          </span>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-y-auto px-8 py-6">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-20 text-stone-400">
            <Spinner size={20} />
            <span className="text-sm">Loading labs…</span>
          </div>
        )}

        {!loading && labs.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div
              className="w-20 h-20 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(13,27,42,0.06)', border: '1px solid rgba(13,27,42,0.1)' }}>
              <Ico name="empty" size={36} stroke="rgba(13,27,42,0.3)" />
            </div>
            <div>
              <h2 className="text-gray-900 font-semibold text-xl">No labs registered</h2>
              <p className="text-gray-500 text-sm mt-2 max-w-xs">
                Add one in <code className="text-xs">LegalTekBackend/src/labs/</code> and it will appear here.
              </p>
            </div>
          </div>
        )}

        {!loading && labs.length > 0 && (
          <section className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'rgba(13,27,42,0.35)' }}>
              Available — {labs.length} lab{labs.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {labs.map(lab => (
                <LabCard key={lab.id} lab={lab} aiAvailable={ai.available} onOpen={onSelectLab} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default LabsHome;
