'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/HearingsPanel.jsx
   Calendar of hearings: notes, outcome, and documents studied
═══════════════════════════════════════════════ */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { apiFetch, apiPost, apiUpload, getUserId } from '@/lib/api';
import { Ico, Spinner } from '@/lib/icons';

const HEARING_STATUS_STYLES = {
  scheduled: { label: 'Scheduled', color: '#b45309', bg: 'rgba(180,83,9,0.08)',   border: 'rgba(180,83,9,0.2)'   },
  completed: { label: 'Completed', color: '#059669', bg: 'rgba(5,150,105,0.08)',  border: 'rgba(5,150,105,0.2)'  },
  cancelled: { label: 'Cancelled', color: '#6b7280', bg: 'rgba(107,114,128,0.08)',border: 'rgba(107,114,128,0.2)'},
};

const WEEKDAYS    = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildMonthGrid(viewDate) {
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay      = new Date(year, month, 1);
  const startWeekday  = firstDay.getDay();
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function fmtHearingDateTime(dbDateTime) {
  if (!dbDateTime) return '';
  const d = new Date(dbDateTime.replace(' ', 'T'));
  return d.toLocaleString('en', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function splitDbDateTime(dbDateTime) {
  if (!dbDateTime) return { date: '', time: '' };
  const [date, time] = dbDateTime.split(' ');
  return { date, time: (time || '00:00:00').slice(0, 5) };
}

/* ══════════════════════════════════════════════════════
   CREATE HEARING MODAL
══════════════════════════════════════════════════════ */
function CreateHearingModal({ initialDate, onClose, onCreate }) {
  const [title,    setTitle]    = useState('');
  const [date,     setDate]     = useState(initialDate || dateKey(new Date()));
  const [time,     setTime]     = useState('09:00');
  const [location, setLocation] = useState('');
  const [saving,   setSaving]   = useState(false);
  const titleRef = useRef();

  useEffect(() => {
    titleRef.current?.focus();
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  async function handleSubmit() {
    if (!title.trim() || !date || saving) return;
    setSaving(true);
    try {
      await onCreate({
        title: title.trim(),
        hearing_date: `${date} ${time || '00:00'}:00`,
        location: location.trim(),
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(13,27,42,0.45)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div
        className="glass rounded-lg p-6 w-full max-w-md mx-4"
        style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 8px 40px rgba(0,0,0,0.15)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center gap-3 mb-6">
          <div className="btn-primary w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0">
            <Ico name="calendar" size={16} stroke="white" strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-gray-900 font-semibold text-base leading-none">New Hearing</h3>
            <p className="text-gray-500 text-xs mt-0.5">Schedule a hearing for this case</p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Title *</label>
            <input
              ref={titleRef}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Preliminary Hearing"
              maxLength={200}
              className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full chat-input rounded-lg px-4 py-2.5 text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                className="w-full chat-input rounded-lg px-4 py-2.5 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Location</label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Courtroom 4"
              className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors"
            style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)' }}>
            Cancel
          </button>
          <button onClick={handleSubmit}
            disabled={!title.trim() || !date || saving}
            className="flex-1 btn-primary py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <><Spinner size={14} /> Creating…</> : <><Ico name="plus" size={14} stroke="white" /> Create Hearing</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   HEARING DETAIL — header + notes + outcome + documents
══════════════════════════════════════════════════════ */
function HearingDetail({ caseId, hearing, onBack, onSaved, onDeleted }) {
  const initialSplit = splitDbDateTime(hearing.hearing_date);
  const [title,     setTitle]     = useState(hearing.title);
  const [date,      setDate]      = useState(initialSplit.date);
  const [time,      setTime]      = useState(initialSplit.time);
  const [location,  setLocation]  = useState(hearing.location || '');
  const [status,    setStatus]    = useState(hearing.status);
  const [notes,     setNotes]     = useState(hearing.notes || '');
  const [outcome,   setOutcome]   = useState(hearing.outcome || '');
  const [documents, setDocuments] = useState(hearing.documents || []);

  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState(null);
  const fileRef = useRef();

  async function handleSave() {
    if (!title.trim() || !date || saving) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost('hearings.update', {
        hearing_id: hearing.id,
        title: title.trim(),
        hearing_date: `${date} ${time || '00:00'}:00`,
        location: location.trim(),
        notes: notes.trim(),
        outcome: outcome.trim(),
        status,
      });
      onSaved();
    } catch (e) {
      setError(e.message || 'Could not save hearing');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiPost('hearings.delete', { hearing_id: hearing.id });
      onDeleted();
    } catch (e) {
      setError(e.message || 'Could not delete hearing');
    } finally {
      setDeleting(false);
    }
  }

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('user_id', getUserId());
      fd.append('hearing_id', hearing.id);
      if (caseId) fd.append('case_id', caseId);
      const uploaded = await apiUpload('documents.upload', fd);
      setDocuments(prev => [uploaded, ...prev]);
    } catch (e) {
      setError('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDoc(docId) {
    try {
      await apiPost('documents.delete', { document_id: docId });
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (e) {
      setError('Could not delete document: ' + e.message);
    }
  }

  const st = HEARING_STATUS_STYLES[status] ?? HEARING_STATUS_STYLES.scheduled;

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ color: '#1a1a2e' }}>
      <header className="glass flex-shrink-0 px-5 py-3.5 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <button onClick={onBack}
          className="p-1.5 rounded text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
          style={{ background: 'rgba(0,0,0,0.04)' }}
          title="Back to calendar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-base font-semibold text-gray-900 leading-none truncate">{hearing.title}</h1>
          <p className="text-gray-400 text-xs mt-1">Notes, outcome and documents for this hearing</p>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded flex-shrink-0"
          style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>
          {st.label}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5 items-start max-w-4xl">
          {/* Header card */}
          <div className="glass rounded-lg p-6" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#0d1b2a' }}>Hearing Details</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
                  className="w-full chat-input rounded-lg px-4 py-2.5 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Date *</label>
                  <input type="date" value={date} onChange={e => setDate(e.target.value)}
                    className="w-full chat-input rounded-lg px-4 py-2.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Time</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)}
                    className="w-full chat-input rounded-lg px-4 py-2.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Location</label>
                <input value={location} onChange={e => setLocation(e.target.value)}
                  className="w-full chat-input rounded-lg px-4 py-2.5 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Status</label>
                <select value={status} onChange={e => setStatus(e.target.value)}
                  className="w-full chat-input rounded-lg px-4 py-2.5 text-sm" style={{ appearance: 'auto' }}>
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notes + Outcome */}
          <div className="glass rounded-lg p-6" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: '#0d1b2a' }}>Notes &amp; Outcome</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Hearing Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5}
                  placeholder="What was discussed, arguments made, judge's comments..."
                  className="w-full chat-input rounded-lg px-4 py-2.5 text-sm resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">Results / Outcome</label>
                <textarea value={outcome} onChange={e => setOutcome(e.target.value)} rows={5}
                  placeholder="Ruling, next steps, deadlines set..."
                  className="w-full chat-input rounded-lg px-4 py-2.5 text-sm resize-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Documents studied */}
        <div className="glass rounded-lg p-6 mb-5 max-w-4xl" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: '#0d1b2a' }}>Documents</h3>
              <p className="text-xs text-gray-400 mt-0.5">Documents studied for this hearing</p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="text-xs font-semibold px-3 py-1.5 rounded flex items-center gap-1.5 disabled:opacity-50 flex-shrink-0"
              style={{ background: 'rgba(13,27,42,0.06)', border: '1px solid rgba(13,27,42,0.14)', color: '#374151' }}>
              {uploading ? <Spinner size={12} /> : <Ico name="upload" size={12} stroke="currentColor" />}
              Upload .docx
            </button>
            <input ref={fileRef} type="file" accept=".docx" className="hidden"
              onChange={e => { handleFile(e.target.files[0]); e.target.value = ''; }} />
          </div>

          {documents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No documents uploaded yet.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {documents.map(d => (
                <div key={d.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <Ico name="file" size={16} stroke="rgba(212,175,55,0.7)" className="flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate leading-none">{d.original_name}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDoc(d.id)}
                    className="flex-shrink-0 p-1.5 rounded text-gray-400 hover:text-red-500 transition-colors"
                    style={{ background: 'rgba(0,0,0,0.04)' }}
                    title="Remove document">
                    <Ico name="close" size={12} stroke="currentColor" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm text-red-600 max-w-4xl"
            style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)' }}>
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 max-w-4xl">
          <button onClick={onBack}
            className="py-2.5 px-4 rounded-lg text-sm text-gray-500 hover:text-gray-700 transition-colors"
            style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)' }}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="py-2.5 px-4 rounded-lg text-sm font-medium disabled:opacity-50"
            style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)', color: '#b91c1c' }}>
            {deleting ? <Spinner size={14} /> : 'Delete Hearing'}
          </button>
          <button onClick={handleSave} disabled={!title.trim() || !date || saving}
            className="flex-1 btn-primary py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50">
            {saving ? <><Spinner size={14} /> Saving…</> : 'Save Changes'}
          </button>
        </div>
      </div>
    </main>
  );
}

/* ══════════════════════════════════════════════════════
   HEARINGS PANEL — calendar + list
══════════════════════════════════════════════════════ */
function HearingsPanel({ caseId }) {
  const [hearings,        setHearings]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState(null);
  const [viewMonth,       setViewMonth]       = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay,     setSelectedDay]     = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [openHearing,     setOpenHearing]     = useState(null);

  const loadHearings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch('hearings.list', { case_id: caseId });
      setHearings(data);
    } catch (e) {
      setError(e.message || 'Could not load hearings');
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadHearings(); }, [loadHearings]);

  const hearingsByDay = useMemo(() => {
    const map = {};
    hearings.forEach(h => {
      const key = h.hearing_date.slice(0, 10);
      (map[key] = map[key] || []).push(h);
    });
    return map;
  }, [hearings]);

  const monthCells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const todayKey    = dateKey(new Date());

  async function handleCreateHearing(payload) {
    try {
      await apiPost('hearings.create', { case_id: caseId, ...payload });
      await loadHearings();
    } catch (e) {
      setError(e.message || 'Could not create hearing');
    }
  }

  async function openDetail(hearingSummary) {
    try {
      const full = await apiFetch('hearings.get', { hearing_id: hearingSummary.id });
      setOpenHearing(full);
    } catch (e) {
      setError(e.message || 'Could not load hearing');
    }
  }

  function backToCalendar() {
    setOpenHearing(null);
    loadHearings();
  }

  if (openHearing) {
    return (
      <HearingDetail
        caseId={caseId}
        hearing={openHearing}
        onBack={backToCalendar}
        onSaved={backToCalendar}
        onDeleted={backToCalendar}
      />
    );
  }

  const selectedDayHearings = selectedDay ? (hearingsByDay[selectedDay] || []) : [];

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ color: '#1a1a2e' }}>
      <header className="glass flex-shrink-0 px-5 py-3.5 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <div>
          <h1 className="text-base font-semibold text-gray-900 leading-none">Hearings</h1>
          <p className="text-gray-400 text-xs mt-1">Calendar, notes and documents studied per hearing</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary px-4 py-2.5 rounded-lg text-white text-sm font-medium flex items-center gap-2">
          <Ico name="plus" size={15} stroke="white" strokeWidth={2.5} />
          New Hearing
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg text-sm text-red-600 flex items-center gap-3 max-w-3xl"
            style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)' }}>
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)}>
              <Ico name="close" size={13} stroke="currentColor" />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-stone-400">
            <Spinner size={20} />
            <span className="text-sm">Loading hearings…</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5 max-w-4xl">
            {/* Calendar */}
            <div className="glass rounded-lg p-5" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  className="p-1.5 rounded text-gray-500 hover:text-gray-800 transition-colors"
                  style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 18l-6-6 6-6" />
                  </svg>
                </button>
                <h2 className="text-sm font-semibold" style={{ color: '#0d1b2a' }}>
                  {MONTH_NAMES[viewMonth.getMonth()]} {viewMonth.getFullYear()}
                </h2>
                <button
                  onClick={() => setViewMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  className="p-1.5 rounded text-gray-500 hover:text-gray-800 transition-colors"
                  style={{ background: 'rgba(0,0,0,0.04)' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-gray-400 mb-1.5">
                {WEEKDAYS.map(w => <span key={w}>{w}</span>)}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {monthCells.map((cellDate, idx) => {
                  if (!cellDate) return <div key={idx} />;
                  const key = dateKey(cellDate);
                  const dayHearings = hearingsByDay[key] || [];
                  const isToday = key === todayKey;
                  const isSelected = key === selectedDay;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedDay(key)}
                      className="aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-xs transition-colors"
                      style={{
                        background: isSelected ? 'rgba(212,175,55,0.16)' : isToday ? 'rgba(13,27,42,0.05)' : 'transparent',
                        border: `1px solid ${isSelected ? 'rgba(212,175,55,0.4)' : 'transparent'}`,
                        color: '#374151',
                      }}>
                      <span className={isToday ? 'font-bold' : ''}>{cellDate.getDate()}</span>
                      {dayHearings.length > 0 && (
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#d4af37' }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Day / upcoming list */}
            <div className="glass rounded-lg p-5" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
              {selectedDay ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold" style={{ color: '#0d1b2a' }}>
                      {new Date(selectedDay + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </h3>
                    <button onClick={() => setSelectedDay(null)} className="text-xs text-gray-400 hover:text-gray-600">
                      Clear
                    </button>
                  </div>
                  {selectedDayHearings.length === 0 ? (
                    <p className="text-sm text-gray-400 mb-3">No hearings this day.</p>
                  ) : (
                    <div className="flex flex-col gap-2 mb-3">
                      {selectedDayHearings.map(h => (
                        <button key={h.id} onClick={() => openDetail(h)}
                          className="text-left px-3 py-2.5 rounded-lg transition-colors"
                          style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.07)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}>
                          <p className="text-sm font-medium text-gray-900 truncate">{h.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{fmtHearingDateTime(h.hearing_date)}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="w-full py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5"
                    style={{ background: 'rgba(13,27,42,0.06)', border: '1px solid rgba(13,27,42,0.14)', color: '#374151' }}>
                    <Ico name="plus" size={12} stroke="currentColor" />
                    Add hearing for this day
                  </button>
                </>
              ) : (
                <>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: '#0d1b2a' }}>Upcoming Hearings</h3>
                  {hearings.length === 0 ? (
                    <div className="text-center py-6">
                      <Ico name="calendar" size={28} stroke="rgba(13,27,42,0.25)" className="mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No hearings scheduled yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {hearings.slice(0, 8).map(h => {
                        const st = HEARING_STATUS_STYLES[h.status] ?? HEARING_STATUS_STYLES.scheduled;
                        return (
                          <button key={h.id} onClick={() => openDetail(h)}
                            className="text-left px-3 py-2.5 rounded-lg transition-colors"
                            style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.08)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.07)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900 truncate">{h.title}</p>
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0"
                                style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color }}>
                                {st.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{fmtHearingDateTime(h.hearing_date)}</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateHearingModal
          initialDate={selectedDay || undefined}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateHearing}
        />
      )}
    </main>
  );
}

export default HearingsPanel;
export { CreateHearingModal, HearingDetail };
