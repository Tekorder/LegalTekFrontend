'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/CasesHome.jsx
   Components: CasesHome, CaseCard, CreateCaseModal
═══════════════════════════════════════════════ */

import { useState, useEffect, useRef } from 'react';
import { apiFetch, apiPost, getUserId } from '@/lib/api';
import { fmtDate, fmtMoney } from '@/lib/format';
import { Ico, Spinner } from '@/lib/icons';

/* ── Matter type visual config ─────────────────────────── */
const MATTER_STYLES = {
  contract:   { label: 'Contract',   color: '#2563eb', bg: 'rgba(37,99,235,0.08)',   border: 'rgba(37,99,235,0.2)',    icon: 'file'     },
  litigation: { label: 'Litigation', color: '#b91c1c', bg: 'rgba(185,28,28,0.08)',   border: 'rgba(185,28,28,0.2)',    icon: 'shield'   },
  advisory:   { label: 'Advisory',   color: '#059669', bg: 'rgba(5,150,105,0.08)',    border: 'rgba(5,150,105,0.2)',    icon: 'chat'     },
  corporate:  { label: 'Corporate',  color: '#6d28d9', bg: 'rgba(109,40,217,0.07)',   border: 'rgba(109,40,217,0.18)',  icon: 'settings' },
  analysis_reporting: { label: 'Analysis and Reporting', color: '#0891b2', bg: 'rgba(8,145,178,0.08)', border: 'rgba(8,145,178,0.2)', icon: 'chart' },
  other:      { label: 'Other',      color: '#6b7280', bg: 'rgba(107,114,128,0.07)',  border: 'rgba(107,114,128,0.18)', icon: 'empty'    },
};

/* ══════════════════════════════════════════════════════
   CASE CARD
══════════════════════════════════════════════════════ */
function CaseCard({ caseData, onOpen, onDelete }) {
  const [confirm,  setConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  const mt = MATTER_STYLES[caseData.matter_type] ?? MATTER_STYLES.other;
  const billedTotal = Number(caseData.billed_total) || 0;

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    await onDelete(caseData.id);
  };

  return (
    <div
      onClick={() => !confirm && onOpen(caseData)}
      className="rounded-lg p-5 flex flex-col gap-4 group cursor-pointer transition-all duration-200"
      style={{
        background: 'linear-gradient(145deg, rgba(10,22,36,0.97), rgba(18,38,62,0.95))',
        border:     '1px solid rgba(212,175,55,0.18)',
        boxShadow:  '0 2px 14px rgba(0,0,0,0.14)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.45)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.22)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.18)'; e.currentTarget.style.boxShadow = '0 2px 14px rgba(0,0,0,0.14)'; }}
    >
      {/* Top row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1.5 flex-shrink-0"
            style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.28)' }}>
            <Ico name={mt.icon} size={11} stroke="currentColor" />
            {mt.label}
          </span>
          <span className="text-[11px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.38)' }}>
            {fmtDate(caseData.created_at)}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className={`w-1.5 h-1.5 rounded-full ${
            caseData.status === 'active' ? 'bg-emerald-400' :
            caseData.status === 'closed' ? 'bg-gray-500'   : 'bg-amber-400'
          }`} />
          <span className="text-[11px] capitalize" style={{ color: 'rgba(255,255,255,0.45)' }}>{caseData.status}</span>
        </div>
      </div>

      {/* Title + description */}
      <div className="flex-1">
        <h3 className="font-semibold text-base leading-snug text-white">{caseData.title}</h3>
        {caseData.description && (
          <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {caseData.description}
          </p>
        )}
      </div>

      {/* Billed total */}
      {billedTotal > 0 && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg self-start"
          style={{ background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.25)' }}>
          <Ico name="dollar" size={12} stroke="#d4af37" />
          <span className="text-xs font-semibold" style={{ color: '#d4af37' }}>{fmtMoney(billedTotal)} billed</span>
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-xs flex-nowrap overflow-hidden" style={{ color: 'rgba(255,255,255,0.38)' }}>
        <span className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
          <Ico name="chat" size={12} stroke="rgba(212,175,55,0.5)" />
          <span>{caseData.conversation_count} chat{caseData.conversation_count != 1 ? 's' : ''}</span>
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
          <Ico name="file" size={12} stroke="rgba(212,175,55,0.5)" />
          <span>{caseData.document_count} doc{caseData.document_count != 1 ? 's' : ''}</span>
        </span>
        <span className="flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap">
          <Ico name="users" size={12} stroke="rgba(212,175,55,0.5)" />
          <span>{caseData.member_count} member{caseData.member_count != 1 ? 's' : ''}</span>
        </span>
      </div>

      {/* Actions footer */}
      <div className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid rgba(212,175,55,0.14)' }}>

        {confirm ? (
          <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
            <span className="text-xs flex-1" style={{ color: '#f87171' }}>Delete this case?</span>
            <button onClick={handleDelete}
              disabled={deleting}
              className="text-[11px] font-semibold px-2.5 py-1 rounded text-white"
              style={{ background: 'rgba(185,28,28,0.75)' }}>
              {deleting ? '…' : 'Yes'}
            </button>
            <button onClick={e => { e.stopPropagation(); setConfirm(false); }}
              className="text-[11px] font-semibold px-2.5 py-1 rounded"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.55)' }}>
              No
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={e => { e.stopPropagation(); setConfirm(true); }}
              className="p-1.5 rounded opacity-0 group-hover:opacity-100 transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
              title="Delete case">
              <Ico name="trash" size={13} stroke="currentColor" />
            </button>

            <button
              onClick={() => onOpen(caseData)}
              className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: '#d4af37' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f8e870'}
              onMouseLeave={e => e.currentTarget.style.color = '#d4af37'}>
              Open Case
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CREATE CASE MODAL
══════════════════════════════════════════════════════ */
function CreateCaseModal({ onClose, onCreate }) {
  const [step,        setStep]        = useState('details'); // 'details' | 'clients'
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [matterType,  setMatterType]  = useState('other');
  const [saving,      setSaving]      = useState(false);

  const [clients,        setClients]        = useState([]);
  const [loadingClients, setLoadingClients]  = useState(false);
  const [selectedIds,    setSelectedIds]     = useState([]);
  const [clientQuery,    setClientQuery]     = useState('');

  const titleRef       = useRef();
  const clientSearchRef = useRef();

  useEffect(() => {
    titleRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const goToClients = async () => {
    if (!title.trim()) return;
    setStep('clients');
    setLoadingClients(true);
    try {
      const data = await apiFetch('clients.list', { user_id: getUserId() });
      setClients(data);
    } catch (e) {
      setClients([]);
    } finally {
      setLoadingClients(false);
    }
  };

  const toggleClient = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectClient = (id) => {
    toggleClient(id);
    setClientQuery('');
    clientSearchRef.current?.focus();
  };

  useEffect(() => {
    if (step === 'clients' && !loadingClients) clientSearchRef.current?.focus();
  }, [step, loadingClients]);

  const selectedClients = clients.filter(c => selectedIds.includes(c.id));
  const clientQueryLower = clientQuery.trim().toLowerCase();
  const matchingClients = clients.filter(c =>
    !selectedIds.includes(c.id) &&
    (!clientQueryLower ||
      c.name.toLowerCase().includes(clientQueryLower) ||
      (c.company || '').toLowerCase().includes(clientQueryLower))
  );
  const CLIENT_RESULTS_LIMIT = 8;
  const visibleClientResults = matchingClients.slice(0, CLIENT_RESULTS_LIMIT);
  const hiddenClientCount = matchingClients.length - visibleClientResults.length;

  const finish = async (clientIds) => {
    if (saving) return;
    setSaving(true);
    try {
      await onCreate({ title: title.trim(), description: description.trim(), matter_type: matterType, client_ids: clientIds });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (step === 'details') goToClients();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(13,27,42,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      onKeyDown={handleKey}>
      <div
        className="glass rounded-lg p-6 w-full max-w-md mx-4"
        style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}>

        {step === 'details' ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="btn-primary w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                <Ico name="plus" size={16} stroke="white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold text-base leading-none">New Case</h3>
                <p className="text-gray-500 text-xs mt-0.5">Create a new legal matter</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                  Case Title *
                </label>
                <input
                  ref={titleRef}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Smith vs Jones Corp"
                  maxLength={200}
                  className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Brief description of the legal matter..."
                  rows={3}
                  maxLength={500}
                  className="w-full chat-input rounded-lg px-4 py-2.5 text-sm resize-none"
                />
              </div>

              {/* Matter type */}
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                  Matter Type
                </label>
                <select
                  value={matterType}
                  onChange={e => setMatterType(e.target.value)}
                  className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
                  style={{ appearance: 'auto' }}>
                  <option value="contract">Contract</option>
                  <option value="litigation">Litigation</option>
                  <option value="advisory">Advisory</option>
                  <option value="corporate">Corporate</option>
                  <option value="analysis_reporting">Analysis and Reporting</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)' }}>
                Cancel
              </button>
              <button
                onClick={goToClients}
                disabled={!title.trim()}
                className="flex-1 btn-primary py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                Next
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <div className="btn-primary w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
                <Ico name="users" size={16} stroke="white" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold text-base leading-none">Select Clients</h3>
                <p className="text-gray-500 text-xs mt-0.5">Add clients to this case — or skip for now</p>
              </div>
            </div>

            {loadingClients && (
              <div className="flex items-center justify-center gap-3 py-10 text-stone-400">
                <Spinner size={18} />
                <span className="text-sm">Loading clients…</span>
              </div>
            )}

            {!loadingClients && clients.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">You don't have any clients yet.</p>
                <p className="text-xs text-gray-400 mt-1">This case can still be created without one.</p>
              </div>
            )}

            {!loadingClients && clients.length > 0 && (
              <div className="flex flex-col gap-3">
                {/* Selected clients as removable chips */}
                {selectedClients.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedClients.map(c => (
                      <span key={c.id}
                        className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)', color: '#8a6d1a' }}>
                        {c.name}
                        <button
                          type="button"
                          onClick={() => toggleClient(c.id)}
                          className="rounded-full p-0.5 transition-colors"
                          style={{ color: '#8a6d1a' }}
                          title="Remove">
                          <Ico name="close" size={10} stroke="currentColor" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search box */}
                <div className="relative">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" style={{ pointerEvents: 'none' }}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    ref={clientSearchRef}
                    value={clientQuery}
                    onChange={e => setClientQuery(e.target.value)}
                    placeholder="Search clients by name or company…"
                    className="w-full chat-input rounded-lg pl-9 pr-4 py-2.5 text-sm"
                  />
                </div>

                {/* Search results */}
                <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {visibleClientResults.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">
                      {clientQueryLower ? 'No clients match your search.' : 'All your clients are already selected.'}
                    </p>
                  )}
                  {visibleClientResults.map(c => (
                    <button key={c.id}
                      type="button"
                      onClick={() => selectClient(c.id)}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg text-left transition-colors"
                      style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.07)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate leading-none">{c.name}</p>
                        {c.company && <p className="text-xs text-gray-400 mt-0.5 truncate">{c.company}</p>}
                      </div>
                      <Ico name="plus" size={13} stroke="rgba(212,175,55,0.85)" />
                    </button>
                  ))}
                  {hiddenClientCount > 0 && (
                    <p className="text-[11px] text-gray-400 text-center py-1">
                      +{hiddenClientCount} more — keep typing to narrow it down
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setStep('details')}
                disabled={saving}
                className="py-2.5 px-4 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)' }}>
                Back
              </button>
              <button
                onClick={() => finish([])}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)' }}>
                Skip
              </button>
              <button
                onClick={() => finish(selectedIds)}
                disabled={saving || selectedIds.length === 0}
                className="flex-1 btn-primary py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
                {saving
                  ? <><Spinner size={14} /> Creating…</>
                  : <><Ico name="plus" size={14} stroke="white" /> Create Case</>}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CASES HOME
══════════════════════════════════════════════════════ */
function CasesHome({ onSelectCase, userDisplayName, userEmail }) {
  const [cases,      setCases]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => { loadCases(); }, []);

  async function loadCases() {
    setLoading(true);
    try {
      const data = await apiFetch('cases.list', { user_id: getUserId() });
      setCases(data);
    } catch (e) {
      setError('Could not load cases: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCase({ title, description, matter_type, client_ids }) {
    try {
      const newCase = await apiPost('cases.create', { user_id: getUserId(), title, description, matter_type, client_ids });
      setCases(prev => [newCase, ...prev]);
    } catch (e) {
      setError('Could not create case: ' + e.message);
    }
  }

  async function handleDeleteCase(caseId) {
    try {
      await apiPost('cases.delete', { case_id: caseId });
      setCases(prev => prev.filter(c => c.id !== caseId));
    } catch (e) {
      setError('Could not delete case: ' + e.message);
    }
  }

  const activeCases   = cases.filter(c => c.status === 'active');
  const inactiveCases = cases.filter(c => c.status !== 'active');

  return (
    <div className="h-full flex flex-col animated-bg overflow-hidden" style={{ color: '#1a1a2e' }}>

      {/* Header */}
      <header
        className="glass flex-shrink-0 px-8 py-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>

        {/* Greeting */}
        <div className="min-w-0">
          <p className="text-gray-800 font-medium text-sm truncate max-w-md">
            Welcome back{userDisplayName ? `, ${userDisplayName.split(' ')[0]}` : userEmail ? `, ${userEmail.split('@')[0]}` : ''}
          </p>
          <p className="text-gray-400 text-xs mt-0.5">
            {activeCases.length} active case{activeCases.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="btn-primary px-4 py-2.5 rounded-lg text-white text-sm font-medium flex items-center gap-2 flex-shrink-0">
          <Ico name="plus" size={15} stroke="white" strokeWidth={2.5} />
          New Case
        </button>
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

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-8 py-6">

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-20 text-stone-400">
            <Spinner size={20} />
            <span className="text-sm">Loading your cases…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && cases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div
              className="w-20 h-20 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(13,27,42,0.06)', border: '1px solid rgba(13,27,42,0.1)' }}>
              <Ico name="empty" size={36} stroke="rgba(13,27,42,0.3)" />
            </div>
            <div>
              <h2 className="text-gray-900 font-semibold text-xl">No cases yet</h2>
              <p className="text-gray-500 text-sm mt-2 max-w-xs">
                Create your first legal case to start organizing chats and documents.
              </p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="btn-primary px-6 py-3 rounded-lg text-white text-sm font-medium flex items-center gap-2 mt-2">
              <Ico name="plus" size={15} stroke="white" strokeWidth={2.5} />
              Create your first case
            </button>
          </div>
        )}

        {/* Active cases */}
        {!loading && activeCases.length > 0 && (
          <section className="mb-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'rgba(13,27,42,0.35)' }}>
              Active — {activeCases.length} case{activeCases.length !== 1 ? 's' : ''}
            </p>
            <div className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {activeCases.map(c => (
                <CaseCard key={c.id} caseData={c} onOpen={onSelectCase} onDelete={handleDeleteCase} />
              ))}
            </div>
          </section>
        )}

        {/* Closed / Archived cases */}
        {!loading && inactiveCases.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-4"
              style={{ color: 'rgba(13,27,42,0.25)' }}>
              Closed & Archived — {inactiveCases.length}
            </p>
            <div className="grid gap-4"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
              {inactiveCases.map(c => (
                <CaseCard key={c.id} caseData={c} onOpen={onSelectCase} onDelete={handleDeleteCase} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Create Case Modal */}
      {showModal && (
        <CreateCaseModal
          onClose={() => setShowModal(false)}
          onCreate={handleCreateCase}
        />
      )}
    </div>
  );
}

export default CasesHome;
export { CaseCard, CreateCaseModal };
