'use client';

/* ═══════════════════════════════════════════════════════════
   LegalTek AI — components/DocEditViewer.jsx

   AI-powered document diff viewer.

   Flow:
     1. AIEditPrompt  — user types an edit instruction (mini chat-style)
     2. API call      — documents.ai_edit → { original_text, edited_text }
     3. DocEditViewer — animated word-level diff:
          • deletions  → red highlight + strikethrough
          • insertions → gold highlight, fade-in appear
          • active     → pulsing gold glow ring
          • scanning progress bar at the top
     4. EditToast     — "Document edited — +N added · −N removed"
     5. "Save Changes" → documents.save_text (reuses existing endpoint)
═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { apiPost } from '@/lib/api';
import { Ico, Spinner } from '@/lib/icons';

/* ══════════════════════════════════════════════════════
   DIFF ALGORITHM  (LCS word-level, capped at 2800 tok)
══════════════════════════════════════════════════════ */

/**
 * Split text into tokens.
 * Markdown spans (***…***, **…**, *…*) are kept as ONE atomic token
 * so applyMarkdown can match the full span reliably.
 * Everything else splits on whitespace as usual.
 */
function tokenize(text) {
  return text.match(
    /\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|\*[\s\S]+?\*|\r\n|\n|[ \t]+|[^\s*]+|\*+/g
  ) || [];
}

/** Group consecutive 'eq' runs so we don't create millions of DOM nodes */
function groupDiff(raw) {
  const out = [];
  let eqBuf = '';
  for (const t of raw) {
    if (t.type === 'eq') {
      eqBuf += t.text;
    } else {
      if (eqBuf) { out.push({ type: 'eq', text: eqBuf }); eqBuf = ''; }
      out.push(t);
    }
  }
  if (eqBuf) out.push({ type: 'eq', text: eqBuf });
  return out;
}

/* ── Inline markdown → HTML ──────────────────────────────── */
function applyMarkdown(str) {
  // Process *** before ** before * so outer markers take precedence
  return str
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([\s\S]+?)\*\*/g,      '<strong>$1</strong>')
    .replace(/\*([\s\S]+?)\*/g,          '<em>$1</em>');
}

/** Compute word-level diff, returns grouped tokens with changeIdx on each change */
function computeDiff(original, edited) {
  const CAP = 2800;
  const aT = tokenize(original);
  const bT = tokenize(edited);
  const m = Math.min(aT.length, CAP);
  const n = Math.min(bT.length, CAP);

  /* LCS DP */
  const dp = Array.from({ length: m + 1 }, () => new Uint16Array(n + 1));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aT[i - 1] === bT[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  /* Backtrack */
  const raw = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aT[i - 1] === bT[j - 1]) {
      raw.unshift({ type: 'eq',  text: aT[i - 1] }); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      raw.unshift({ type: 'ins', text: bT[j - 1] }); j--;
    } else {
      raw.unshift({ type: 'del', text: aT[i - 1] }); i--;
    }
  }

  /* Append tail of edited text if it was capped */
  if (bT.length > CAP) {
    bT.slice(CAP).forEach(t => raw.push({ type: 'eq', text: t }));
  }

  /* Assign changeIdx to every non-eq token */
  let ci = 0;
  raw.forEach(t => { if (t.type !== 'eq') t.changeIdx = ci++; });

  return groupDiff(raw);
}


/* ══════════════════════════════════════════════════════
   TOAST
══════════════════════════════════════════════════════ */
function EditToast({ visible, addCount, delCount }) {
  return (
    <div style={{
      position:   'fixed',
      bottom:     visible ? '32px' : '-100px',
      left:       '50%',
      transform:  'translateX(-50%)',
      transition: 'bottom 0.5s cubic-bezier(0.34,1.56,0.64,1)',
      zIndex:     9999,
      background: 'linear-gradient(135deg, rgba(10,22,36,0.97), rgba(18,38,62,0.95))',
      border:     '1px solid rgba(212,175,55,0.45)',
      borderRadius: '10px',
      padding:    '13px 24px',
      display:    'flex',
      alignItems: 'center',
      gap:        '12px',
      boxShadow:  '0 8px 40px rgba(0,0,0,0.35)',
      backdropFilter: 'blur(14px)',
      color:      'white',
      fontSize:   '13px',
      fontWeight: 500,
      whiteSpace: 'nowrap',
      pointerEvents: 'none',
    }}>
      {/* Checkmark badge */}
      <span style={{
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: 'rgba(212,175,55,0.18)', border: '1.5px solid #d4af37',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#d4af37', fontSize: 14, fontWeight: 700,
      }}>✓</span>

      <span style={{ color: 'rgba(255,255,255,0.85)' }}>Document edited successfully</span>

      <span style={{
        background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)',
        color: '#4ade80', borderRadius: 6, padding: '2px 9px', fontSize: 12,
      }}>+{addCount} added</span>

      <span style={{
        background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)',
        color: '#f87171', borderRadius: 6, padding: '2px 9px', fontSize: 12,
      }}>−{delCount} removed</span>
    </div>
  );
}


/* ══════════════════════════════════════════════════════
   AI EDIT PROMPT MODAL
   Mini chat-style modal where the user types the
   edit instruction before the diff viewer opens.
══════════════════════════════════════════════════════ */
function AIEditPrompt({ docName, onClose, onSubmit, loading }) {
  const [instruction, setInstruction] = useState('');
  const inputRef = useRef();

  useEffect(() => { inputRef.current?.focus(); }, []);

  /* Quick suggestion chips */
  const CHIPS = [
    'Fix grammar and spelling',
    'Make it more formal',
    'Translate to English',
    'Simplify the language',
    'Add risk clauses',
    'Make it shorter',
  ];

  function handleSubmit() {
    const val = instruction.trim();
    if (!val || loading) return;
    onSubmit(val);
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') onClose();
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(10,18,32,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>

      <div style={{
        width: '100%', maxWidth: 480,
        background: 'rgba(255,255,255,0.98)',
        borderRadius: '10px',
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 20px 64px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>

        {/* Header */}
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(90deg, rgba(10,22,36,0.97), rgba(18,38,62,0.95))',
          display: 'flex', alignItems: 'center', gap: 10,
          borderBottom: '1px solid rgba(212,175,55,0.12)',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
            background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {/* Sparkle icon */}
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v1m0 16v1M4.22 4.22l.7.7m12.72 12.72.7.7M3 12h1m16 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7"/>
              <circle cx="12" cy="12" r="3" fill="rgba(212,175,55,0.2)" stroke="#d4af37"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 13, lineHeight: 1.2 }}>AI Document Edit</p>
            <p className="truncate" style={{ color: 'rgba(212,175,55,0.7)', fontSize: 11 }}>{docName}</p>
          </div>
          <button onClick={onClose} style={{
            width: 26, height: 26, borderRadius: 6,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 18px 14px' }}>
          <p style={{ color: '#374151', fontSize: 13, marginBottom: 10, fontWeight: 500 }}>
            What changes should the AI make to this document?
          </p>

          {/* Instruction textarea — looks like a chat message input */}
          <textarea
            ref={inputRef}
            value={instruction}
            onChange={e => setInstruction(e.target.value)}
            onKeyDown={handleKey}
            rows={3}
            placeholder="e.g. Fix grammar errors, add missing clauses, translate to English…"
            style={{
              width: '100%', resize: 'none', outline: 'none',
              background: 'rgba(249,247,242,0.9)',
              border: '1px solid rgba(13,27,42,0.12)',
              borderRadius: 8, padding: '10px 12px',
              fontFamily: 'Inter, sans-serif', fontSize: 13, lineHeight: 1.6,
              color: '#1a1a2e',
              boxSizing: 'border-box',
            }}
          />

          {/* Quick suggestion chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {CHIPS.map(chip => (
              <button key={chip}
                onClick={() => setInstruction(chip)}
                style={{
                  fontSize: 11, fontWeight: 500,
                  padding: '4px 10px', borderRadius: 20,
                  background: instruction === chip ? 'rgba(13,27,42,0.1)' : 'transparent',
                  border: `1px solid ${instruction === chip ? 'rgba(13,27,42,0.25)' : 'rgba(13,27,42,0.12)'}`,
                  color: instruction === chip ? '#0d1b2a' : '#6b7280',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '12px 18px',
          borderTop: '1px solid rgba(0,0,0,0.07)',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
        }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500,
            background: 'transparent', border: '1px solid rgba(0,0,0,0.1)',
            color: '#9ca3af', cursor: 'pointer',
          }}>Cancel</button>

          <button onClick={handleSubmit} disabled={!instruction.trim() || loading}
            style={{
              padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600,
              background: instruction.trim() && !loading
                ? 'linear-gradient(135deg,#0d1b2a,#1a3a5c)'
                : 'rgba(0,0,0,0.07)',
              border: instruction.trim() && !loading
                ? '1px solid rgba(212,175,55,0.3)'
                : '1px solid transparent',
              color: instruction.trim() && !loading ? '#d4af37' : '#9ca3af',
              cursor: instruction.trim() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'all 0.2s',
            }}>
            {loading ? <><Spinner size={12} /> Analyzing…</> : <>
              {/* send arrow */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              Edit Document
            </>}
          </button>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════════════════
   DOC EDIT VIEWER
   Renders the diff with animated "watch the AI edit"
   effect. Changes are applied one by one with a
   scanning progress bar at the top.
══════════════════════════════════════════════════════ */
function DocEditViewer({ docId, docName, original, edited, onClose, onSave }) {
  const [animIdx,    setAnimIdx]    = useState(-1);   // which changeIdx is next
  const [phase,      setPhase]      = useState('ready'); // 'ready'|'animating'|'done'
  const [showToast,  setShowToast]  = useState(false);
  const [saving,     setSaving]     = useState(false);
  const scrollRef = useRef();

  /* Compute diff once */
  const diff    = useMemo(() => computeDiff(original, edited), [original, edited]);
  const changes = useMemo(() => diff.filter(d => d.type !== 'eq'), [diff]);
  const addCount = useMemo(() => changes.filter(c => c.type === 'ins').length, [changes]);
  const delCount = useMemo(() => changes.filter(c => c.type === 'del').length, [changes]);

  /* Auto-start animation after a short settle delay */
  useEffect(() => {
    const t = setTimeout(() => { setPhase('animating'); setAnimIdx(0); }, 700);
    return () => clearTimeout(t);
  }, []);

  /* Tick through each change */
  useEffect(() => {
    if (phase !== 'animating') return;
    if (animIdx >= changes.length) {
      setPhase('done');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
      return;
    }
    /* Speed: fast for whitespace, proportional to word length */
    const txt = changes[animIdx]?.text ?? '';
    const delay = txt.trim() === '' ? 20 : Math.max(70, Math.min(280, txt.length * 22));
    const t = setTimeout(() => setAnimIdx(i => i + 1), delay);
    return () => clearTimeout(t);
  }, [phase, animIdx, changes]);

  /* Auto-scroll to the active change element */
  useEffect(() => {
    if (animIdx <= 0) return;
    const el = scrollRef.current?.querySelector(`[data-ci="${animIdx - 1}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [animIdx]);

  /* Save: delegate entirely to the parent via onSave(editedText) */
  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(edited);
      setTimeout(onClose, 400);
    } catch {
      setSaving(false);
    }
  }, [edited, onSave, onClose]);

  const progress = changes.length > 0 ? Math.min(1, animIdx / changes.length) : 1;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: 'rgba(8,16,28,0.78)',
        backdropFilter: 'blur(10px)',
        padding: 24,
      }}>

      <div style={{
        width: '100%', maxWidth: 840,
        maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.98)',
        borderRadius: 10,
        border: '1px solid rgba(0,0,0,0.1)',
        boxShadow: '0 28px 80px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'linear-gradient(90deg, rgba(10,22,36,0.97), rgba(18,38,62,0.95))',
          borderBottom: '1px solid rgba(212,175,55,0.1)',
          flexShrink: 0,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            background: 'rgba(212,175,55,0.15)', border: '1px solid rgba(212,175,55,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v1m0 16v1M4.22 4.22l.7.7m12.72 12.72.7.7M3 12h1m16 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7"/>
              <circle cx="12" cy="12" r="3" fill="rgba(212,175,55,0.2)" stroke="#d4af37"/>
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: 'white', fontWeight: 600, fontSize: 14 }}>AI Document Edit</p>
            <p className="truncate" style={{ color: 'rgba(212,175,55,0.7)', fontSize: 12 }}>{docName}</p>
          </div>

          {/* Stats badges */}
          <div style={{ display: 'flex', gap: 7, flexShrink: 0 }}>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
              background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.28)',
              color: '#4ade80',
            }}>+{addCount}</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
              background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.28)',
              color: '#f87171',
            }}>−{delCount}</span>
          </div>

          <button onClick={onClose} style={{
            width: 28, height: 28, borderRadius: 6, flexShrink: 0,
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>×</button>
        </div>

        {/* ── Scanning progress bar ── */}
        <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', flexShrink: 0 }}>
          <div style={{
            height: '100%',
            width: `${progress * 100}%`,
            background: phase === 'done'
              ? 'linear-gradient(90deg, #059669, #34d399)'
              : 'linear-gradient(90deg, #0d1b2a, #d4af37, #f8e870)',
            backgroundSize: '200% 100%',
            transition: 'width 0.18s ease',
            animation: phase === 'animating' ? 'scanShimmer 1.8s linear infinite' : 'none',
          }} />
        </div>

        {/* ── Document body ── */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: 'auto',
          padding: '32px 40px',
          background: '#fdfcf8',
        }}>
          {/* Watermark label */}
          <p style={{
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: 9, color: '#d1ccc0',
            letterSpacing: '0.18em', textTransform: 'uppercase',
            marginBottom: 24,
            borderBottom: '1px solid #ede9e0', paddingBottom: 8,
          }}>LegalTek AI — {docName}</p>

          {/* Diff tokens */}
          <div style={{
            fontFamily: "'Times New Roman', Times, serif",
            fontSize: '12pt', lineHeight: 1.9,
            color: '#1a1a2e',
            textAlign: 'justify',
          }}>
            {diff.map((token, idx) => {
              if (token.type === 'eq') {
                return (
                  <span key={idx} style={{ whiteSpace: 'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: applyMarkdown(token.text) }} />
                );
              }

              const revealed = token.changeIdx < animIdx;
              const isActive  = token.changeIdx === animIdx - 1;

              if (token.type === 'del') {
                return (
                  <span key={idx} data-ci={token.changeIdx}
                    dangerouslySetInnerHTML={{ __html: applyMarkdown(token.text) }}
                    style={{
                      whiteSpace:              'pre-wrap',
                      background:              revealed ? 'rgba(239,68,68,0.1)' : 'transparent',
                      color:                   revealed ? '#dc2626' : 'inherit',
                      textDecoration:          revealed ? 'line-through' : 'none',
                      textDecorationThickness: '1.5px',
                      borderRadius:            3,
                      padding:                 revealed ? '0 1px' : '0',
                      boxShadow:               isActive ? '0 0 0 2px rgba(239,68,68,0.3)' : 'none',
                      transition: 'background 0.25s ease, color 0.25s ease, text-decoration 0.25s ease, box-shadow 0.2s ease',
                    }} />
                );
              }

              if (token.type === 'ins') {
                return (
                  <span key={idx} data-ci={token.changeIdx}
                    dangerouslySetInnerHTML={{ __html: applyMarkdown(token.text) }}
                    style={{
                      whiteSpace:   'pre-wrap',
                      background:   revealed
                        ? (isActive ? 'rgba(212,175,55,0.28)' : 'rgba(212,175,55,0.14)')
                        : 'transparent',
                      color:        revealed ? '#7a5800'    : 'transparent',
                      fontWeight:   revealed ? 600          : 400,
                      borderRadius: 3,
                      padding:      revealed ? '0 1px' : '0',
                      boxShadow:    isActive ? '0 0 0 2px rgba(212,175,55,0.45)' : 'none',
                      transition: 'background 0.3s ease, color 0.3s ease, box-shadow 0.2s ease',
                      userSelect:   'none',
                    }} />
                );
              }

              return null;
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid rgba(0,0,0,0.07)',
          background: 'rgba(249,247,242,0.9)',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>
            {phase === 'done'
              ? `${changes.length} change${changes.length !== 1 ? 's' : ''} applied`
              : `Applying changes… ${animIdx} / ${changes.length}`}
          </span>

          <div style={{ display: 'flex', gap: 9 }}>
            <button onClick={onClose} style={{
              padding: '8px 16px', borderRadius: 7, fontSize: 13, fontWeight: 500,
              background: 'transparent', border: '1px solid rgba(0,0,0,0.12)',
              color: '#6b7280', cursor: 'pointer',
            }}>Discard</button>

            <button onClick={handleSave}
              disabled={saving || phase !== 'done'}
              style={{
                padding: '8px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600,
                background: phase === 'done' && !saving
                  ? 'linear-gradient(135deg,#0d1b2a,#1a3a5c)'
                  : 'rgba(0,0,0,0.07)',
                border: phase === 'done' && !saving
                  ? '1px solid rgba(212,175,55,0.32)'
                  : '1px solid transparent',
                color: phase === 'done' && !saving ? '#d4af37' : '#9ca3af',
                cursor: phase === 'done' && !saving ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 7,
                transition: 'all 0.2s',
              }}>
              {saving ? <><Spinner size={12} /> Saving…</> : <>
                {/* checkmark */}
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                Save Changes
              </>}
            </button>
          </div>
        </div>
      </div>

      {/* Toast */}
      <EditToast visible={showToast} addCount={addCount} delCount={delCount} />
    </div>
  );
}

/* The scanning-shimmer keyframe used to be injected into <head> by an IIFE
   here. That ran at import time, which under Next means during the server
   render — where there is no document. It lives in app/globals.css now. */

export default DocEditViewer;
export { DocEditViewer, AIEditPrompt };
