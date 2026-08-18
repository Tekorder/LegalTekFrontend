'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/InviteToChatModal.jsx
   Modal to invite case members into a specific chat.
═══════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { apiPost } from '@/lib/api';
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

/* ══════════════════════════════════════════════════════
   INVITE TO CHAT MODAL
   Props:
     conversationId  – the current chat
     convMembers     – users already in this conversation
     caseMembers     – all users in the case (superset)
     onClose
     onMembersChange – cb(newConvMembersArray)
══════════════════════════════════════════════════════ */
function InviteToChatModal({ conversationId, convMembers, caseMembers, onClose, onMembersChange }) {
  const [adding,   setAdding]   = useState(null);  // user_id being added
  const [removing, setRemoving] = useState(null);  // user_id being removed
  const [error,    setError]    = useState(null);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  /* Case members not yet in this conversation */
  const convMemberIds  = new Set(convMembers.map(m => m.user_id));
  const available      = caseMembers.filter(m => !convMemberIds.has(m.user_id));
  const isMulti        = convMembers.length > 1;

  async function handleAdd(userId) {
    setAdding(userId);
    try {
      const newMember = await apiPost('conversations.add_member', {
        conversation_id: conversationId,
        user_id:         userId,
      });
      onMembersChange([...convMembers, newMember]);
    } catch (e) {
      setError('Could not add member: ' + e.message);
    } finally {
      setAdding(null);
    }
  }

  async function handleRemove(userId) {
    setRemoving(userId);
    try {
      await apiPost('conversations.remove_member', {
        conversation_id: conversationId,
        user_id:         userId,
      });
      onMembersChange(convMembers.filter(m => m.user_id !== userId));
    } catch (e) {
      setError('Could not remove member: ' + e.message);
    } finally {
      setRemoving(null);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>

      {/* Modal card */}
      <div
        className="w-full max-w-md mx-4 rounded-lg flex flex-col overflow-hidden"
        style={{
          background:  'rgba(255,255,255,0.97)',
          border:      '1px solid rgba(0,0,0,0.1)',
          maxHeight:   '80vh',
          boxShadow:   '0 8px 40px rgba(0,0,0,0.14)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div className="flex items-center gap-3">
            <div className="btn-primary w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0">
              <Ico name="users" size={15} stroke="white" />
            </div>
            <div>
              <h3 className="text-gray-900 font-semibold text-base leading-none">Chat Participants</h3>
              <p className="text-gray-400 text-xs mt-0.5">Invite case members to this conversation</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded text-gray-400 hover:text-gray-700 transition-colors"
            style={{ background: 'rgba(0,0,0,0.05)' }}>
            <Ico name="close" size={15} stroke="currentColor" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">

          {/* @Waldy mode notice */}
          <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-lg mb-5"
            style={{
              background: isMulti ? 'rgba(13,27,42,0.05)' : 'rgba(5,150,105,0.07)',
              border:     `1px solid ${isMulti ? 'rgba(13,27,42,0.12)' : 'rgba(5,150,105,0.18)'}`,
            }}>
            <Ico name={isMulti ? 'users' : 'chat'}
              size={14}
              stroke={isMulti ? 'rgba(13,27,42,0.4)' : 'rgba(5,150,105,0.7)'}
              className="flex-shrink-0 mt-0.5" />
            {isMulti ? (
              <p className="text-xs text-stone-600 leading-relaxed">
                <span className="font-semibold text-stone-700">Group mode active.</span>
                {' '}Members must mention{' '}
                <span className="font-bold" style={{ color: '#d4af37' }}>@Waldy</span>
                {' '}for an AI response.
              </p>
            ) : (
              <p className="text-xs text-emerald-700 leading-relaxed">
                <span className="font-semibold">Direct mode.</span>
                {' '}Waldy responds to every message. Invite someone to enable group mode.
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-xs text-red-600 flex items-center gap-2"
              style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.2)' }}>
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)}><Ico name="close" size={11} stroke="currentColor" /></button>
            </div>
          )}

          {/* Current participants */}
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: 'rgba(13,27,42,0.35)' }}>
            In this conversation ({convMembers.length})
          </p>

          <div className="flex flex-col gap-2 mb-5">
            {convMembers.map(m => (
              <div key={m.user_id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.08)' }}>

                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ background: avatarGrad(m.user_id) }}>
                  {getInitials(m.name)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate leading-none">{m.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{m.email}</p>
                </div>

                {m.user_id === 1 ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'rgba(13,27,42,0.08)', color: '#374151', border: '1px solid rgba(13,27,42,0.14)' }}>
                    You
                  </span>
                ) : (
                  <button
                    onClick={() => handleRemove(m.user_id)}
                    disabled={removing === m.user_id}
                    className="flex-shrink-0 p-1.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                    style={{ background: 'rgba(0,0,0,0.04)' }}
                    title="Remove from conversation">
                    {removing === m.user_id
                      ? <Spinner size={12} />
                      : <Ico name="close" size={12} stroke="currentColor" />}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Available case members */}
          {available.length > 0 && (
            <>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                style={{ color: 'rgba(13,27,42,0.35)' }}>
                Case members — invite to this chat
              </p>
              <div className="flex flex-col gap-2">
                {available.map(m => (
                  <div key={m.user_id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                    style={{ background: 'rgba(245,242,235,0.7)', border: '1px solid rgba(0,0,0,0.07)' }}>

                    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold"
                      style={{ background: avatarGrad(m.user_id), opacity: 0.75 }}>
                      {getInitials(m.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate leading-none">{m.name}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{m.email}</p>
                    </div>

                    <button
                      onClick={() => handleAdd(m.user_id)}
                      disabled={adding === m.user_id}
                      className="flex-shrink-0 px-3 py-1 rounded text-[11px] font-semibold flex items-center gap-1.5 transition-all"
                      style={{
                        background: 'rgba(13,27,42,0.08)',
                        border:     '1px solid rgba(13,27,42,0.18)',
                        color:      '#374151',
                      }}>
                      {adding === m.user_id
                        ? <Spinner size={11} />
                        : <><Ico name="userplus" size={12} stroke="currentColor" /> Invite</>}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {available.length === 0 && caseMembers.length <= 1 && (
            <div className="text-center py-4">
              <p className="text-gray-400 text-xs">
                No other members in this case yet.{' '}
                <span style={{ color: '#d4af37' }}>Add team members</span> to the case first.
              </p>
            </div>
          )}

          {available.length === 0 && caseMembers.length > 1 && (
            <div className="text-center py-4">
              <p className="text-gray-400 text-xs">All case members are already in this conversation.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-5 py-3"
          style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <button onClick={onClose}
            className="w-full py-2 rounded-lg text-sm text-gray-500 hover:text-gray-800 transition-colors"
            style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.09)' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default InviteToChatModal;
