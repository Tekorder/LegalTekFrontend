/* ═══════════════════════════════════════════════
   LegalTek AI — components/Sidebar.jsx
   Components: Sidebar, ChatItem
═══════════════════════════════════════════════ */

const { useState, useRef, useEffect } = React;
const { Ico, Spinner, dateGroup }     = window;

/* ══════════════════════════════════════════════════════
   CHAT ITEM
══════════════════════════════════════════════════════ */
function ChatItem({ chat, active, onClick, onDelete, onRename }) {
  const [confirm,  setConfirm]  = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState(chat.title);
  const inputRef = useRef();

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const startEdit = (e) => {
    e.stopPropagation();
    setDraft(chat.title);
    setEditing(true);
    setConfirm(false);
  };

  const commitEdit = async () => {
    const title = draft.trim();
    if (!title || title === chat.title) { setEditing(false); return; }
    setEditing(false);
    await onRename(title);
  };

  const handleEditKey = (e) => {
    if (e.key === 'Enter')  { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { setEditing(false); setDraft(chat.title); }
  };

  const handleTrashClick  = (e) => { e.stopPropagation(); setConfirm(true); setEditing(false); };
  const handleConfirmYes  = async (e) => { e.stopPropagation(); setDeleting(true); await onDelete(); };
  const handleConfirmNo   = (e) => { e.stopPropagation(); setConfirm(false); };

  return (
    <div
      className={`chat-item rounded-lg border flex items-center gap-2 px-3 py-2.5 group
        ${active    ? 'active border-transparent' : 'border-transparent'}
        ${deleting  ? 'opacity-40 pointer-events-none' : ''}
        ${editing   ? 'cursor-text' : 'cursor-pointer'}`}
      onClick={!confirm && !editing ? onClick : undefined}
    >
      <Ico name="chat" size={13}
        stroke={active ? '#f8e870' : 'rgba(212,175,55,0.65)'}
        className="flex-shrink-0" />

      {/* Editing state */}
      {editing && (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleEditKey}
          onBlur={commitEdit}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-sm bg-transparent text-white outline-none min-w-0"
          style={{ borderBottom: '1px solid rgba(212,175,55,0.6)' }}
          maxLength={120}
        />
      )}

      {/* Confirm delete state */}
      {!editing && confirm && (
        <>
          <span className="text-xs text-red-300 flex-1 truncate">Delete this chat?</span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={handleConfirmYes}
              className="text-[11px] font-semibold px-2 py-0.5 rounded text-white"
              style={{ background: 'rgba(185,28,28,0.7)' }}>
              {deleting ? '…' : 'Yes'}
            </button>
            <button onClick={handleConfirmNo}
              className="text-[11px] font-semibold px-2 py-0.5 rounded text-gray-400 hover:text-gray-200"
              style={{ background: 'rgba(255,255,255,0.06)' }}>
              No
            </button>
          </div>
        </>
      )}

      {/* Normal state */}
      {!editing && !confirm && (
        <>
          <span
            className={`text-sm truncate flex-1 ${active ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'}`}
            onDoubleClick={startEdit}
            title="Double-click to rename"
          >
            {chat.title}
          </span>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity duration-150">
            <button onClick={startEdit} title="Rename"
              className="rounded p-1 text-gray-600 hover:text-amber-300 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={handleTrashClick} title="Delete"
              className="rounded p-1 text-gray-600 hover:text-red-400 transition-colors">
              <Ico name="trash" size={12} stroke="currentColor" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SIDEBAR
══════════════════════════════════════════════════════ */
function Sidebar({
  chats, activeId, onSelect, onNew, onDelete, onRename,
  loading, collapsed, onToggle,
  view, onViewChange,
  activeCase, onBackToCases,
  userDisplayName, userEmail, userPhotoURL, userInitials, onSignOut,
}) {
  const GROUPS = ['Today', 'Yesterday', 'This week', 'Last month'];

  return (
    <aside
      className={`h-full flex flex-col glass-dark transition-all duration-300 ${collapsed ? 'w-16' : 'w-72'}`}
      style={{ borderRight: '1px solid rgba(212,175,55,0.18)' }}
    >
      {/* Logo / Case header */}
      <div className="flex items-center gap-3 p-4"
        style={{ borderBottom: '1px solid rgba(212,175,55,0.14)' }}>
        <button onClick={onToggle}
          className="btn-primary w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <Ico name="shield" size={18} stroke="white" />
        </button>

        {!collapsed && (
          activeCase ? (
            <button
              onClick={onBackToCases}
              disabled={!onBackToCases}
              title={onBackToCases ? 'Back to projects' : undefined}
              className="overflow-hidden flex-1 min-w-0 text-left"
            >
              <p className="text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1"
                style={{ color: 'rgba(212,175,55,0.65)' }}>
                {onBackToCases && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                )}
                Workspace
              </p>
              <p className="text-white font-semibold text-sm leading-tight truncate" title={activeCase.title}>
                {activeCase.title}
              </p>
            </button>
          ) : (
            <div className="overflow-hidden">
              <h1 className="text-white font-bold text-base leading-none grad-text">LegalTek</h1>
              <p className="text-[11px] mt-0.5" style={{ color: 'rgba(212,175,55,0.75)' }}>AI Legal Assistant</p>
            </div>
          )
        )}
      </div>

      {/* Repository + Analyze, then divider, then New discussion */}
      <div className="px-3 py-3 flex-shrink-0 flex flex-col gap-1.5">
        {!collapsed && (
          <button onClick={() => onViewChange(view === 'docs' ? 'chat' : 'docs')}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-all text-left"
            style={{
              background: view === 'docs' ? 'rgba(212,175,55,0.2)' : 'transparent',
              border:       'none',
              color:        view === 'docs' ? '#f8e870' : 'rgba(212,175,55,0.75)',
            }}
            onMouseEnter={(e) => {
              if (view !== 'docs') e.currentTarget.style.background = 'rgba(212,175,55,0.08)';
            }}
            onMouseLeave={(e) => {
              if (view !== 'docs') e.currentTarget.style.background = 'transparent';
            }}>
            <Ico name="file" size={14} stroke="currentColor" />
            Repository
          </button>
        )}

        {collapsed && (
          <button onClick={() => onViewChange(view === 'docs' ? 'chat' : 'docs')}
            title="Repository"
            className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center transition-all"
            style={{
              background: view === 'docs' ? 'rgba(212,175,55,0.2)' : 'transparent',
              border:     'none',
            }}>
            <Ico name="file" size={15} stroke={view === 'docs' ? '#f8e870' : 'rgba(212,175,55,0.65)'} />
          </button>
        )}

        {!collapsed && (
          <button
            type="button"
            onClick={() => onViewChange(view === 'analyze' ? 'chat' : 'analyze')}
            className="w-full py-2 px-3 rounded-lg text-sm font-medium flex items-center gap-2 transition-all text-left"
            style={{
              background: view === 'analyze' ? 'rgba(212,175,55,0.2)' : 'transparent',
              border:       'none',
              color:        view === 'analyze' ? '#f8e870' : 'rgba(212,175,55,0.75)',
            }}
            onMouseEnter={(e) => {
              if (view !== 'analyze') e.currentTarget.style.background = 'rgba(212,175,55,0.08)';
            }}
            onMouseLeave={(e) => {
              if (view !== 'analyze') e.currentTarget.style.background = 'transparent';
            }}>
            <Ico name="chart" size={14} stroke="currentColor" />
            Analyze
          </button>
        )}

        {collapsed && (
          <button
            type="button"
            onClick={() => onViewChange(view === 'analyze' ? 'chat' : 'analyze')}
            title="Analyze"
            className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center transition-all"
            style={{
              background: view === 'analyze' ? 'rgba(212,175,55,0.2)' : 'transparent',
              border:     'none',
            }}>
            <Ico name="chart" size={15} stroke={view === 'analyze' ? '#f8e870' : 'rgba(212,175,55,0.65)'} />
          </button>
        )}

        {!collapsed && (
          <div className="my-1" role="separator" style={{ borderTop: '1px solid rgba(212,175,55,0.22)' }} />
        )}
        {collapsed && (
          <div className="w-full px-1 py-0.5 flex justify-center">
            <div className="w-8" style={{ borderTop: '1px solid rgba(212,175,55,0.22)' }} />
          </div>
        )}

        <button onClick={() => { onNew(); onViewChange('chat'); }}
          className={`btn-primary rounded-lg text-white font-medium text-sm flex items-center justify-center gap-2
            ${collapsed ? 'w-10 h-10 mx-auto' : 'w-full py-2.5 px-4'}`}>
          <Ico name="plus" size={16} stroke="white" strokeWidth={2.5} />
          {!collapsed && 'New discussion'}
        </button>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs"
            style={{ color: 'rgba(212,175,55,0.5)' }}>
            <Spinner size={14} /> Loading…
          </div>
        )}

        {!loading && chats.length === 0 && !collapsed && (
          <div className="text-center py-10 px-4">
            <Ico name="chat" size={28} stroke="rgba(212,175,55,0.35)" className="mx-auto mb-2" />
            <p className="text-gray-600 text-xs">No conversations yet.</p>
            <p className="text-gray-700 text-xs mt-1">Click "New discussion" to start.</p>
          </div>
        )}

        {!loading && !collapsed && GROUPS.map((group) => {
          const items = chats.filter((c) => dateGroup(c.updated_at) === group);
          if (!items.length) return null;
          return (
            <div key={group}>
              <p className="text-[10px] font-semibold uppercase tracking-widest px-2 pt-3 pb-1"
                style={{ color: 'rgba(212,175,55,0.65)' }}>
                {group}
              </p>
              {items.map((chat) => (
                <ChatItem key={chat.id} chat={chat}
                  active={chat.id === activeId}
                  onClick={() => onSelect(chat.id)}
                  onDelete={() => onDelete(chat.id)}
                  onRename={(title) => onRename(chat.id, title)} />
              ))}
            </div>
          );
        })}

        {!loading && collapsed && chats.slice(0, 12).map((chat) => (
          <button key={chat.id} onClick={() => onSelect(chat.id)} title={chat.title}
            className={`chat-item w-10 h-10 mx-auto rounded-lg border flex items-center justify-center mt-1
              ${chat.id === activeId ? 'active border-transparent' : 'border-transparent'}`}>
            <Ico name="chat" size={14}
              stroke={chat.id === activeId ? '#f8e870' : 'rgba(212,175,55,0.55)'} />
          </button>
        ))}
      </div>

      {/* User footer */}
      <div className="p-3 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(212,175,55,0.14)' }}>
        <div className={`flex items-center gap-3 p-2 rounded-lg ${collapsed ? 'justify-center flex-col' : ''}`}>
          {userPhotoURL ? (
            <img src={userPhotoURL} alt="" className="w-8 h-8 rounded-full flex-shrink-0 object-cover"
              style={{ border: '1px solid rgba(212,175,55,0.35)' }} />
          ) : (
            <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
              style={{ background: 'linear-gradient(135deg,#1a3a5c,#d4af37)' }}>
              {userInitials || 'U'}
            </div>
          )}
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium leading-none truncate">
                {userDisplayName || userEmail?.split('@')[0] || 'User'}
              </p>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: 'rgba(212,175,55,0.65)' }}>
                {userEmail || '—'}
              </p>
            </div>
          )}
          {onSignOut && (
            <button
              type="button"
              onClick={onSignOut}
              title="Sign out"
              className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${collapsed ? 'mx-auto' : ''}`}
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(212,175,55,0.75)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'rgba(212,175,55,0.75)'; }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ── Expose to global scope ────────────────────────── */
window.ChatItem = ChatItem;
window.Sidebar  = Sidebar;
