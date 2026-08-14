'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/ClientsHome.jsx
   Components: ClientsHome, ClientCard, CreateClientModal
═══════════════════════════════════════════════ */

import { useState, useEffect, useRef } from 'react';
import { apiFetch, apiPost, getUserId } from '@/lib/api';
import { fmtDate } from '@/lib/format';
import { Ico, Spinner } from '@/lib/icons';

/* ══════════════════════════════════════════════════════
   CLIENT CARD
══════════════════════════════════════════════════════ */
function ClientCard({ clientData, onEdit, onDelete }) {
  const [confirm,  setConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    await onDelete(clientData.id);
  };

  return (
    <div
      onClick={() => !confirm && onEdit(clientData)}
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
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1.5 flex-shrink-0"
          style={{ background: 'rgba(212,175,55,0.12)', color: '#d4af37', border: '1px solid rgba(212,175,55,0.28)' }}>
          <Ico name="users" size={11} stroke="currentColor" />
          Client
        </span>
        <span className="text-[11px] whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.38)' }}>
          {fmtDate(clientData.created_at)}
        </span>
      </div>

      {/* Name + company */}
      <div className="flex-1">
        <h3 className="font-semibold text-base leading-snug text-white">{clientData.name}</h3>
        {clientData.company && (
          <p className="text-xs mt-1 leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
            {clientData.company}
          </p>
        )}
        {clientData.notes && (
          <p className="text-xs mt-1.5 leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {clientData.notes}
          </p>
        )}
      </div>

      {/* Contact row */}
      <div className="flex flex-col gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
        {clientData.email && (
          <span className="flex items-center gap-1.5 truncate">
            <Ico name="chat" size={12} stroke="rgba(212,175,55,0.5)" />
            <span className="truncate">{clientData.email}</span>
          </span>
        )}
        {clientData.phone && (
          <span className="flex items-center gap-1.5 truncate">
            <Ico name="file" size={12} stroke="rgba(212,175,55,0.5)" />
            <span className="truncate">{clientData.phone}</span>
          </span>
        )}
      </div>

      {/* Actions footer */}
      <div className="flex items-center justify-between pt-3"
        style={{ borderTop: '1px solid rgba(212,175,55,0.14)' }}>

        {confirm ? (
          <div className="flex items-center gap-2 w-full" onClick={e => e.stopPropagation()}>
            <span className="text-xs flex-1" style={{ color: '#f87171' }}>Delete this client?</span>
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
              title="Delete client">
              <Ico name="trash" size={13} stroke="currentColor" />
            </button>

            <button
              onClick={() => onEdit(clientData)}
              className="flex items-center gap-1.5 text-xs font-semibold transition-colors"
              style={{ color: '#d4af37' }}
              onMouseEnter={e => e.currentTarget.style.color = '#f8e870'}
              onMouseLeave={e => e.currentTarget.style.color = '#d4af37'}>
              Edit
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
   CREATE / EDIT CLIENT MODAL
══════════════════════════════════════════════════════ */
function CreateClientModal({ initialClient, onClose, onCreate, onUpdate }) {
  const isEdit = !!initialClient;
  const [name,    setName]    = useState(initialClient?.name ?? '');
  const [email,   setEmail]   = useState(initialClient?.email ?? '');
  const [phone,   setPhone]   = useState(initialClient?.phone ?? '');
  const [company, setCompany] = useState(initialClient?.company ?? '');
  const [notes,   setNotes]   = useState(initialClient?.notes ?? '');
  const [saving,  setSaving]  = useState(false);
  const nameRef = useRef();

  useEffect(() => {
    nameRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleSubmit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), email: email.trim(), phone: phone.trim(), company: company.trim(), notes: notes.trim() };
      if (isEdit) await onUpdate(initialClient.id, payload);
      else        await onCreate(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSubmit();
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

        <div className="flex items-center gap-3 mb-6">
          <div className="btn-primary w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
            <Ico name={isEdit ? 'users' : 'plus'} size={16} stroke="white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-gray-900 font-semibold text-base leading-none">{isEdit ? 'Edit Client' : 'New Client'}</h3>
            <p className="text-gray-500 text-xs mt-0.5">{isEdit ? 'Update client information' : 'Add a client to your directory'}</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
              Name *
            </label>
            <input
              ref={nameRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Jane Smith"
              maxLength={200}
              className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
              Company
            </label>
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Smith & Co."
              maxLength={200}
              className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
                maxLength={180}
                className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Phone
              </label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+1 555 000 0000"
                maxLength={50}
                className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Any relevant notes about this client..."
              rows={3}
              className="w-full chat-input rounded-lg px-4 py-2.5 text-sm resize-none"
            />
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
            onClick={handleSubmit}
            disabled={!name.trim() || saving}
            className="flex-1 btn-primary py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {saving
              ? <><Spinner size={14} /> Saving…</>
              : <><Ico name={isEdit ? 'users' : 'plus'} size={14} stroke="white" /> {isEdit ? 'Save Changes' : 'Create Client'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CLIENTS HOME
══════════════════════════════════════════════════════ */
function ClientsHome({ userDisplayName, userEmail }) {
  const [clients,     setClients]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showModal,   setShowModal]   = useState(false);
  const [editClient,  setEditClient]  = useState(null);
  const [error,       setError]       = useState(null);

  useEffect(() => { loadClients(); }, []);

  async function loadClients() {
    setLoading(true);
    try {
      const data = await apiFetch('clients.list', { user_id: getUserId() });
      setClients(data);
    } catch (e) {
      setError('Could not load clients: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateClient(payload) {
    try {
      const newClient = await apiPost('clients.create', { user_id: getUserId(), ...payload });
      setClients(prev => [newClient, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      setError('Could not create client: ' + e.message);
    }
  }

  async function handleUpdateClient(clientId, payload) {
    try {
      await apiPost('clients.update', { client_id: clientId, ...payload });
      setClients(prev => prev.map(c => c.id === clientId ? { ...c, ...payload } : c)
        .sort((a, b) => a.name.localeCompare(b.name)));
    } catch (e) {
      setError('Could not update client: ' + e.message);
    }
  }

  async function handleDeleteClient(clientId) {
    try {
      await apiPost('clients.delete', { client_id: clientId });
      setClients(prev => prev.filter(c => c.id !== clientId));
    } catch (e) {
      setError('Could not delete client: ' + e.message);
    }
  }

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
            {clients.length} client{clients.length !== 1 ? 's' : ''}
          </p>
        </div>

        <button
          onClick={() => { setEditClient(null); setShowModal(true); }}
          className="btn-primary px-4 py-2.5 rounded-lg text-white text-sm font-medium flex items-center gap-2 flex-shrink-0">
          <Ico name="plus" size={15} stroke="white" strokeWidth={2.5} />
          New Client
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

        {/* Section header */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest"
            style={{ color: 'rgba(13,27,42,0.35)' }}>
            Clients — {clients.length}
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center gap-3 py-20 text-stone-400">
            <Spinner size={20} />
            <span className="text-sm">Loading your clients…</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div
              className="w-20 h-20 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(13,27,42,0.06)', border: '1px solid rgba(13,27,42,0.1)' }}>
              <Ico name="users" size={36} stroke="rgba(13,27,42,0.3)" />
            </div>
            <div>
              <h2 className="text-gray-900 font-semibold text-xl">No clients yet</h2>
              <p className="text-gray-500 text-sm mt-2 max-w-xs">
                Add your first client to start building your directory.
              </p>
            </div>
            <button
              onClick={() => { setEditClient(null); setShowModal(true); }}
              className="btn-primary px-6 py-3 rounded-lg text-white text-sm font-medium flex items-center gap-2 mt-2">
              <Ico name="plus" size={15} stroke="white" strokeWidth={2.5} />
              Add your first client
            </button>
          </div>
        )}

        {/* Client cards */}
        {!loading && clients.length > 0 && (
          <div className="grid gap-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {clients.map(c => (
              <ClientCard
                key={c.id}
                clientData={c}
                onEdit={(clientData) => { setEditClient(clientData); setShowModal(true); }}
                onDelete={handleDeleteClient}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create / Edit Client Modal */}
      {showModal && (
        <CreateClientModal
          initialClient={editClient}
          onClose={() => setShowModal(false)}
          onCreate={handleCreateClient}
          onUpdate={handleUpdateClient}
        />
      )}
    </div>
  );
}

export default ClientsHome;
export { ClientCard, CreateClientModal };
