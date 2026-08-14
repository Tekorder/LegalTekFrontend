'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/BillingPanel.jsx
   Invoices for the current project: header + line items
═══════════════════════════════════════════════ */

import { useState, useEffect, useCallback } from 'react';
import { apiFetch, apiPost } from '@/lib/api';
import { fmtMoney, fmtDate } from '@/lib/format';
import { Ico, Spinner } from '@/lib/icons';

const INVOICE_STATUS_STYLES = {
  draft: { label: 'Draft', color: '#6b7280', bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.2)' },
  sent:  { label: 'Sent',  color: '#b45309', bg: 'rgba(180,83,9,0.08)',    border: 'rgba(180,83,9,0.2)'   },
  paid:  { label: 'Paid',  color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.2)'  },
};

const emptyItem = () => ({ description: '', quantity: 1, unit_price: 0 });
const todayStr  = () => new Date().toISOString().slice(0, 10);

/* ══════════════════════════════════════════════════════
   INVOICE EDITOR — header + line items
══════════════════════════════════════════════════════ */
function InvoiceEditor({ caseId, caseClients, invoice, onSaved, onCancel, onDeleted }) {
  const isEdit = !!invoice;
  const [invoiceNumber, setInvoiceNumber] = useState(invoice?.invoice_number ?? '');
  const [clientId,      setClientId]      = useState(invoice?.client_id ? String(invoice.client_id) : '');
  const [status,        setStatus]        = useState(invoice?.status ?? 'draft');
  const [issueDate,     setIssueDate]     = useState(invoice?.issue_date ?? todayStr());
  const [dueDate,       setDueDate]       = useState(invoice?.due_date ?? '');
  const [notes,         setNotes]         = useState(invoice?.notes ?? '');
  const [items,         setItems]         = useState(
    invoice?.items?.length
      ? invoice.items.map(it => ({ description: it.description, quantity: Number(it.quantity), unit_price: Number(it.unit_price) }))
      : [emptyItem()]
  );
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState(null);

  const total = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unit_price) || 0), 0);

  function updateItem(idx, field, value) {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }
  function addItem()          { setItems(prev => [...prev, emptyItem()]); }
  function removeItem(idx)    { setItems(prev => prev.filter((_, i) => i !== idx)); }

  async function handleSave() {
    if (!invoiceNumber.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        case_id:        caseId,
        client_id:      clientId ? Number(clientId) : null,
        invoice_number: invoiceNumber.trim(),
        status,
        issue_date: issueDate,
        due_date:   dueDate || null,
        notes:      notes.trim(),
        items:      items.filter(it => it.description.trim()),
      };
      if (isEdit) {
        await apiPost('invoices.update', { invoice_id: invoice.id, ...payload });
      } else {
        await apiPost('invoices.create', payload);
      }
      onSaved();
    } catch (e) {
      setError(e.message || 'Could not save invoice');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiPost('invoices.delete', { invoice_id: invoice.id });
      onDeleted();
    } catch (e) {
      setError(e.message || 'Could not delete invoice');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 items-start">
        {/* Header card */}
        <div className="glass rounded-lg p-6" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#0d1b2a' }}>Invoice Header</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Invoice Number *
              </label>
              <input
                value={invoiceNumber}
                onChange={e => setInvoiceNumber(e.target.value)}
                placeholder="INV-0001"
                maxLength={50}
                className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Client
              </label>
              <select
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
                style={{ appearance: 'auto' }}>
                <option value="">No client</option>
                {caseClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={e => setIssueDate(e.target.value)}
                className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value)}
                className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
                style={{ appearance: 'auto' }}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Payment terms, references..."
              className="w-full chat-input rounded-lg px-4 py-2.5 text-sm resize-none"
            />
          </div>
        </div>

        {/* Line items */}
        <div className="glass rounded-lg p-6" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold" style={{ color: '#0d1b2a' }}>Line Items</h3>
            <button
              onClick={addItem}
              className="text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5"
              style={{ background: 'rgba(13,27,42,0.06)', border: '1px solid rgba(13,27,42,0.14)', color: '#374151' }}>
              <Ico name="plus" size={12} stroke="currentColor" />
              Add Line
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <div className="grid gap-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-1"
              style={{ gridTemplateColumns: '1fr 70px 90px 90px 28px' }}>
              <span>Description</span>
              <span>Qty</span>
              <span>Price</span>
              <span>Amount</span>
              <span></span>
            </div>

            {items.map((it, idx) => (
              <div key={idx} className="grid gap-2 items-center" style={{ gridTemplateColumns: '1fr 70px 90px 90px 28px' }}>
                <input
                  value={it.description}
                  onChange={e => updateItem(idx, 'description', e.target.value)}
                  placeholder="Service description"
                  className="chat-input rounded-lg px-3 py-2 text-sm min-w-0"
                />
                <input
                  type="number" min="0" step="0.01"
                  value={it.quantity}
                  onChange={e => updateItem(idx, 'quantity', e.target.value)}
                  className="chat-input rounded-lg px-2 py-2 text-sm min-w-0"
                />
                <input
                  type="number" min="0" step="0.01"
                  value={it.unit_price}
                  onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                  className="chat-input rounded-lg px-2 py-2 text-sm min-w-0"
                />
                <span className="text-sm text-gray-700 px-1 truncate">
                  {fmtMoney((Number(it.quantity) || 0) * (Number(it.unit_price) || 0))}
                </span>
                <button
                  onClick={() => removeItem(idx)}
                  disabled={items.length === 1}
                  className="p-1.5 rounded text-gray-400 hover:text-red-500 transition-colors disabled:opacity-30"
                  title="Remove line">
                  <Ico name="close" size={12} stroke="currentColor" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-4 pt-4" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Total</p>
              <p className="text-xl font-semibold" style={{ color: '#0d1b2a' }}>{fmtMoney(total)}</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm text-red-600"
          style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)' }}>
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="py-2.5 px-4 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)' }}>
          Cancel
        </button>
        {isEdit && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="py-2.5 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)', color: '#b91c1c' }}>
            {deleting ? <Spinner size={14} /> : 'Delete Invoice'}
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!invoiceNumber.trim() || saving}
          className="flex-1 btn-primary py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <><Spinner size={14} /> Saving…</> : (isEdit ? 'Save Changes' : 'Create Invoice')}
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   BILLING PANEL
══════════════════════════════════════════════════════ */
function BillingPanel({ caseId }) {
  const [invoices,       setInvoices]       = useState([]);
  const [caseClients,    setCaseClients]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(undefined); // undefined = list, null = new, object = edit

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('invoices.list', { case_id: caseId });
      setInvoices(data);
    } catch (e) {
      setError(e.message || 'Could not load invoices');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadInvoices(); }, [loadInvoices]);

  useEffect(() => {
    apiFetch('cases.clients', { case_id: caseId }).then(setCaseClients).catch(() => setCaseClients([]));
  }, [caseId]);

  async function openEdit(inv) {
    try {
      const full = await apiFetch('invoices.get', { invoice_id: inv.id });
      setEditingInvoice(full);
    } catch (e) {
      setError(e.message || 'Could not load invoice');
    }
  }

  function closeEditor() { setEditingInvoice(undefined); }

  function handleSaved() {
    setEditingInvoice(undefined);
    loadInvoices();
  }

  const billedTotal = invoices
    .filter(i => i.status !== 'draft')
    .reduce((sum, i) => sum + Number(i.total), 0);

  if (editingInvoice !== undefined) {
    return (
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ color: '#1a1a2e' }}>
        <header className="glass flex-shrink-0 px-5 py-3.5" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <h1 className="text-base font-semibold text-gray-900 leading-none">
            {editingInvoice ? `Edit Invoice ${editingInvoice.invoice_number}` : 'New Invoice'}
          </h1>
          <p className="text-gray-400 text-xs mt-1">Header, line items and totals</p>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <InvoiceEditor
            caseId={caseId}
            caseClients={caseClients}
            invoice={editingInvoice}
            onSaved={handleSaved}
            onCancel={closeEditor}
            onDeleted={handleSaved}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ color: '#1a1a2e' }}>
      <header className="glass flex-shrink-0 px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div>
          <h1 className="text-base font-semibold text-gray-900 leading-none">Billing</h1>
          <p className="text-gray-400 text-xs mt-1">
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} — {fmtMoney(billedTotal)} billed
          </p>
        </div>
        <button
          onClick={() => setEditingInvoice(null)}
          className="btn-primary px-4 py-2.5 rounded-lg text-white text-sm font-medium flex items-center gap-2">
          <Ico name="plus" size={15} stroke="white" strokeWidth={2.5} />
          New Invoice
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm text-red-600 flex items-center gap-3 max-w-2xl"
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
            <span className="text-sm">Loading invoices…</span>
          </div>
        )}

        {!loading && invoices.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center"
              style={{ background: 'rgba(13,27,42,0.06)', border: '1px solid rgba(13,27,42,0.1)' }}>
              <Ico name="dollar" size={28} stroke="rgba(13,27,42,0.3)" />
            </div>
            <div>
              <h2 className="text-gray-900 font-semibold text-base">No invoices yet</h2>
              <p className="text-gray-500 text-sm mt-1 max-w-xs">Create your first invoice for this project.</p>
            </div>
          </div>
        )}

        {!loading && invoices.length > 0 && (
          <div className="flex flex-col gap-2 max-w-2xl">
            {invoices.map(inv => {
              const st = INVOICE_STATUS_STYLES[inv.status] ?? INVOICE_STATUS_STYLES.draft;
              return (
                <div key={inv.id}
                  onClick={() => openEdit(inv)}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer transition-colors"
                  style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.08)' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(13,27,42,0.2)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{inv.invoice_number}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
                        style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {inv.client_name || 'No client'} · {fmtDate(inv.issue_date)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold flex-shrink-0" style={{ color: '#0d1b2a' }}>
                    {fmtMoney(inv.total)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default BillingPanel;
export { InvoiceEditor };
