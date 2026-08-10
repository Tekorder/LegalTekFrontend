/* ═══════════════════════════════════════════════════════════
   LegalTek AI — components/DocumentEditor.jsx
   Rich-text editor for legal documents.

   • Slide-in from right, covers 75% width (expandable to 100%)
   • Times New Roman, justified — lawyer document feel
   • Toolbar: Bold, Italic, Underline | Font size | Alignment | Undo/Redo
   • Auto-save (1.5 s debounce) + manual Ctrl+S
   • Stores HTML in extracted_text; AI layer uses strip_tags()
═══════════════════════════════════════════════════════════ */

const { useState, useEffect, useRef, useCallback } = React;
const { Ico, Spinner, apiPost } = window;
const { DocEditViewer: DiffViewer } = window;

/* ══════════════════════════════════════════════
   TOOLBAR BUTTON
══════════════════════════════════════════════ */
function ToolBtn({ active, onClick, title, children, disabled }) {
  return (
    <button
      title={title}
      disabled={disabled}
      onMouseDown={e => e.preventDefault()} /* keep editor focus */
      onClick={onClick}
      className="flex items-center justify-center rounded-lg transition-all text-sm select-none"
      style={{
        minWidth:   '30px',
        height:     '28px',
        padding:    '0 7px',
        background: active   ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.04)',
        border:     `1px solid ${active ? 'rgba(139,92,246,0.45)' : 'rgba(139,92,246,0.1)'}`,
        color:      active   ? '#c4b5fd' : '#9ca3af',
        cursor:     disabled ? 'not-allowed' : 'pointer',
        opacity:    disabled ? 0.4 : 1,
      }}>
      {children}
    </button>
  );
}

/* Toolbar separator */
const Sep = () => (
  <div className="flex-shrink-0 w-px mx-1 self-stretch" style={{ background: 'rgba(139,92,246,0.15)' }} />
);

/* ── Alignment SVGs ────────────────────────── */
const AlignLeft    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6"  x2="21" y2="6" /><line x1="3" y1="10" x2="16" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="18" x2="16" y2="18"/></svg>;
const AlignCenter  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6"  x2="21" y2="6" /><line x1="6" y1="10" x2="18" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="6" y1="18" x2="18" y2="18"/></svg>;
const AlignRight   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6"  x2="21" y2="6" /><line x1="8" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="8" y1="18" x2="21" y2="18"/></svg>;
const AlignJustify = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6"  x2="21" y2="6" /><line x1="3" y1="10" x2="21" y2="10"/><line x1="3" y1="14" x2="21" y2="14"/><line x1="3" y1="18" x2="21" y2="18"/></svg>;

/* ── Inline markdown → HTML (*** bold+italic, ** bold, * italic) ── */
function applyMarkdown(str) {
  return str
    .replace(/\*\*\*([\s\S]+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*([\s\S]+?)\*\*/g,      '<strong>$1</strong>')
    .replace(/\*([\s\S]+?)\*/g,          '<em>$1</em>');
}

/* ── Convert plain text → editor HTML ────────── */
function textToHtml(text) {
  if (!text) return '<p><br></p>';
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(text);
  if (isHtml) return text;
  return text
    .split(/\n{2,}/)
    .map(para => {
      const content = applyMarkdown(para.replace(/\n/g, '<br>').trim());
      return content ? `<p>${content}</p>` : '<p><br></p>';
    })
    .join('') || '<p><br></p>';
}

/* ── Font sizes (execCommand maps 1–7) ─────────── */
const FONT_SIZES = [
  { value: '1', label: '8'  },
  { value: '2', label: '10' },
  { value: '3', label: '12' },
  { value: '4', label: '14' },
  { value: '5', label: '18' },
  { value: '6', label: '24' },
  { value: '7', label: '36' },
];

/* ══════════════════════════════════════════════
   DOCUMENT EDITOR
══════════════════════════════════════════════ */
function DocumentEditor({ doc, onClose, onSaved }) {
  const [visible,  setVisible]  = useState(false);   // drive slide-in animation
  const [expanded, setExpanded] = useState(false);
  const [status,   setStatus]   = useState('idle');  // idle | saving | saved | error
  const [fmt, setFmt] = useState({
    bold: false, italic: false, underline: false,
    justifyLeft: false, justifyCenter: false, justifyRight: false, justifyFull: true,
  });
  const [fontSize, setFontSize] = useState('3');

  /* ── AI Edit state (inline below toolbar — no modal) ── */
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiEditLoading, setAiEditLoading] = useState(false);
  const [docEditData,   setDocEditData]   = useState(null); // { original, edited }

  const editorRef  = useRef();
  const saveTimer  = useRef();
  const closingRef = useRef(false);

  /* ── Mount: inject content + slide in ─────── */
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = textToHtml(doc.extracted_text);
      /* default formatting for new content */
      document.execCommand('defaultParagraphSeparator', false, 'p');
    }
    requestAnimationFrame(() => setVisible(true));
  }, []);

  /* ── Track selection for toolbar active states ── */
  useEffect(() => {
    function sync() {
      try {
        setFmt({
          bold:          document.queryCommandState('bold'),
          italic:        document.queryCommandState('italic'),
          underline:     document.queryCommandState('underline'),
          justifyLeft:   document.queryCommandState('justifyLeft'),
          justifyCenter: document.queryCommandState('justifyCenter'),
          justifyRight:  document.queryCommandState('justifyRight'),
          justifyFull:   document.queryCommandState('justifyFull'),
        });
        const sz = document.queryCommandValue('fontSize');
        if (sz) setFontSize(sz);
      } catch (_) {}
    }
    document.addEventListener('selectionchange', sync);
    return () => document.removeEventListener('selectionchange', sync);
  }, []);

  /* ── Keyboard shortcuts ─────────────────────── */
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        save();
      }
      if (e.key === 'Escape') handleClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Exec formatting command ─────────────────── */
  function exec(cmd, value) {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value ?? null);
    try {
      setFmt(prev => ({ ...prev, [cmd]: document.queryCommandState(cmd) }));
    } catch (_) {}
  }

  /* ── Auto-save on input ─────────────────────── */
  function handleInput() {
    if (status === 'saved') setStatus('idle');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 1500);
  }

  /* ── Save ──────────────────────────────────── */
  const save = useCallback(async () => {
    if (!editorRef.current) return;
    setStatus('saving');
    const html = editorRef.current.innerHTML;
    try {
      await apiPost('documents.save_text', { id: doc.id, html });
      setStatus('saved');
      onSaved?.(html);
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      setStatus('error');
    }
  }, [doc.id]);

  /* ── Animated close ─────────────────────────── */
  function handleClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    clearTimeout(saveTimer.current);
    setVisible(false);
    setTimeout(onClose, 280);
  }

  /* ── AI Edit: send instruction to OpenAI ────── */
  async function handleAiEditSubmit(instruction) {
    const t = (instruction || '').trim();
    if (!t || aiEditLoading) return;
    setAiEditLoading(true);
    try {
      const res = await apiPost('documents.ai_edit', {
        doc_id:      doc.id,
        instruction: t,
      });
      setAiInstruction('');
      setDocEditData({
        original: res.original_text,
        edited:   res.edited_text,
      });
    } catch (e) {
      setStatus('error');
    } finally {
      setAiEditLoading(false);
    }
  }

  /* ── AI Edit: apply diff result into editor ── */
  async function handleAiSave(editedText) {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = textToHtml(editedText);
    setDocEditData(null);
    await save();
  }

  /* ── Font size change ───────────────────────── */
  function handleFontSize(e) {
    const val = e.target.value;
    setFontSize(val);
    exec('fontSize', val);
  }

  /* ── Save status display ─────────────────────── */
  const STATUS_MAP = {
    idle:   { text: '',            color: 'transparent' },
    saving: { text: 'Saving…',    color: '#fbbf24' },
    saved:  { text: '✓ Saved',    color: '#34d399' },
    error:  { text: 'Save failed', color: '#f87171' },
  };
  const st = STATUS_MAP[status];

  return (
    /* Full-screen backdrop */
    <div
      className="fixed inset-0 z-50 flex"
      style={{
        background:     visible ? 'rgba(0,0,0,0.55)' : 'transparent',
        backdropFilter: visible ? 'blur(3px)' : 'none',
        transition:     'background 0.28s ease, backdrop-filter 0.28s ease',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>

      {/* ── Slide-in panel ── */}
      <div
        className="absolute right-0 top-0 h-full flex flex-col"
        style={{
          width:      expanded ? '100%' : '75%',
          background: '#0a0416',
          borderLeft: '1px solid rgba(139,92,246,0.2)',
          transform:  visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1), width 0.22s ease',
          boxShadow:  '-8px 0 40px rgba(0,0,0,0.6)',
        }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(139,92,246,0.12)', background: 'rgba(109,40,217,0.06)' }}>

          <Ico name="file" size={15} stroke="#a78bfa" />
          <p className="flex-1 text-white font-medium text-sm truncate leading-none">
            {doc.original_name}
          </p>

          {/* Save status */}
          <span className="text-xs font-medium flex-shrink-0 transition-all"
            style={{ color: st.color, minWidth: '70px', textAlign: 'right' }}>
            {st.text}
          </span>

          {/* Manual save */}
          <button
            onMouseDown={e => e.preventDefault()}
            onClick={save}
            disabled={status === 'saving'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(109,40,217,0.25)', border: '1px solid rgba(139,92,246,0.35)', color: '#c4b5fd' }}>
            {status === 'saving' ? <Spinner size={11} /> : <Ico name="upload" size={11} stroke="currentColor" />}
            Save
          </button>

          {/* Expand / Collapse */}
          <button
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'Collapse' : 'Expand to full screen'}
            className="p-1.5 rounded-lg text-gray-500 hover:text-purple-300 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Ico name={expanded ? 'minimize' : 'maximize'} size={14} stroke="currentColor" />
          </button>

          {/* Close */}
          <button
            onClick={handleClose}
            title="Close (Esc)"
            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)' }}>
            <Ico name="close" size={14} stroke="currentColor" />
          </button>
        </div>

        {/* ── Formatting toolbar ── */}
        <div
          className="flex items-center gap-1 px-4 py-2 flex-shrink-0 flex-wrap"
          style={{ borderBottom: '1px solid rgba(139,92,246,0.09)', background: 'rgba(0,0,0,0.25)' }}>

          {/* Text style */}
          <ToolBtn active={fmt.bold}      onClick={() => exec('bold')}      title="Bold (Ctrl+B)">
            <strong style={{ fontFamily: 'serif', fontSize: '14px' }}>B</strong>
          </ToolBtn>
          <ToolBtn active={fmt.italic}    onClick={() => exec('italic')}    title="Italic (Ctrl+I)">
            <em style={{ fontFamily: 'serif', fontSize: '14px', fontStyle: 'italic' }}>I</em>
          </ToolBtn>
          <ToolBtn active={fmt.underline} onClick={() => exec('underline')} title="Underline (Ctrl+U)">
            <u style={{ fontFamily: 'serif', fontSize: '13px' }}>U</u>
          </ToolBtn>

          <Sep />

          {/* Font size */}
          <select
            value={fontSize}
            onMouseDown={e => e.stopPropagation()}
            onChange={handleFontSize}
            className="rounded-lg text-xs px-2 py-1 transition-all"
            style={{
              background:   'rgba(255,255,255,0.05)',
              border:       '1px solid rgba(139,92,246,0.18)',
              color:        '#9ca3af',
              height:       '28px',
              cursor:       'pointer',
            }}>
            {FONT_SIZES.map(s => (
              <option key={s.value} value={s.value} style={{ background: '#1a0a35', color: '#fff' }}>
                {s.label}pt
              </option>
            ))}
          </select>

          <Sep />

          {/* Alignment */}
          <ToolBtn active={fmt.justifyLeft}   onClick={() => exec('justifyLeft')}   title="Align Left">
            <AlignLeft />
          </ToolBtn>
          <ToolBtn active={fmt.justifyCenter} onClick={() => exec('justifyCenter')} title="Align Center">
            <AlignCenter />
          </ToolBtn>
          <ToolBtn active={fmt.justifyRight}  onClick={() => exec('justifyRight')}  title="Align Right">
            <AlignRight />
          </ToolBtn>
          <ToolBtn active={fmt.justifyFull}   onClick={() => exec('justifyFull')}   title="Justify (legal style)">
            <AlignJustify />
          </ToolBtn>

          <Sep />

          {/* Undo / Redo */}
          <ToolBtn onClick={() => exec('undo')} title="Undo (Ctrl+Z)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
          </ToolBtn>
          <ToolBtn onClick={() => exec('redo')} title="Redo (Ctrl+Y)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"/>
            </svg>
          </ToolBtn>

          <Sep />

          {/* Strike / HR */}
          <ToolBtn onClick={() => exec('strikeThrough')} title="Strikethrough">
            <s style={{ fontFamily: 'serif', fontSize: '13px' }}>S</s>
          </ToolBtn>
          <ToolBtn onClick={() => exec('insertHorizontalRule')} title="Insert horizontal rule">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </ToolBtn>

          {/* Hint */}
          <span className="ml-auto text-[10px] text-gray-700 hidden md:block">Ctrl+S to save</span>
        </div>

        {/* ── Edit with AI: inline row (no popup) ── */}
        <div
          className="flex items-center gap-2 px-4 py-2 flex-shrink-0 flex-wrap"
          style={{ borderBottom: '1px solid rgba(139,92,246,0.09)', background: 'rgba(212,175,55,0.05)' }}>
          <span className="text-xs font-semibold flex-shrink-0" style={{ color: '#d4af37' }}>
            Edit with AI
          </span>
          <textarea
            value={aiInstruction}
            onChange={e => setAiInstruction(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAiEditSubmit(aiInstruction);
              }
            }}
            rows={2}
            placeholder="What should the AI change? e.g. fix grammar, formal tone…"
            disabled={aiEditLoading}
            className="flex-1 min-w-[200px] rounded-lg text-xs px-3 py-2 resize-y outline-none"
            style={{
              background:   'rgba(255,255,255,0.06)',
              border:       '1px solid rgba(139,92,246,0.2)',
              color:        '#e5e7eb',
              minHeight:    '40px',
              maxHeight:    '96px',
            }}
          />
          <button
            type="button"
            onMouseDown={e => e.preventDefault()}
            onClick={() => handleAiEditSubmit(aiInstruction)}
            disabled={!aiInstruction.trim() || aiEditLoading}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: aiInstruction.trim() && !aiEditLoading ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
              border:     `1px solid ${aiInstruction.trim() && !aiEditLoading ? 'rgba(212,175,55,0.45)' : 'rgba(139,92,246,0.15)'}`,
              color:      '#d4af37',
            }}>
            {aiEditLoading ? (
              <>
                <Spinner size={12} />
                <span>…</span>
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v1m0 16v1M4.22 4.22l.7.7m12.72 12.72.7.7M3 12h1m16 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Run
              </>
            )}
          </button>
        </div>

        {/* ── Editor area (the "desk") ── */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, #0d0520 0%, #080415 100%)' }}>

          {/* Page shadow wrapper */}
          <div className="px-8 py-10 flex justify-center">
            <div
              style={{
                width:        '100%',
                maxWidth:     '820px',
                minHeight:    '1100px',
                background:   '#ffffff',
                boxShadow:    '0 4px 6px rgba(0,0,0,0.3), 0 12px 48px rgba(0,0,0,0.5)',
                borderRadius: '3px',
                padding:      '72px 80px',
              }}>

              {/* Watermark-style heading */}
              <p style={{
                fontFamily:    "'Times New Roman', Times, serif",
                fontSize:      '9pt',
                color:         '#cbd5e1',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                marginBottom:  '32px',
                borderBottom:  '1px solid #e2e8f0',
                paddingBottom: '8px',
              }}>
                LegalTek AI — {doc.original_name}
              </p>

              {/* Editable content */}
              <div
                ref={editorRef}
                contentEditable={true}
                onInput={handleInput}
                suppressContentEditableWarning={true}
                spellCheck={true}
                style={{
                  fontFamily:  "'Times New Roman', Times, serif",
                  fontSize:    '12pt',
                  lineHeight:  '1.85',
                  textAlign:   'justify',
                  color:       '#1a1a2e',
                  outline:     'none',
                  minHeight:   '900px',
                  caretColor:  '#7c3aed',
                }}
              />
            </div>
          </div>
        </div>

        {/* ── Footer status bar ── */}
        <div
          className="flex items-center gap-4 px-5 py-2 flex-shrink-0 text-[11px]"
          style={{ borderTop: '1px solid rgba(139,92,246,0.1)', background: 'rgba(0,0,0,0.3)', color: '#4b5563' }}>
          <span>Times New Roman · 12pt · Justified</span>
          <span className="ml-auto">Ctrl+S to save · Esc to close</span>
        </div>
      </div>

      {/* ── AI Edit: animated diff viewer ── */}
      {docEditData && DiffViewer && (
        <DiffViewer
          docId={doc.id}
          docName={doc.original_name}
          original={docEditData.original}
          edited={docEditData.edited}
          onClose={() => setDocEditData(null)}
          onSave={handleAiSave}
        />
      )}
    </div>
  );
}

/* ── Expose to global scope ────────────────── */
window.DocumentEditor = DocumentEditor;
