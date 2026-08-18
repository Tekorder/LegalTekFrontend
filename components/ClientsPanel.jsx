'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/ClientsPanel.jsx
   Clients linked to the current case
═══════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiPost, getUserId } from '@/lib/api';
import { Ico, Spinner } from '@/lib/icons';

const getClientInitials = (name) =>
  name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

function ClientsPanel({ caseId }) {
  const [clients, setClients] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const [allClients,    setAllClients]    = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState('');
  const [adding,        setAdding]        = useState(false);
  const [removingId,    setRemovingId]    = useState(null);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('cases.clients', { case_id: caseId });
      setClients(data);
    } catch (e) {
      setError(e.message || 'Could not load clients');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadClients(); }, [loadClients]);

  useEffect(() => {
    apiFetch('clients.list', { user_id: getUserId() })
      .then(setAllClients)
      .catch(() => setAllClients([]));
  }, []);

  const attachedIds       = new Set(clients.map(c => c.id));
  const availableClients  = allClients.filter(c => !attachedIds.has(c.id));

  async function handleAdd() {
    if (!selectedToAdd || adding) return;
    setAdding(true);
    try {
      const added = await apiPost('cases.add_client', { case_id: caseId, client_id: Number(selectedToAdd) });
      setClients(prev => [...prev, added].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedToAdd('');
    } catch (e) {
      setError(e.message || 'Could not add client');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(clientId) {
    setRemovingId(clientId);
    try {
      await apiPost('cases.remove_client', { case_id: caseId, client_id: clientId });
      setClients(prev => prev.filter(c => c.id !== clientId));
    } catch (e) {
      setError(e.message || 'Could not remove client');
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ color: '#1a1a2e' }}>
      <header className="glass flex-shrink-0 px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <h1 className="text-base font-semibold text-gray-900 leading-none">Clients</h1>
        <p className="text-gray-400 text-xs mt-1">Clients linked to this case</p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">

        {/* Add client */}
        <div className="flex items-center gap-2 mb-5 max-w-md">
          <select
            value={selectedToAdd}
            onChange={e => setSelectedToAdd(e.target.value)}
            className="flex-1 chat-input rounded-lg px-3 py-2 text-sm min-w-0"
            style={{ appearance: 'auto' }}>
            <option value="">
              {availableClients.length === 0 ? 'No more clients to add' : 'Select a client to add…'}
            </option>
            {availableClients.map(c => (
              <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            disabled={!selectedToAdd || adding}
            className="flex-shrink-0 px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm font-medium transition-all disabled:opacity-40"
            style={{ background: 'rgba(13,27,42,0.08)', border: '1px solid rgba(13,27,42,0.18)', color: '#374151' }}>
            {adding ? <Spinner size={14} /> : <Ico name="plus" size={14} stroke="currentColor" />}
            Add
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm text-red-600 flex items-center gap-3 max-w-md"
            style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)' }}>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <Ico name="close" size={13} stroke="currentColor" />
            </button>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-3 py-16 text-stone-400">
            <Spinner size={20} />
            <span className="text-sm">Loading clients…</span>
          </div>
        )}

        {!loading && clients.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(13,27,42,0.06)', border: '1px solid rgba(13,27,42,0.1)' }}>
              <Ico name="users" size={28} stroke="rgba(13,27,42,0.3)" />
            </div>
            <div>
              <h2 className="text-gray-900 font-semibold text-base">No clients linked yet</h2>
              <p className="text-gray-500 text-sm mt-1 max-w-xs">Add a client above to link them to this case.</p>
            </div>
          </div>
        )}

        {!loading && clients.length > 0 && (
          <div className="flex flex-col gap-2 max-w-md">
            {clients.map(c => (
              <div key={c.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.08)' }}>
                <div
                  className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold"
                  style={{ background: 'linear-gradient(135deg,#0891b2,#7c3aed)' }}>
                  {getClientInitials(c.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate leading-none">{c.name}</p>
                  {(c.company || c.email) && (
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{c.company || c.email}</p>
                  )}
                </div>
                <button
                  onClick={() => handleRemove(c.id)}
                  disabled={removingId === c.id}
                  className="flex-shrink-0 p-1.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                  style={{ background: 'rgba(0,0,0,0.04)' }}
                  title="Remove from case">
                  {removingId === c.id
                    ? <Spinner size={12} />
                    : <Ico name="close" size={12} stroke="currentColor" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default ClientsPanel;
