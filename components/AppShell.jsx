'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/AppShell.jsx
   The case workspace: sidebar + chat + panels.
   Was the `App` component in app.jsx.
═══════════════════════════════════════════════ */

import { useState, useRef, useEffect, useCallback } from 'react';

import { apiFetch, apiPost, apiUpload, getUserId } from '@/lib/api';
import { fmtTime } from '@/lib/format';
import { Ico, Spinner } from '@/lib/icons';
import { signOutUser } from '@/lib/firebase';

import Sidebar from '@/components/Sidebar';
import { Message, TypingIndicator, ChatInput } from '@/components/ChatArea';
import DocsPanel from '@/components/DocsPanel';
import AnalyzePanel from '@/components/AnalyzePanel';
import ClientsPanel from '@/components/ClientsPanel';
import BillingPanel from '@/components/BillingPanel';
import TeamPanel from '@/components/TeamPanel';
import InviteToChatModal from '@/components/InviteToChatModal';
import DocumentEditor from '@/components/DocumentEditor';

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
   CASE WORKSPACE
══════════════════════════════════════════════════════ */
export default function AppShell({ user, initialCase, onBackToCases }) {
  /* ── Case state ── */
  const [activeCase,    setActiveCase]    = useState(initialCase ?? null);
  const [caseMembers,   setCaseMembers]   = useState([]);
  const [showTeamPanel, setShowTeamPanel] = useState(false);

  /* ── Conversation state ── */
  const [chats,             setChats]            = useState([]);
  const [activeId,          setActiveId]         = useState(null);
  const [messages,          setMessages]         = useState([]);
  const [activeDocs,        setActiveDocs]       = useState([]);
  const [convMembers,       setConvMembers]      = useState([]);  // members of current chat
  const [showInviteModal,   setShowInviteModal]  = useState(false);

  /* ── Document editor ── */
  const [editingDoc,        setEditingDoc]        = useState(null);

  /* ── Loading / UI state ── */
  const [loadingChats,      setLoadingChats]     = useState(false);
  const [loadingMessages,   setLoadingMessages]  = useState(false);
  const [sending,           setSending]          = useState(false);
  const [typing,            setTyping]           = useState(false);
  const [showUpload,        setShowUpload]       = useState(false);
  const [showConvDocs,      setShowConvDocs]     = useState(true);
  const [collapsed,         setCollapsed]        = useState(false);
  const [view,              setView]             = useState('chat');
  const [error,             setError]            = useState(null);

  const bottomRef      = useRef();
  const convDocsFileRef = useRef();
  const activeChat = chats.find((c) => c.id === activeId);

  /* ── In-flight messages.send calls, keyed by conversation id ──
     Deleting a chat aborts its request: the UI stops waiting instead of failing
     on a conversation that no longer exists, and the server (which polls for
     the deleted row) hangs up on Ollama so the rest of the answer is never
     generated. */
  const sendsInFlight = useRef(new Map());

  const beginSend = (convId) => {
    sendsInFlight.current.get(convId)?.abort();   // one send per chat at a time
    const controller = new AbortController();
    sendsInFlight.current.set(convId, controller);
    return controller;
  };
  const endSend = (convId, controller) => {
    if (sendsInFlight.current.get(convId) === controller) {
      sendsInFlight.current.delete(convId);
    }
  };
  const abortSend = (convId) => {
    const controller = sendsInFlight.current.get(convId);
    if (!controller) return false;
    controller.abort();
    sendsInFlight.current.delete(convId);
    return true;
  };

  /* Current chat, readable from async callbacks that captured an older one */
  const activeIdRef = useRef(null);
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);

  /* AI responds always in 1:1, only on @Waldy in group */
  const isMultiMember = convMembers.length > 1;

  /* Auto-scroll on new message / typing */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  /* No conversation → hide upload UI state (prevents stray panel when switching) */
  useEffect(() => {
    if (!activeId) setShowUpload(false);
  }, [activeId]);

  /* ── Enter a case ── */
  const handleSelectCase = async (caseObj) => {
    setActiveCase(caseObj);
    setView('chat');
    setChats([]);
    setActiveId(null);
    setMessages([]);
    setActiveDocs([]);
    setCaseMembers([]);
    setConvMembers([]);
    setShowTeamPanel(false);
    setShowInviteModal(false);
    setShowUpload(false);
    setLoadingChats(true);
    try {
      const [convData, memberData] = await Promise.all([
        apiFetch('conversations.list', { case_id: caseObj.id }),
        apiFetch('cases.members',      { case_id: caseObj.id }),
      ]);
      setChats(convData);
      setCaseMembers(memberData);
      if (convData.length > 0) {
        await selectConversation(convData[0].id);
      }
    } catch (e) {
      setError('Could not load case data: ' + e.message);
    } finally {
      setLoadingChats(false);
    }
  };

  /* Bootstrap default Personal workspace (no case picker UI) */
  useEffect(() => {
    if (!initialCase) return;
    handleSelectCase(initialCase);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  /* ── Load messages + conversation members ── */
  async function selectConversation(id) {
    setActiveId(id);
    setShowUpload(false);
    setShowInviteModal(false);
    setMessages([]);
    setActiveDocs([]);
    setConvMembers([]);
    setLoadingMessages(true);
    try {
      const [msgs, docs, members] = await Promise.all([
        apiFetch('messages.list',         { conversation_id: id }),
        apiFetch('documents.list',        { conversation_id: id }),
        apiFetch('conversations.members', { conversation_id: id }),
      ]);
      setMessages(msgs);
      setActiveDocs(docs);
      setConvMembers(members);
    } catch (e) {
      setError('Could not load messages: ' + e.message);
    } finally {
      setLoadingMessages(false);
    }
  }

  async function handleRenameChat(id, title) {
    try {
      await apiPost('conversations.rename', { conversation_id: id, title });
      setChats((prev) => prev.map((c) => c.id === id ? { ...c, title } : c));
    } catch (e) {
      setError('Could not rename conversation: ' + e.message);
    }
  }

  async function handleDeleteChat(id) {
    /* Drop the pending reply first: waiting on a chat that is about to be
       deleted is what produced "Failed to send message" mid-generation. */
    if (abortSend(id)) setTyping(false);

    try {
      await apiPost('conversations.delete', { conversation_id: id });
      const remaining = chats.filter((c) => c.id !== id);
      setChats(remaining);
      if (activeId === id) {
        setConvMembers([]);
        if (remaining.length > 0) {
          await selectConversation(remaining[0].id);
        } else {
          setActiveId(null);
          setMessages([]);
          setActiveDocs([]);
        }
      }
    } catch (e) {
      setError('Could not delete conversation: ' + e.message);
    }
  }

  async function handleNewChat() {
    try {
      const conv = await apiPost('conversations.create', {
        user_id: getUserId(),
        case_id: activeCase?.id ?? null,
        title:   'New conversation',
      });
      setChats((prev) => [conv, ...prev]);
      await selectConversation(conv.id);
    } catch (e) {
      setError('Could not create conversation: ' + e.message);
    }
  }

  /* ── Open AI conversation about a repository document ── */
  const handleAskDocAI = useCallback(async (doc) => {
    try {
      const shortName = doc.original_name.length > 50
        ? doc.original_name.slice(0, 50) + '…'
        : doc.original_name;

      const conv = await apiPost('conversations.create', {
        user_id: getUserId(),
        case_id: activeCase?.id ?? null,
        title:   `Ask: ${shortName}`,
      });

      setChats(prev => [conv, ...prev]);
      setActiveId(conv.id);
      setMessages([]);
      setConvMembers([]);
      setActiveDocs([{ id: doc.id, original_name: doc.original_name, status: doc.status, char_count: doc.char_count ?? null }]);
      setShowUpload(false);
      setView('chat');

      const content = `Please help me with questions about this document: **${doc.original_name}**`;
      const tempMsg = {
        id:         `tmp-askdoc-${Date.now()}`,
        role:       'user',
        content,
        doc_name:   doc.original_name,
        created_at: new Date().toISOString(),
      };
      setMessages([tempMsg]);
      setTyping(true);

      const controller = beginSend(conv.id);
      let result;
      try {
        result = await apiPost('messages.send', {
          conversation_id: conv.id,
          content,
          document_id:     doc.id,
          case_id:         activeCase?.id ?? null,
          knowledge_src:   '',
        }, { signal: controller.signal });
      } finally {
        endSend(conv.id, controller);
      }

      /* Deleted mid-answer, or the user moved on — drop the reply */
      if (result.cancelled || !result.user_message || activeIdRef.current !== conv.id) return;

      setMessages([
        { ...result.user_message, doc_name: doc.original_name, time: fmtTime(result.user_message.created_at) },
        ...(result.ai_message
          ? [{ ...result.ai_message, time: fmtTime(result.ai_message.created_at) }]
          : []),
      ]);
    } catch (e) {
      if (e.name === 'AbortError') return;   // chat deleted on purpose, not a failure
      setError('Could not start AI conversation: ' + e.message);
    } finally {
      setTyping(false);
    }
  }, [activeCase]);

  /* ── Open document editor (from docs panel or chat) ── */
  const handleEditDoc = useCallback(async (docId) => {
    try {
      const doc = await apiFetch('documents.get', { id: docId });
      setEditingDoc(doc);
    } catch (e) {
      setError('Could not load document: ' + e.message);
    }
  }, []);

  const refreshConversationDocs = useCallback(async () => {
    if (!activeId) return;
    try {
      const docs = await apiFetch('documents.list', { conversation_id: activeId });
      setActiveDocs(docs);
    } catch (e) {
      console.warn('[LegalTek] documents.list:', e.message);
    }
  }, [activeId]);

  const handleSend = useCallback(async ({ text, doc, knowledgeSrc }) => {
    if (!activeId) return;
    const convId     = activeId;
    const controller = beginSend(convId);
    setSending(true);

    try {
      let docId   = null;
      let docName = null;

      /* 1. Upload document first if attached */
      if (doc) {
        const fd = new FormData();
        fd.append('file',            doc);
        fd.append('conversation_id', activeId);
        fd.append('user_id',         getUserId());
        if (activeCase?.id) fd.append('case_id', activeCase.id);

        const uploaded = await apiUpload('documents.upload', fd, { signal: controller.signal });
        docId   = uploaded.id;
        docName = doc.name;

        setActiveDocs((prev) => [
          ...prev,
          { id: docId, original_name: docName, char_count: uploaded.char_count, status: 'ready' },
        ]);
      }

      /* 2. Optimistic: show user message immediately */
      const content     = text || '(Document sent for analysis)';
      const tempUserMsg = {
        id:         `tmp-${Date.now()}`,
        role:       'user',
        content,
        doc_name:   docName,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);
      setSending(false);

      /* Show typing indicator only when AI will actually respond */
      const willAIRespond = !isMultiMember || /\@waldy/i.test(content);
      if (willAIRespond) setTyping(true);

      /* 3. POST to API */
      const result = await apiPost('messages.send', {
        conversation_id: convId,
        content,
        document_id:     docId,
        case_id:         activeCase?.id ?? null,
        knowledge_src:   knowledgeSrc  || '',
      }, { signal: controller.signal });

      /* Chat was deleted while the model was writing — server stopped early
         and saved nothing, so there is no reply to show. A missing
         user_message means the same thing (older/newer API, abandoned send):
         nothing to render, and not worth an error banner. */
      if (result.cancelled || !result.user_message) return;

      /* Reply for a chat the user has since left — it is saved server-side and
         will be there on reopen; writing it here would land in the wrong chat. */
      if (activeIdRef.current !== convId) return;

      /* 4. Replace temp + add messages (ai_message is null when @Waldy not mentioned) */
      const userMsg = {
        ...result.user_message,
        doc_name: docName,
        time:     fmtTime(result.user_message.created_at),
      };

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        userMsg,
        ...(result.ai_message
          ? [{ ...result.ai_message, time: fmtTime(result.ai_message.created_at) }]
          : []),
      ]);

      /* 5. Auto-title conversation on first real message */
      if (messages.length === 0 && text) {
        const autoTitle = text.length > 55 ? text.slice(0, 55) + '…' : text;
        await apiPost('conversations.rename', { conversation_id: convId, title: autoTitle });
        setChats((prev) =>
          prev.map((c) => c.id === convId
            ? { ...c, title: autoTitle, updated_at: new Date().toISOString() }
            : c)
        );
      }

    } catch (e) {
      if (e.name === 'AbortError') return;   // chat deleted on purpose, not a failure
      setError('Failed to send message: ' + e.message);
      setSending(false);
    } finally {
      endSend(convId, controller);
      setTyping(false);
    }
  }, [activeId, activeCase, isMultiMember, messages.length]);

  const latestDoc = activeDocs[activeDocs.length - 1] ?? null;

  /* ── Chat / Docs interface ── */
  return (
    <div className="h-screen flex animated-bg overflow-hidden" style={{ color: '#1a1a2e' }}>

      <Sidebar
        chats={chats}
        activeId={activeId}
        onSelect={(id) => { selectConversation(id); setView('chat'); }}
        onNew={() => { handleNewChat(); setView('chat'); }}
        onDelete={handleDeleteChat}
        onRename={handleRenameChat}
        loading={loadingChats}
        collapsed={collapsed}
        onToggle={() => setCollapsed((p) => !p)}
        view={view}
        onViewChange={setView}
        activeCase={activeCase}
        onBackToCases={onBackToCases}
        userDisplayName={user.displayName}
        userEmail={user.email}
        userPhotoURL={user.photoURL}
        userInitials={getInitials(user.displayName || user.email || 'U')}
        onSignOut={signOutUser}
      />

      {/* ── DOCS VIEW ── */}
      {view === 'docs' && (
        <DocsPanel
          caseId={activeCase.id}
          onEditDoc={handleEditDoc}
          onOpenAnalyze={() => setView('analyze')}
          onAskDocAI={handleAskDocAI}
        />
      )}
      {view === 'analyze' && (
        <AnalyzePanel caseId={activeCase.id} onEditDoc={handleEditDoc} />
      )}
      {view === 'clients' && (
        <ClientsPanel caseId={activeCase.id} />
      )}
      {view === 'billing' && (
        <BillingPanel caseId={activeCase.id} />
      )}

      {/* ── CHAT VIEW ── */}
      <main
        className="flex-1 flex flex-col min-w-0 overflow-hidden relative"
        style={{ display: view === 'chat' ? 'flex' : 'none' }}>

        {/* ── HEADER ── */}
        <header className="glass flex-shrink-0 px-5 py-3 flex items-center justify-between gap-4"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>

          {/* Left: conversation title */}
          <div className="min-w-0 flex-1">
            <h2 className="text-gray-900 font-semibold text-base leading-none truncate">
              {activeChat?.title ?? 'Select a conversation'}
            </h2>
            <p className="text-gray-400 text-xs mt-1">Intelligent legal analysis</p>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 flex-shrink-0">

            {/* ── Conversation participants + Invite button ── */}
            {activeId && (
              <div className="flex items-center gap-1.5">
                {convMembers.length > 0 && (
                  <div className="flex items-center -space-x-1.5 mr-1">
                    {convMembers.slice(0, 3).map(m => (
                      <div key={m.user_id}
                        title={m.name}
                        className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-white text-[9px] font-bold"
                        style={{ background: avatarGrad(m.user_id), borderColor: 'rgba(255,255,255,0.9)' }}>
                        {getInitials(m.name)}
                      </div>
                    ))}
                    {convMembers.length > 3 && (
                      <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-gray-500 text-[9px] font-semibold"
                        style={{ background: 'rgba(13,27,42,0.1)', borderColor: 'rgba(255,255,255,0.9)' }}>
                        +{convMembers.length - 3}
                      </div>
                    )}
                  </div>
                )}

                {/* Invite to this chat */}
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
                  title="Manage chat participants"
                  style={{
                    background: showInviteModal ? 'rgba(13,27,42,0.12)' : 'rgba(13,27,42,0.05)',
                    border:     `1px solid ${showInviteModal ? 'rgba(13,27,42,0.28)' : 'rgba(13,27,42,0.12)'}`,
                    color:      '#374151',
                  }}>
                  <Ico name="userplus" size={13} stroke="currentColor" />
                  <span className="hidden sm:inline">Invite</span>
                </button>
              </div>
            )}

            {/* Divider */}
            <div className="w-px h-5" style={{ background: 'rgba(0,0,0,0.1)' }} />

            {/* ── Case team members ── */}
            <button
              onClick={() => setShowTeamPanel(true)}
              title="Manage case team"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all"
              style={{
                background: showTeamPanel ? 'rgba(13,27,42,0.12)' : 'rgba(13,27,42,0.04)',
                border:     `1px solid ${showTeamPanel ? 'rgba(13,27,42,0.28)' : 'rgba(13,27,42,0.1)'}`,
                color:      '#374151',
              }}>
              <Ico name="users" size={13} stroke="currentColor" />
              <span className="hidden sm:inline">Team</span>
              {caseMembers.length > 0 && (
                <span className="text-[10px] font-semibold px-1 rounded"
                  style={{ background: 'rgba(13,27,42,0.08)', color: '#374151' }}>
                  {caseMembers.length}
                </span>
              )}
            </button>

            {/* Latest doc badge */}
            {latestDoc && (
              <button
                onClick={() => handleEditDoc(latestDoc.id)}
                title="Edit document"
                className="hidden md:flex glass px-2.5 py-1.5 rounded items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors group"
                style={{ border: '1px solid rgba(13,27,42,0.1)' }}>
                <Ico name="file" size={12} stroke="#d4af37" />
                <span className="max-w-[100px] truncate">{latestDoc.original_name}</span>
                <Ico name="pencil" size={10} stroke="rgba(13,27,42,0.3)" />
              </button>
            )}

            {/* AI status */}
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-emerald-600 text-xs font-medium hidden sm:inline">AI active</span>
            </div>
          </div>
        </header>

        {/* Error banner */}
        {error && (
          <div className="flex-shrink-0 mx-6 mt-4 px-4 py-3 rounded-lg text-sm text-red-600"
            style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.2)' }}>
            <span className="font-semibold">Error:</span> {error}
            <button onClick={() => setError(null)} className="ml-3 text-red-400 hover:text-red-600">
              <Ico name="close" size={13} stroke="currentColor" />
            </button>
          </div>
        )}

        {/* Messages + conversation documents (right rail) */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-6 min-w-0">

          {/* Group mode banner */}
          {isMultiMember && (
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-xs mb-5"
              style={{ background: 'rgba(13,27,42,0.05)', border: '1px solid rgba(13,27,42,0.1)' }}>
              <Ico name="users" size={13} stroke="rgba(13,27,42,0.4)" />
              <span className="text-gray-500">
                Group chat —{' '}
                <span className="font-semibold" style={{ color: '#d4af37' }}>@Waldy</span>
                {' '}to get an AI response
              </span>
              <div className="ml-auto flex items-center -space-x-1.5">
                {convMembers.map(m => (
                  <div key={m.user_id} title={m.name}
                    className="w-5 h-5 rounded-full border flex items-center justify-center text-white text-[8px] font-bold"
                    style={{ background: avatarGrad(m.user_id), borderColor: 'rgba(255,255,255,0.8)' }}>
                    {getInitials(m.name)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading conversation list for this case */}
          {!activeId && loadingChats && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-400 text-sm">
              <Spinner size={20} />
              <span>Loading conversations…</span>
            </div>
          )}

          {/* No conversation selected */}
          {!activeId && !loadingChats && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <div className="w-16 h-16 rounded-lg btn-primary flex items-center justify-center">
                <Ico name="shield" size={32} stroke="white" />
              </div>
              <div>
                <h3 className="text-gray-900 font-semibold text-lg">Ready to work on this case</h3>
                <p className="text-gray-500 text-sm mt-1">
                  Create a new conversation or select one from the sidebar.
                </p>
              </div>
              <button onClick={handleNewChat}
                className="btn-primary px-6 py-2.5 rounded-lg text-white text-sm font-medium">
                Start a Conversation
              </button>
            </div>
          )}

          {/* Loading messages */}
          {loadingMessages && (
            <div className="flex items-center justify-center gap-2 py-12 text-stone-400 text-sm">
              <Spinner size={16} /> Loading messages…
            </div>
          )}

          {/* Empty conversation */}
          {!loadingMessages && activeId && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
              <Ico name="empty" size={36} stroke="rgba(13,27,42,0.2)" />
              <p className="text-gray-500 text-sm">No messages yet. Say hello or upload a document!</p>
              {isMultiMember && (
                <p className="text-gray-400 text-xs">
                  Tip: mention <span className="font-semibold" style={{ color: '#d4af37' }}>@Waldy</span> to ask the AI
                </p>
              )}
            </div>
          )}

          {/* Message list */}
          {!loadingMessages && messages.map((m) => (
            <Message key={m.id} msg={m} onEditDoc={handleEditDoc} />
          ))}

          {typing && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>

        {/* Conversation documents — fixed rail right of chat */}
        {activeId && (
          <aside
            className="hidden md:flex flex-col flex-shrink-0 border-l overflow-hidden transition-all duration-200"
            style={{
              borderColor: 'rgba(13,27,42,0.08)',
              background: 'rgba(255,255,255,0.45)',
              width: showConvDocs ? '15rem' : '32px',
            }}>
            <div
              className="px-3 py-2.5 flex-shrink-0 flex items-center gap-2"
              style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              {showConvDocs && (
                <span className="flex-1 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(13,27,42,0.45)' }}>
                  Conversation files
                </span>
              )}
              {showConvDocs && (
                <button
                  type="button"
                  onClick={() => convDocsFileRef.current?.click()}
                  title="Upload document"
                  className="flex-shrink-0 p-0.5 rounded transition-colors"
                  style={{ color: 'rgba(13,27,42,0.35)' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#b8902a'}
                  onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,27,42,0.35)'}>
                  <Ico name="upload" size={13} stroke="currentColor" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowConvDocs(v => !v)}
                title={showConvDocs ? 'Collapse panel' : 'Expand panel'}
                className="flex-shrink-0 p-0.5 rounded transition-colors"
                style={{ color: 'rgba(13,27,42,0.35)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#0d1b2a'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,27,42,0.35)'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showConvDocs
                    ? <><polyline points="15 18 9 12 15 6"/></>
                    : <><polyline points="9 18 15 12 9 6"/></>}
                </svg>
              </button>
            </div>
            {showConvDocs && <div
              className="flex-1 overflow-y-auto py-2 px-2 space-y-1 flex flex-col"
              onDragOver={e => { e.preventDefault(); e.currentTarget.dataset.drag = '1'; e.currentTarget.style.background = 'rgba(212,175,55,0.07)'; }}
              onDragLeave={e => { delete e.currentTarget.dataset.drag; e.currentTarget.style.background = ''; }}
              onDrop={e => { e.preventDefault(); e.currentTarget.style.background = ''; const f = e.dataTransfer.files[0]; if (f) handleSend({ doc: f }); }}>
              <input ref={convDocsFileRef} type="file" accept=".docx" className="hidden"
                onChange={e => { if (e.target.files[0]) handleSend({ doc: e.target.files[0] }); e.target.value = ''; }} />
              {activeDocs.length === 0 && !loadingMessages && (
                <button
                  type="button"
                  onClick={() => convDocsFileRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 py-5 px-2 rounded-lg w-full transition-all"
                  style={{ border: '1px dashed rgba(13,27,42,0.15)', color: '#9ca3af' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; e.currentTarget.style.color = '#b8902a'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(13,27,42,0.15)'; e.currentTarget.style.color = '#9ca3af'; }}>
                  <Ico name="upload" size={18} stroke="currentColor" strokeWidth={1.5} />
                  <span className="text-[11px] text-center leading-relaxed">Drop a .docx or click to upload context</span>
                </button>
              )}
              {activeDocs.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => handleEditDoc(d.id)}
                  className="w-full text-left flex items-start gap-2 rounded-lg px-2.5 py-2 transition-colors"
                  style={{
                    background: 'transparent',
                    border: '1px solid transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(13,27,42,0.05)';
                    e.currentTarget.style.borderColor = 'rgba(212,175,55,0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}>
                  <Ico name="file" size={14} stroke="#d4af37" className="flex-shrink-0 mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-gray-800 truncate" title={d.original_name}>
                      {d.original_name}
                    </span>
                    <span className="block text-[10px] mt-0.5" style={{ color: '#9ca3af' }}>
                      {d.status === 'ready' ? 'Ready' : d.status === 'processing' ? 'Processing…' : d.status || '—'}
                    </span>
                  </span>
                </button>
              ))}
            </div>}
          </aside>
        )}
        </div>

        {/* Input + upload only when a conversation is selected */}
        {activeId ? (
          <ChatInput
            onSend={handleSend}
            showUpload={showUpload}
            onToggleUpload={setShowUpload}
            disabled={sending}
            isMultiMember={isMultiMember}
          />
        ) : (
          <div
            className="glass-input flex-shrink-0 px-5 py-4 flex flex-col items-center justify-center gap-1"
            style={{ minHeight: '88px' }}>
            <p className="text-sm text-center" style={{ color: '#6b7280' }}>
              {loadingChats
                ? 'Loading conversations…'
                : 'Select a conversation in the sidebar or start one to send messages and upload documents.'}
            </p>
            {!loadingChats && (
              <p className="text-[11px] text-center text-gray-400">
                Chat and file upload are available after you open or create a chat.
              </p>
            )}
          </div>
        )}

        {/* ── Team Panel (case-level, slide-in) ── */}
        {showTeamPanel && (
          <TeamPanel
            caseId={activeCase.id}
            members={caseMembers}
            onClose={() => setShowTeamPanel(false)}
            onMembersChange={setCaseMembers}
          />
        )}
      </main>

      {/* ── Invite to Chat Modal (conversation-level, centered) ── */}
      {showInviteModal && activeId && (
        <InviteToChatModal
          conversationId={activeId}
          convMembers={convMembers}
          caseMembers={caseMembers}
          onClose={() => setShowInviteModal(false)}
          onMembersChange={setConvMembers}
        />
      )}

      {/* ── Document Editor (slide-in, 75% width) ── */}
      {editingDoc && (
        <DocumentEditor
          doc={editingDoc}
          onClose={() => {
            setEditingDoc(null);
            refreshConversationDocs();
          }}
          onSaved={async (html) => {
            setEditingDoc((prev) => (prev ? { ...prev, extracted_text: html } : null));
            await refreshConversationDocs();
          }}
        />
      )}
    </div>
  );
}
