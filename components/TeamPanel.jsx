'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/TeamPanel.jsx
   Slide-in panel to manage case team members.
   Invite by email — user must exist in the system.

   Behavior:
     • 1 member  → Waldy responds to every message
     • 2+ members → Waldy only responds when @Waldy is mentioned
═══════════════════════════════════════════════ */

import { useState, useEffect, useRef } from 'react';
import { apiFetch, apiPost } from '@/lib/api';
import { Ico, Spinner } from '@/lib/icons';

/* ── Avatar helpers ─────────────────────────── */
const AVATAR_GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#dc2626)',
  'linear-gradient(135deg,#0891b2,#7c3aed)',
  'linear-gradient(135deg,#059669,#0891b2)',
  'linear-gradient(135deg,#dc2626,#d97706)',
  'linear-gradient(135deg,#4f46e5,#db2777)',
];
const avatarGrad  = (id) => AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length];
const getInitials = (name) => name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

const PLAN_LABELS = { free: 'Free', professional: 'Pro', enterprise: 'Enterprise' };

/* ══════════════════════════════════════════════════════
   TEAM PANEL
══════════════════════════════════════════════════════ */
function TeamPanel({ caseId, members, onClose, onMembersChange }) {
  const [email,     setEmail]     = useState('');
  const [searching, setSearching] = useState(false);
  const [feedback,  setFeedback]  = useState(null); // { type: 'success'|'error'|'already', message, user? }
  const [removing,  setRemoving]  = useState(null);
  const inputRef = useRef();

  const isMulti = members.length > 1;

  useEffect(() => {
    inputRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  /* Clear feedback when email changes */
  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    if (feedback) setFeedback(null);
  };

  async function handleInvite() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || searching) return;

    setSearching(true);
    setFeedback(null);

    try {
      /* 1. Find user by email */
      const user = await apiFetch('users.find_by_email', { email: trimmed });

      /* 2. Check if already a member */
      const alreadyIn = members.some(m => m.user_id === user.id);
      if (alreadyIn) {
        setFeedback({
          type:    'already',
          message: `${user.name} is already on this project.`,
          user,
        });
        setSearching(false);
        return;
      }

      /* 3. Add to case */
      const newMember = await apiPost('cases.invite', { case_id: caseId, user_id: user.id });
      onMembersChange([...members, newMember]);
      setEmail('');
      setFeedback({
        type:    'success',
        message: `${user.name} has been added to the project.`,
        user,
      });

    } catch (e) {
      /* 404 from users.find_by_email → user does not exist */
      const isNotFound = e.message?.toLowerCase().includes('does not exist') ||
                         e.message?.toLowerCase().includes('not found');
      setFeedback({
        type:    'error',
        message: isNotFound ? 'User does not exist.' : `Error: ${e.message}`,
      });
    } finally {
      setSearching(false);
    }
  }

  async function handleRemove(userId) {
    setRemoving(userId);
    try {
      await apiPost('cases.remove_member', { case_id: caseId, user_id: userId });
      onMembersChange(members.filter(m => m.user_id !== userId));
      setFeedback(null);
    } catch (e) {
      setFeedback({ type: 'error', message: 'Could not remove member: ' + e.message });
    } finally {
      setRemoving(null);
    }
  }

  const FEEDBACK_STYLES = {
    success: { color: '#059669', bg: 'rgba(5,150,105,0.08)',  border: 'rgba(5,150,105,0.2)',   icon: 'plus'     },
    error:   { color: '#b91c1c', bg: 'rgba(185,28,28,0.08)', border: 'rgba(185,28,28,0.2)',   icon: 'close'    },
    already: { color: '#b45309', bg: 'rgba(180,83,9,0.08)',   border: 'rgba(180,83,9,0.2)',    icon: 'settings' },
  };

  return (
    /* Backdrop */
    <div
      className="absolute inset-0 z-40 flex justify-end"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}>

      {/* Panel */}
      <div
        className="h-full w-80 flex flex-col overflow-hidden"
        style={{
          background:     'rgba(255,255,255,0.97)',
          borderLeft:     '1px solid rgba(0,0,0,0.09)',
          backdropFilter: 'blur(20px)',
          boxShadow:      '-4px 0 24px rgba(0,0,0,0.08)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div>
            <h3 className="text-gray-900 font-semibold text-base leading-none">Team Members</h3>
            <p className="text-gray-400 text-xs mt-1">
              {members.length} member{members.length !== 1 ? 's' : ''} on this project
            </p>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 transition-colors"
            style={{ background: 'rgba(0,0,0,0.05)' }}>
            <Ico name="close" size={15} stroke="currentColor" />
          </button>
        </div>

        {/* AI behavior notice */}
        <div className="mx-4 mt-4 px-3 py-2.5 rounded-lg text-xs flex-shrink-0"
          style={{
            background: isMulti ? 'rgba(13,27,42,0.06)' : 'rgba(5,150,105,0.07)',
            border:     `1px solid ${isMulti ? 'rgba(13,27,42,0.14)' : 'rgba(5,150,105,0.18)'}`,
          }}>
          {isMulti ? (
            <p className="text-stone-600 leading-relaxed">
              <span className="font-semibold text-stone-700">Group mode active.</span>
              {' '}Mention <span className="font-bold" style={{ color: '#d4af37' }}>@Waldy</span> for an AI response.
            </p>
          ) : (
            <p className="text-emerald-700 leading-relaxed">
              <span className="font-semibold">1:1 mode.</span>
              {' '}Waldy responds to every message.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 mt-4">

          {/* ── Invite by email ── */}
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(13,27,42,0.35)' }}>
            Invite by email
          </p>

          <div className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              type="email"
              value={email}
              onChange={handleEmailChange}
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
              placeholder="lawyer@firm.com"
              className="flex-1 chat-input rounded-lg px-3 py-2 text-sm min-w-0"
            />
            <button
              onClick={handleInvite}
              disabled={!email.trim() || searching}
              className="flex-shrink-0 px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all disabled:opacity-40"
              style={{
                background: 'rgba(13,27,42,0.08)',
                border:     '1px solid rgba(13,27,42,0.18)',
                color:      '#374151',
              }}>
              {searching
                ? <Spinner size={14} />
                : <Ico name="userplus" size={14} stroke="currentColor" />}
            </button>
          </div>

          {/* Feedback */}
          {feedback && (
            <div
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-xs mb-4"
              style={{
                background: FEEDBACK_STYLES[feedback.type].bg,
                border:     `1px solid ${FEEDBACK_STYLES[feedback.type].border}`,
                color:      FEEDBACK_STYLES[feedback.type].color,
              }}>
              {feedback.user && (
                <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold mt-0.5"
                  style={{ background: avatarGrad(feedback.user.id) }}>
                  {getInitials(feedback.user.name)}
                </div>
              )}
              <span className="flex-1 leading-relaxed">{feedback.message}</span>
            </div>
          )}

          {/* ── Current members ── */}
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(13,27,42,0.35)' }}>
            Current Members
          </p>

          <div className="flex flex-col gap-2">
            {members.map(m => (
              <div key={m.user_id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.08)' }}>

                {/* Avatar */}
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ background: avatarGrad(m.user_id) }}>
                  {getInitials(m.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate leading-none">{m.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{m.email}</p>
                </div>

                {/* Role / Remove */}
                {m.role === 'owner' ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'rgba(13,27,42,0.08)', color: '#374151', border: '1px solid rgba(13,27,42,0.14)' }}>
                    Owner
                  </span>
                ) : (
                  <button
                    onClick={() => handleRemove(m.user_id)}
                    disabled={removing === m.user_id}
                    className="flex-shrink-0 p-1.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                    style={{ background: 'rgba(0,0,0,0.04)' }}
                    title="Remove from project">
                    {removing === m.user_id
                      ? <Spinner size={12} />
                      : <Ico name="close" size={12} stroke="currentColor" />}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeamPanel;
