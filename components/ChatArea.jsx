'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/ChatArea.jsx
   Components: Message, TypingIndicator, UploadZone, ChatInput
═══════════════════════════════════════════════ */

import { useState, useRef } from 'react';
import { fmtTime } from '@/lib/format';
import { Ico, Spinner, RenderContent } from '@/lib/icons';

/* ══════════════════════════════════════════════════════
   MESSAGE BUBBLE
══════════════════════════════════════════════════════ */
function Message({ msg, onEditDoc }) {
  const isUser   = msg.role === "user";
  const time     = msg.time ?? fmtTime(msg.created_at);
  const docName  = msg.doc_name ?? msg.docName;
  const docId    = msg.document_id ?? null;
  const canEdit  = onEditDoc && docId;
  const sources  = (!isUser && Array.isArray(msg.cl_sources) && msg.cl_sources.length > 0)
                   ? msg.cl_sources : null;
  const clMeta   = (!isUser && msg.cl_meta) ? msg.cl_meta : null;

  return (
    <div className={`msg-in flex gap-3 mb-5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      <div
        className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-bold ${isUser ? "" : "btn-primary"}`}
        style={isUser ? { background: "linear-gradient(135deg,#1a3a5c,#d4af37)" } : {}}>
        {isUser
          ? <span className="text-white">JA</span>
          : <Ico name="shield" size={15} stroke="white" />}
      </div>

      <div className={`flex flex-col gap-1 max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>

        {/* Doc badge */}
        {docName && (
          canEdit ? (
            <button
              onClick={() => onEditDoc(docId)}
              className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs mb-1 group transition-all max-w-xs"
              style={{ border: '1px solid rgba(13,27,42,0.1)', color: '#6b7280' }}
              title={docName}>
            <Ico name="file" size={13} stroke="#d4af37" className="flex-shrink-0" />
            <span className="truncate">{docName}</span>
            <Ico name="pencil" size={10} stroke="rgba(13,27,42,0.3)"
                className="flex-shrink-0 group-hover:stroke-stone-500 transition-colors" />
            </button>
          ) : (
            <div className="glass rounded-lg px-3 py-1.5 flex items-center gap-2 text-xs mb-1 max-w-xs"
              style={{ border: '1px solid rgba(13,27,42,0.08)', color: '#6b7280' }}
              title={docName}>
              <Ico name="file" size={13} stroke="#d4af37" className="flex-shrink-0" />
              <span className="truncate">{docName}</span>
            </div>
          )
        )}

        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            isUser
              ? "text-gray-100 rounded-tr-sm"
              : "glass-msg text-gray-800 rounded-tl-sm"
          }`}
          style={isUser ? {
            background: "linear-gradient(135deg, rgba(13,27,42,0.92), rgba(26,58,92,0.88))",
            border:     "1px solid rgba(212,175,55,0.25)",
          } : {}}>
          <RenderContent text={msg.content} />
        </div>

        {/* Court Listener bibliography */}
        {(sources || clMeta) && (
          <div className="mt-1 w-full rounded-lg px-3 py-2.5"
            style={{
              background: 'rgba(212,175,55,0.06)',
              border:     '1px solid rgba(212,175,55,0.2)',
            }}>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5"
              style={{ color: 'rgba(13,27,42,0.45)' }}>
              Sources · Court Listener
            </p>
            {clMeta && (
              <p className="text-[10px] mb-1.5" style={{ color: 'rgba(13,27,42,0.4)' }}>
                Searched: <em>"{clMeta.terms}"</em> — {clMeta.result_count} results — {clMeta.context_len} chars injected
              </p>
            )}
            <ol className="flex flex-col gap-1">
              {(sources || []).map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[11px]">
                  <span className="flex-shrink-0 font-medium" style={{ color: '#a88820' }}>
                    {i + 1}.
                  </span>
                  <span className="flex flex-col gap-0.5">
                    {s.url ? (
                      <a href={s.url} target="_blank" rel="noopener noreferrer"
                        className="font-medium hover:underline"
                        style={{ color: '#1a3a5c' }}>
                        {s.name}
                      </a>
                    ) : (
                      <span className="font-medium" style={{ color: '#1a3a5c' }}>{s.name}</span>
                    )}
                    {(s.court || s.date) && (
                      <span style={{ color: 'rgba(13,27,42,0.45)' }}>
                        {[s.court, s.date].filter(Boolean).join(' · ')}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        <span className="text-[11px] text-gray-400 px-1">{time}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   TYPING INDICATOR
══════════════════════════════════════════════════════ */
function TypingIndicator() {
  return (
    <div className="msg-in flex gap-3 mb-5">
      <div className="btn-primary w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center">
        <Ico name="shield" size={15} stroke="white" />
      </div>
      <div className="glass-msg rounded-lg rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full dot1" style={{ background: '#d4af37' }} />
        <div className="w-2 h-2 rounded-full dot2" style={{ background: '#d4af37' }} />
        <div className="w-2 h-2 rounded-full dot3" style={{ background: '#a88820' }} />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   UPLOAD ZONE
══════════════════════════════════════════════════════ */
function UploadZone({ onUpload }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  return (
    <div
      className={`drop-zone border-2 border-dashed rounded-lg p-5 text-center cursor-pointer ${dragging ? "dragging" : ""}`}
      style={{ borderColor: "rgba(13,27,42,0.18)" }}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" accept=".docx" className="hidden"
        onChange={(e) => e.target.files[0] && onUpload(e.target.files[0])} />
      <div className="flex flex-col items-center gap-2">
        <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-1"
          style={{ background: "rgba(13,27,42,0.07)", border: "1px solid rgba(13,27,42,0.12)" }}>
          <Ico name="upload" size={22} stroke="#d4af37" strokeWidth={1.5} />
        </div>
        <p className="text-sm font-medium" style={{ color: '#4a5568' }}>Drop your .docx here</p>
        <p className="text-gray-400 text-xs">Word documents only (.docx) — Max. 50 MB</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   CHAT INPUT BAR
══════════════════════════════════════════════════════ */
function ChatInput({ onSend, showUpload, onToggleUpload, disabled, isMultiMember }) {
  const [input,         setInput]        = useState("");
  const [pendingDoc,    setPendingDoc]   = useState(null);
  const [knowledgeSrc,  setKnowledgeSrc] = useState("");

  const canSend = (input.trim() || pendingDoc) && !disabled;

  const handleSend = () => {
    if (!canSend) return;
    onSend({ text: input.trim(), doc: pendingDoc, knowledgeSrc });
    setInput("");
    setPendingDoc(null);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="glass-input flex-shrink-0 px-5 py-4">

      {/* Pending doc badge */}
      {pendingDoc && (
        <div className="mb-3">
          <div className="glass inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
            style={{ border: '1px solid rgba(13,27,42,0.1)', color: '#6b7280' }}>
            <Ico name="file" size={13} stroke="#d4af37" />
            <span>{pendingDoc.name}</span>
            <button onClick={() => setPendingDoc(null)}
              className="ml-1 text-gray-400 hover:text-gray-600 transition-colors">
              <Ico name="close" size={12} stroke="currentColor" />
            </button>
          </div>
        </div>
      )}

      {/* Upload zone */}
      {showUpload && (
        <div className="mb-3">
          <UploadZone onUpload={(f) => { setPendingDoc(f); onToggleUpload(false); }} />
        </div>
      )}

      <div className="flex items-end gap-3">
        {/* Upload toggle */}
        <button onClick={() => onToggleUpload(!showUpload)} title="Upload document"
          className="flex-shrink-0 p-3 rounded-lg border transition-all duration-200"
          style={showUpload ? {
            background: 'rgba(13,27,42,0.12)',
            border:     '1px solid rgba(13,27,42,0.28)',
            color:      '#1a1a2e',
          } : {
            background: 'rgba(245,242,235,0.8)',
            border:     '1px solid rgba(13,27,42,0.12)',
            color:      'rgba(13,27,42,0.5)',
          }}>
          <Ico name="upload" size={18} stroke="currentColor" />
        </button>

        {/* Textarea */}
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder={
            disabled
              ? "Sending…"
              : isMultiMember
                ? "Message… (use @Waldy to ask the AI)"
                : "Type your legal query… (Shift+Enter for new line)"
          }
          rows={1}
          className="chat-input flex-1 rounded-lg px-4 py-3 text-sm"
        />

        {/* Send — spinner only while request is in flight */}
        <button onClick={handleSend} disabled={!canSend} title="Send (Enter)"
          className="btn-primary flex-shrink-0 p-3 rounded-lg text-white disabled:opacity-50">
          {disabled ? (
            <Spinner size={18} />
          ) : (
            <Ico name="send" size={18} stroke="white" />
          )}
        </button>
      </div>

      {/* Knowledge source selector */}
      <div className="flex items-center gap-2 mt-2.5">
        <span className="text-[11px] text-gray-400 flex-shrink-0">Knowledge source:</span>
        <select
          value={knowledgeSrc}
          onChange={(e) => setKnowledgeSrc(e.target.value)}
          className="text-[11px] rounded-md px-2 py-1 border flex-1 max-w-xs"
          style={{
            background: 'rgba(245,242,235,0.8)',
            border:     '1px solid rgba(13,27,42,0.15)',
            color:      'rgba(13,27,42,0.65)',
            outline:    'none',
          }}>
          <option value="">None (default AI)</option>
          <option value="court_listener">Court Listener</option>
        </select>
      </div>

      <p className="text-center text-[11px] text-gray-400 mt-2">
        LegalTek AI may make mistakes. Always verify information with a certified legal professional.
      </p>
    </div>
  );
}

export { Message, TypingIndicator, UploadZone, ChatInput };
