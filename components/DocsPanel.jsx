'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/DocsPanel.jsx
   Mini-drive: folders + files with breadcrumb nav
═══════════════════════════════════════════════ */

import { Fragment, useState, useRef, useEffect, useCallback } from 'react';
import { apiFetch, apiPost, apiUpload, getUserId, API } from '@/lib/api';
import { fmtTime, fmtDate } from '@/lib/format';
import { Ico, Spinner } from '@/lib/icons';

/* ── File size formatter ─────────────────────── */
const fmtSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024)        return bytes + ' B';
  if (bytes < 1048576)     return (bytes / 1024).toFixed(0) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
};

/* ── Status badge style ──────────────────────── */
const STATUS = {
  ready:      { label: 'Ready',       color: '#059669', bg: 'rgba(5,150,105,0.08)',   border: 'rgba(5,150,105,0.2)'  },
  processing: { label: 'Processing…', color: '#b45309', bg: 'rgba(180,83,9,0.08)',    border: 'rgba(180,83,9,0.2)'   },
  error:      { label: 'Error',       color: '#b91c1c', bg: 'rgba(185,28,28,0.08)',   border: 'rgba(185,28,28,0.2)'  },
  pending:    { label: 'Pending',     color: '#6d28d9', bg: 'rgba(109,40,217,0.07)',  border: 'rgba(109,40,217,0.18)'},
};
const statusStyle = (s) => STATUS[s] ?? { label: s, color: '#6b7280', bg: 'transparent', border: 'transparent' };

/* ══════════════════════════════════════════════
   FOLDER CARD
══════════════════════════════════════════════ */
function FolderCard({ folder, onOpen, onRename, onDelete }) {
  const [menuOpen, setMenuOpen]   = useState(false);
  const [renaming, setRenaming]   = useState(false);
  const [nameVal,  setNameVal]    = useState(folder.name);
  const inputRef = useRef();

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  function commitRename() {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== folder.name) onRename(folder.id, trimmed);
    setRenaming(false);
    setMenuOpen(false);
  }

  const itemCount = (folder.subfolder_count ?? 0) + (folder.file_count ?? 0);

  return (
    <div
      className="group relative flex flex-col gap-2 px-3 py-2.5 rounded-lg cursor-pointer select-none transition-all"
      style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(0,0,0,0.08)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(13,27,42,0.16)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'}
      onClick={() => !renaming && !menuOpen && onOpen(folder)}
      onDoubleClick={() => !renaming && onOpen(folder)}>

      {/* Folder icon + name row */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(212,175,55,0.14)', border: '1px solid rgba(212,175,55,0.28)' }}>
          <Ico name="folder" size={15} stroke="#d4af37" />
        </div>

        {renaming ? (
          <input
            ref={inputRef}
            value={nameVal}
            onChange={e => setNameVal(e.target.value)}
            onKeyDown={e => {
              e.stopPropagation();
              if (e.key === 'Enter')  commitRename();
              if (e.key === 'Escape') { setNameVal(folder.name); setRenaming(false); }
            }}
            onClick={e => e.stopPropagation()}
            className="flex-1 bg-transparent text-gray-900 text-sm outline-none"
            style={{ borderBottom: '1px solid rgba(13,27,42,0.3)', minWidth: 0 }}
          />
        ) : (
          <span className="flex-1 text-sm font-medium text-gray-800 truncate">{folder.name}</span>
        )}

        {/* Context menu button */}
        {!renaming && (
          <button
            className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded transition-all text-gray-400 hover:text-gray-700"
            onClick={e => { e.stopPropagation(); setMenuOpen(v => !v); }}
            title="Options">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        )}
      </div>

      {/* Item count */}
      <p className="text-[11px] text-gray-400 pl-10">
        {itemCount === 0 ? 'Empty' : `${itemCount} item${itemCount !== 1 ? 's' : ''}`}
      </p>

      {/* Dropdown menu */}
      {menuOpen && (
        <div
          className="absolute right-2 top-8 z-20 rounded-lg overflow-hidden shadow-lg"
          style={{ background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,0,0,0.1)', minWidth: '130px' }}
          onClick={e => e.stopPropagation()}>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-stone-100 transition-colors"
            onClick={() => { setRenaming(true); setMenuOpen(false); }}>
            <Ico name="pencil" size={13} stroke="currentColor" /> Rename
          </button>
          <button
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
            onClick={() => { onDelete(folder.id); setMenuOpen(false); }}>
            <Ico name="trash" size={13} stroke="currentColor" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   FILE CARD
══════════════════════════════════════════════ */
function FileCard({ doc, onDelete, onEdit, onDownload, onAskAI }) {
  const st = statusStyle(doc.status);
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-lg group transition-all"
      style={{ background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(0,0,0,0.07)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(13,27,42,0.14)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(0,0,0,0.07)'}>

      <div className="w-9 h-9 rounded flex-shrink-0 flex items-center justify-center"
        style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
        <Ico name="file" size={16} stroke="#d4af37" strokeWidth={1.5} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate leading-none">{doc.original_name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-[11px] text-gray-400">{fmtSize(doc.file_size)}</span>
          {doc.page_count && <>
            <span className="text-gray-300">·</span>
            <span className="text-[11px] text-gray-400">{doc.page_count}p</span>
          </>}
          {doc.char_count && <>
            <span className="text-gray-300">·</span>
            <span className="text-[11px] text-gray-400">{Number(doc.char_count).toLocaleString()} ch</span>
          </>}
          <span className="text-gray-300">·</span>
          <span className="text-[11px] text-gray-400">{fmtDate(doc.created_at)}</span>
        </div>
        {doc.conversation_title && (
          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(13,27,42,0.45)' }}>
            ↳ {doc.conversation_title}
          </p>
        )}
      </div>

      <span className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded"
        style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
        {st.label}
      </span>

      <div className="flex items-center gap-1 flex-shrink-0">
        {onAskAI && doc.status === 'ready' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onAskAI(doc); }}
            title="Ask AI about this document"
            className="p-1.5 rounded text-gray-400 transition-colors"
            style={{ background: 'rgba(0,0,0,0.04)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#b8902a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}>
            <Ico name="chat" size={13} stroke="currentColor" />
          </button>
        )}
        {onDownload && doc.status === 'ready' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDownload(doc); }}
            title="Download as .docx"
            className="p-1.5 rounded text-gray-400 transition-colors"
            style={{ background: 'rgba(0,0,0,0.04)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#0d1b2a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}>
            <Ico name="download" size={13} stroke="currentColor" />
          </button>
        )}
        {onEdit && (
          <button
            onClick={() => onEdit(doc.id)}
            title="Edit document"
            className="p-1.5 rounded text-gray-400 hover:text-stone-700 transition-colors"
            style={{ background: 'rgba(0,0,0,0.04)' }}>
            <Ico name="pencil" size={13} stroke="currentColor" />
          </button>
        )}
        <button
          onClick={() => onDelete(doc.id)}
          title="Delete"
          className="p-1.5 rounded text-gray-400 hover:text-red-500 transition-colors"
          style={{ background: 'rgba(0,0,0,0.04)' }}>
          <Ico name="trash" size={13} stroke="currentColor" />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   DOCS PANEL  (mini-drive root)
══════════════════════════════════════════════ */
function DocsPanel({ caseId, onEditDoc, onOpenAnalyze, onAskDocAI }) {
  const [folderStack,    setFolderStack]    = useState([]);
  const [folders,        setFolders]        = useState([]);
  const [docs,           setDocs]           = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [dragging,       setDragging]       = useState(false);
  const [uploading,      setUploading]      = useState(false);
  const [error,          setError]          = useState(null);
  const [showNewFolder,  setShowNewFolder]  = useState(false);
  const [newFolderName,  setNewFolderName]  = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [showNewEmptyDoc, setShowNewEmptyDoc] = useState(false);
  const [emptyDocTitle,   setEmptyDocTitle]   = useState('Untitled document');
  const [creatingEmpty,   setCreatingEmpty]   = useState(false);
  const [integrationsDemoOpen, setIntegrationsDemoOpen] = useState(false);
  const [integrationsDemoEntered, setIntegrationsDemoEntered] = useState(false);

  const fileRef      = useRef();
  const newFolderRef = useRef();
  const emptyDocRef  = useRef();

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : null;

  useEffect(() => {
    if (!integrationsDemoOpen) {
      setIntegrationsDemoEntered(false);
      return;
    }
    setIntegrationsDemoEntered(false);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setIntegrationsDemoEntered(true));
    });
    return () => cancelAnimationFrame(id);
  }, [integrationsDemoOpen]);

  function closeIntegrationsDemo() {
    setIntegrationsDemoEntered(false);
    window.setTimeout(() => setIntegrationsDemoOpen(false), 280);
  }

  const loadContents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const baseParams = caseId ? { case_id: caseId } : { user_id: getUserId() };
      const [foldersData, docsData] = await Promise.all([
        apiFetch('folders.list', { ...baseParams, parent_id: currentFolderId ?? '' }),
        apiFetch('documents.list_all', { ...baseParams, folder_id: currentFolderId ?? 0 }),
      ]);
      setFolders(foldersData);
      setDocs(docsData);
    } catch (e) {
      setError('Could not load contents: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [caseId, currentFolderId]);

  useEffect(() => { loadContents(); }, [loadContents]);

  useEffect(() => {
    if (showNewFolder) newFolderRef.current?.focus();
  }, [showNewFolder]);

  useEffect(() => {
    if (showNewEmptyDoc) emptyDocRef.current?.focus();
  }, [showNewEmptyDoc]);

  async function handleCreateEmptyDoc() {
    const title = emptyDocTitle.trim() || 'Untitled document';
    if (creatingEmpty || !caseId) return;
    setCreatingEmpty(true);
    setError(null);
    try {
      await apiPost('documents.create_empty', {
        user_id:   getUserId(),
        case_id:   caseId,
        folder_id: currentFolderId ?? 0,
        title,
      });
      setShowNewEmptyDoc(false);
      setEmptyDocTitle('Untitled document');
      await loadContents();
    } catch (e) {
      setError('Could not create document: ' + e.message);
    } finally {
      setCreatingEmpty(false);
    }
  }

  function openFolder(folder) {
    setFolderStack(prev => [...prev, { id: folder.id, name: folder.name }]);
  }

  function breadcrumbNav(idx) {
    if (idx === -1) setFolderStack([]);
    else setFolderStack(prev => prev.slice(0, idx + 1));
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim();
    if (!name || creatingFolder) return;
    setCreatingFolder(true);
    try {
      const folder = await apiPost('folders.create', {
        case_id: caseId ?? '', parent_id: currentFolderId ?? '',
        name, user_id: getUserId(),
      });
      setFolders(prev => [...prev, folder].sort((a, b) => a.name.localeCompare(b.name)));
      setNewFolderName('');
      setShowNewFolder(false);
    } catch (e) {
      setError('Could not create folder: ' + e.message);
    } finally {
      setCreatingFolder(false);
    }
  }

  async function handleRenameFolder(id, name) {
    try {
      await apiPost('folders.rename', { id, name });
      setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    } catch (e) { setError('Rename failed: ' + e.message); }
  }

  async function handleDeleteFolder(id) {
    try {
      await apiPost('folders.delete', { id });
      setFolders(prev => prev.filter(f => f.id !== id));
    } catch (e) { setError('Could not delete folder: ' + e.message); }
  }

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    const tempId = `tmp-${Date.now()}`;
    setDocs(prev => [{
      id: tempId, original_name: file.name, file_size: file.size,
      status: 'processing', created_at: new Date().toISOString(),
      folder_id: currentFolderId, conversation_title: null,
      char_count: null, page_count: null,
    }, ...prev]);

    try {
      const fd = new FormData();
      fd.append('file',    file);
        fd.append('user_id', getUserId());
      if (caseId)          fd.append('case_id',   caseId);
      if (currentFolderId) fd.append('folder_id', currentFolderId);

      const uploaded = await apiUpload('documents.upload', fd);
      setDocs(prev => prev.map(d =>
        d.id === tempId ? { ...uploaded, conversation_title: null } : d
      ));
    } catch (e) {
      setDocs(prev => prev.map(d => d.id === tempId ? { ...d, status: 'error' } : d));
      setError('Upload failed: ' + e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteDoc(docId) {
    try {
      await apiPost('documents.delete', { document_id: docId });
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (e) { setError('Could not delete document: ' + e.message); }
  }

  async function handleDownloadDoc(doc) {
    setError(null);
    try {
      const res = await fetch(`${API}?action=documents.export_docx&document_id=${encodeURIComponent(doc.id)}`);
      const ct = res.headers.get('Content-Type') || '';
      if (!res.ok || ct.includes('application/json')) {
        let msg = 'Download failed';
        try {
          const j = await res.json();
          if (j.error) msg = j.error;
        } catch (_) {}
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      let name = doc.original_name || 'document.docx';
      if (!/\.docx$/i.test(name)) {
        name = name.replace(/\.[^.]+$/, '');
        name = (name || 'document') + '.docx';
      }
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message || 'Could not download document');
    }
  }

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const isEmpty = !loading && folders.length === 0 && docs.length === 0;

  return (
    <main className="relative flex-1 flex flex-col min-w-0 overflow-hidden" style={{ color: '#1a1a2e' }}>

      {/* ── Header ── */}
      <header className="glass flex-shrink-0 px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 flex-wrap mb-2.5">
          <button
            onClick={() => breadcrumbNav(-1)}
            className="flex items-center gap-1.5 text-sm font-medium transition-colors"
            style={{ color: currentFolderId ? '#d4af37' : '#0d1b2a' }}>
            <Ico name="folderopen" size={14} stroke="currentColor" />
            Repository
          </button>
          {folderStack.map((f, i) => (
            <Fragment key={f.id}>
              <Ico name="chevright" size={11} stroke="rgba(13,27,42,0.3)" />
              <button
                onClick={() => breadcrumbNav(i)}
                className="text-sm font-medium transition-colors"
                style={{ color: i === folderStack.length - 1 ? '#0d1b2a' : '#d4af37' }}>
                {f.name}
              </button>
            </Fragment>
          ))}
        </div>

        {/* Actions row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setShowNewFolder(v => !v); setNewFolderName(''); setShowNewEmptyDoc(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{
              background: showNewFolder ? 'rgba(13,27,42,0.1)' : 'rgba(13,27,42,0.05)',
              border:     '1px solid rgba(13,27,42,0.14)',
              color:      '#374151',
            }}>
            <Ico name="folder" size={13} stroke="currentColor" />
            New Folder
          </button>

          {caseId && (
            <button
              type="button"
              onClick={() => { setShowNewEmptyDoc(v => !v); setShowNewFolder(false); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background: showNewEmptyDoc ? 'rgba(212,175,55,0.12)' : 'rgba(13,27,42,0.06)',
                border:     `1px solid ${showNewEmptyDoc ? 'rgba(212,175,55,0.35)' : 'rgba(13,27,42,0.14)'}`,
                color:      showNewEmptyDoc ? '#0d1b2a' : '#374151',
              }}>
              <Ico name="fileplus" size={13} stroke={showNewEmptyDoc ? '#b8902a' : 'currentColor'} />
              Blank document
            </button>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{
              background: 'rgba(13,27,42,0.06)',
              border:     '1px solid rgba(13,27,42,0.14)',
              color:      '#374151',
            }}>
            <Ico name="upload" size={13} stroke="currentColor" />
            Upload .docx
          </button>

          {caseId && onOpenAnalyze && (
            <button
              type="button"
              onClick={onOpenAnalyze}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background: 'rgba(13,27,42,0.08)',
                border:     '1px solid rgba(212,175,55,0.35)',
                color:      '#0d1b2a',
              }}>
              <Ico name="chart" size={13} stroke="#b8902a" />
              Analyze
            </button>
          )}
          <input ref={fileRef} type="file" accept=".docx" className="hidden"
            onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />

          <p className="ml-auto text-[11px] text-gray-400">
            {folders.length > 0 && `${folders.length} folder${folders.length !== 1 ? 's' : ''}`}
            {folders.length > 0 && docs.length > 0 && ' · '}
            {docs.length > 0 && `${docs.length} file${docs.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </header>

      {/* ── Error banner ── */}
      {error && (
        <div className="flex-shrink-0 mx-5 mt-3 px-4 py-2.5 rounded-lg text-sm text-red-600 flex items-center gap-2"
          style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)' }}>
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}>
            <Ico name="close" size={13} stroke="currentColor" />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* ── New blank document (name → API) ── */}
        {caseId && showNewEmptyDoc && (
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(212,175,55,0.28)' }}>
            <Ico name="fileplus" size={15} stroke="#d4af37" />
            <input
              ref={emptyDocRef}
              value={emptyDocTitle}
              onChange={e => setEmptyDocTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleCreateEmptyDoc();
                if (e.key === 'Escape') { setShowNewEmptyDoc(false); setEmptyDocTitle('Untitled document'); }
              }}
              placeholder="Document name…"
              className="flex-1 bg-transparent text-gray-900 text-sm outline-none"
            />
            <button
              onClick={handleCreateEmptyDoc}
              disabled={creatingEmpty}
              className="px-2.5 py-1 rounded text-xs font-medium disabled:opacity-40 transition-all"
              style={{ background: 'rgba(13,27,42,0.08)', color: '#374151', border: '1px solid rgba(13,27,42,0.14)' }}>
              {creatingEmpty ? <Spinner size={12} /> : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowNewEmptyDoc(false); setEmptyDocTitle('Untitled document'); }}
              className="text-gray-400 hover:text-gray-600 transition-colors">
              <Ico name="close" size={13} stroke="currentColor" />
            </button>
          </div>
        )}

        {/* ── New folder input ── */}
        {showNewFolder && (
          <div
            className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg"
            style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(13,27,42,0.14)' }}>
            <Ico name="folder" size={15} stroke="#d4af37" />
            <input
              ref={newFolderRef}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter')  handleCreateFolder();
                if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName(''); }
              }}
              placeholder="Folder name…"
              className="flex-1 bg-transparent text-gray-900 text-sm outline-none"
            />
            <button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || creatingFolder}
              className="px-2.5 py-1 rounded text-xs font-medium disabled:opacity-40 transition-all"
              style={{ background: 'rgba(13,27,42,0.08)', color: '#374151', border: '1px solid rgba(13,27,42,0.14)' }}>
              {creatingFolder ? <Spinner size={12} /> : 'Create'}
            </button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }}
              className="text-gray-400 hover:text-gray-600 transition-colors">
              <Ico name="close" size={13} stroke="currentColor" />
            </button>
          </div>
        )}

        {/* ── Drop zone ── */}
        <div
          className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all ${dragging ? 'dragging' : ''}`}
          style={{
            borderColor: dragging ? 'rgba(13,27,42,0.4)' : 'rgba(13,27,42,0.14)',
            background:  dragging ? 'rgba(212,175,55,0.09)' : 'transparent',
          }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}>
          <div className="flex items-center justify-center gap-3">
            <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.25)' }}>
              <Ico name="upload" size={18} stroke="#d4af37" strokeWidth={1.5} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-gray-600 leading-none">
                {dragging ? 'Drop to upload here' : 'Drag & drop a .docx'}
              </p>
              <p className="text-gray-400 text-xs mt-1">
                {currentFolderId
                  ? `Uploads into "${folderStack[folderStack.length - 1]?.name}" — or use Blank document above`
                  : 'Upload to root, create a blank document, or open a folder'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-stone-400 text-sm">
            <Spinner size={16} /> Loading…
          </div>
        )}

        {/* ── Empty state ── */}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <Ico name="folder" size={40} stroke="rgba(13,27,42,0.18)" strokeWidth={1.3} />
            <p className="text-gray-400 text-sm">This folder is empty.</p>
            <p className="text-gray-300 text-xs">Create a folder, a blank document, or upload a .docx.</p>
          </div>
        )}

        {/* ── Folders grid ── */}
        {!loading && folders.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5"
              style={{ color: 'rgba(13,27,42,0.32)' }}>
              Folders
            </p>
            <div className="grid grid-cols-2 gap-2">
              {folders.map(f => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  onOpen={openFolder}
                  onRename={handleRenameFolder}
                  onDelete={handleDeleteFolder}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Files list ── */}
        {!loading && docs.length > 0 && (
          <section>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5"
              style={{ color: 'rgba(13,27,42,0.32)' }}>
              Files
            </p>
            <div className="flex flex-col gap-2">
              {docs.map(doc => (
                <FileCard
                  key={doc.id}
                  doc={doc}
                  onDelete={handleDeleteDoc}
                  onEdit={onEditDoc}
                  onDownload={handleDownloadDoc}
                  onAskAI={onAskDocAI}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Footer: demo integrations (opens side panel) ── */}
      <footer
        className="flex-shrink-0 px-5 py-3 flex items-center justify-center"
        style={{
          borderTop: '1px solid rgba(0,0,0,0.07)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(250,250,249,0.92) 100%)',
        }}>
        <button
          type="button"
          onClick={() => setIntegrationsDemoOpen(true)}
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all w-full max-w-md justify-center"
          style={{
            color: '#0d1b2a',
            background: 'rgba(255,255,255,0.9)',
            border: '1px solid rgba(13,27,42,0.12)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(212,175,55,0.45)';
            e.currentTarget.style.background = 'rgba(255,255,255,1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(13,27,42,0.12)';
            e.currentTarget.style.background = 'rgba(255,255,255,0.9)';
          }}>
          <Ico name="link" size={16} stroke="#b8902a" strokeWidth={1.75} />
          <span>Connections</span>
          <span className="text-[11px] font-normal opacity-60">(demo)</span>
        </button>
      </footer>

      {/* ── Side panel: future integrations (demo only) ── */}
      {integrationsDemoOpen && (
        <>
          <div
            role="presentation"
            className="absolute inset-0 z-40 transition-opacity duration-300 ease-out"
            style={{
              background: integrationsDemoEntered ? 'rgba(13,27,42,0.22)' : 'rgba(13,27,42,0)',
              pointerEvents: 'auto',
            }}
            onClick={closeIntegrationsDemo}
          />
          <aside
            className="absolute top-0 right-0 bottom-0 z-50 flex flex-col w-[min(100%,19rem)] max-w-[92vw] shadow-2xl"
            style={{
              background: 'linear-gradient(180deg, #fafaf9 0%, #ffffff 40%)',
              borderLeft: '1px solid rgba(0,0,0,0.08)',
              transform: integrationsDemoEntered ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
              boxShadow: '-8px 0 32px rgba(13,27,42,0.12)',
            }}>
            <div
              className="flex items-center justify-between px-4 py-3.5 flex-shrink-0"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 leading-tight">Connections</h2>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
                  Preview — future integrations
                </p>
              </div>
              <button
                type="button"
                onClick={closeIntegrationsDemo}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 transition-colors"
                style={{ background: 'rgba(0,0,0,0.04)' }}
                aria-label="Close">
                <Ico name="close" size={16} stroke="currentColor" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
              <p className="text-[11px] text-gray-400 mb-3 leading-relaxed">
                These links are for demonstration only. In the full product you will be able to connect accounts and repositories.
              </p>
              {[
                { label: 'Outlook', initials: 'Ou', sub: 'Microsoft 365', color: '#0078d4', border: 'rgba(0,120,212,0.35)' },
                { label: 'Gmail', initials: 'Gm', sub: 'Google', color: '#ea4335', border: 'rgba(234,67,53,0.35)' },
                { label: 'Drive', initials: 'Dr', sub: 'Google Drive', color: '#34a853', border: 'rgba(52,168,83,0.35)' },
                { label: 'SharePoint', initials: 'SP', sub: 'Microsoft 365', color: '#038387', border: 'rgba(3,131,135,0.35)' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  disabled
                  title="Demo — not available yet"
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-left transition-opacity cursor-not-allowed opacity-90"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    border: `1px solid ${item.border}`,
                  }}>
                  <span
                    className="w-9 h-9 rounded-md flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white tracking-tight"
                    style={{ background: item.color }}>
                    {item.initials}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-gray-800">{item.label}</span>
                    <span className="block text-[11px] text-gray-400 truncate">{item.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </aside>
        </>
      )}
    </main>
  );
}

export default DocsPanel;
