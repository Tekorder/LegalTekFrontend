const { useState, useEffect, useCallback, useRef } = React;

const API_BASE = './api.php';
const CONV_STORAGE_KEY = 'olamalab_active_conv';

function usePersistedNumber(key, fallback, min, max) {
  const [value, setValue] = useState(() => {
    const stored = localStorage.getItem(key);
    const n = stored ? parseInt(stored, 10) : fallback;
    return Math.min(max, Math.max(min, n));
  });
  const set = (n) => {
    const clamped = Math.min(max, Math.max(min, n));
    setValue(clamped);
    localStorage.setItem(key, String(clamped));
  };
  return [value, set];
}

function startDragResize(onMove, axis) {
  const onMouseMove = (e) => onMove(e);
  const onMouseUp = () => {
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    document.body.classList.remove('is-resizing-col', 'is-resizing-row');
  };
  document.body.classList.add(axis === 'row' ? 'is-resizing-row' : 'is-resizing-col');
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);
}

function ColResizer({ getWidth, setWidth, invert, label }) {
  return (
    <div
      className="col-resizer"
      role="separator"
      aria-label={label || 'Resize column'}
      onMouseDown={(e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startW = getWidth();
        startDragResize((ev) => {
          const delta = invert ? startX - ev.clientX : ev.clientX - startX;
          setWidth(startW + delta);
        }, 'col');
      }}
    />
  );
}

function RowResizer({ getPct, setPct, containerRef }) {
  return (
    <div
      className="row-resizer"
      role="separator"
      aria-label="Resize panels"
      onMouseDown={(e) => {
        e.preventDefault();
        const startY = e.clientY;
        const startPct = getPct();
        const el = containerRef && containerRef.current;
        startDragResize((ev) => {
          if (!el) return;
          const h = el.getBoundingClientRect().height;
          const deltaPct = ((ev.clientY - startY) / h) * 100;
          setPct(startPct + deltaPct);
        }, 'row');
      }}
    />
  );
}

async function apiFetch(action, options = {}, query = {}) {
  const qs = new URLSearchParams({ action, ...query });
  const url = `${API_BASE}?${qs}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    throw new Error(text.slice(0, 120) || 'Invalid JSON response');
  }
  if (!res.ok) throw new Error(data.error || data.detail || 'Request failed');
  return data;
}

function JsonBlock({ data }) {
  if (!data) return <span className="empty">—</span>;
  return <pre className="json-block">{JSON.stringify(data, null, 2)}</pre>;
}

/** Normalize line breaks (including literal \\n from JSON) */
function normalizeNewlines(text) {
  if (text == null) return '';
  return String(text)
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

/** Parse *italic*, **bold**, `code` into React fragments */
function parseInlineMarkdown(line) {
  const re = /\*\*([^*]+)\*\*|\*([^*\n]+)\*|`([^`]+)`/g;
  const parts = [];
  let last = 0;
  let match;
  let key = 0;

  while ((match = re.exec(line)) !== null) {
    if (match.index > last) {
      parts.push(<React.Fragment key={key++}>{line.slice(last, match.index)}</React.Fragment>);
    }
    if (match[1] != null) {
      parts.push(<strong key={key++}>{match[1]}</strong>);
    } else if (match[2] != null) {
      parts.push(<em key={key++}>{match[2]}</em>);
    } else if (match[3] != null) {
      parts.push(<code key={key++} className="md-code">{match[3]}</code>);
    }
    last = match.index + match[0].length;
  }

  if (last < line.length) {
    parts.push(<React.Fragment key={key++}>{line.slice(last)}</React.Fragment>);
  }

  return parts.length ? parts : line;
}

function FormattedText({ text, className }) {
  const normalized = normalizeNewlines(text);
  if (!normalized) return null;

  const lines = normalized.split('\n');
  const blocks = [];

  lines.forEach((line, idx) => {
    const listMatch = line.match(/^\s*[\*\-]\s+(.*)$/);
    if (listMatch) {
      blocks.push(
        <div key={`li-${idx}`} className="md-li">
          <span className="md-bullet">›</span>
          <span>{parseInlineMarkdown(listMatch[1])}</span>
        </div>
      );
    } else if (line.trim() === '') {
      blocks.push(<div key={`br-${idx}`} className="md-spacer" />);
    } else {
      blocks.push(
        <p key={`p-${idx}`} className="md-p">
          {parseInlineMarkdown(line)}
        </p>
      );
    }
  });

  return <div className={className ? `formatted-text ${className}` : 'formatted-text'}>{blocks}</div>;
}

function Panel({ title, tag, children }) {
  return (
    <div className="panel">
      <div className="panel-header">
        <span>{title}</span>
        {tag && <span className="tag">{tag}</span>}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}

function ChatThread({ messages }) {
  const threadRef = useRef(null);
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="chat-thread" ref={threadRef}>
        <div className="empty" style={{ padding: '0.75rem' }}>New session — history stored in MySQL</div>
      </div>
    );
  }

  return (
    <div className="chat-thread" ref={threadRef}>
      {messages.map((m) => (
        <div key={m.id} className={`chat-bubble ${m.role}`}>
          <div className="role">{m.role === 'user' ? 'USER >>' : 'LLAMA <<'}</div>
          <FormattedText text={m.content} className="content" />
        </div>
      ))}
    </div>
  );
}

function LocalTab({ models }) {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState(models[0] || 'llama3.2');
  const [memory, setMemory] = useState(true);
  const [loading, setLoading] = useState(false);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState(null);
  const [meta, setMeta] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [sidebarW, setSidebarW] = usePersistedNumber('ol_sidebar_w', 220, 160, 420);
  const [drawerW, setDrawerW] = usePersistedNumber('ol_drawer_w', 400, 280, 720);
  const [payloadPct, setPayloadPct] = usePersistedNumber('ol_payload_pct', 32, 15, 55);
  const [responsePct, setResponsePct] = usePersistedNumber('ol_response_pct', 32, 15, 55);
  const [ollamaRaw, setOllamaRaw] = useState(null);

  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (models.length && !models.includes(model)) setModel(models[0]);
  }, [models]);

  const loadConversations = useCallback(async () => {
    try {
      const data = await apiFetch('conversations', {}, { source: 'local' });
      setConversations(data.items || []);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadConversation = useCallback(async (id) => {
    if (!id) {
      setMessages([]);
      return;
    }
    try {
      const data = await apiFetch('conversation', {}, { id });
      setMessages(data.messages || []);
      if (data.model) setModel(data.model);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    loadConversations();
    const saved = localStorage.getItem(CONV_STORAGE_KEY);
    if (saved) {
      const id = parseInt(saved, 10);
      setConversationId(id);
      loadConversation(id);
    }
  }, [loadConversations, loadConversation]);

  const selectConversation = (id) => {
    setConversationId(id);
    localStorage.setItem(CONV_STORAGE_KEY, String(id));
    setPayload(null);
    setOllamaRaw(null);
    setError(null);
    setMeta(null);
    loadConversation(id);
  };

  const newConversation = async () => {
    try {
      const data = await apiFetch('conversation_new', {
        method: 'POST',
        body: JSON.stringify({ source: 'local', model, title: 'New conversation' }),
      });
      await loadConversations();
      selectConversation(data.conversation_id);
      setPrompt('');
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteConversation = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation and all its history?')) return;
    try {
      await apiFetch('conversation_delete', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
      if (conversationId === id) {
        setConversationId(null);
        localStorage.removeItem(CONV_STORAGE_KEY);
        setMessages([]);
      }
      loadConversations();
    } catch (err) {
      setError(err.message);
    }
  };

  const send = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError(null);
    setMeta(null);

    const body = {
      prompt: prompt.trim(),
      model,
      stream: false,
      memory,
    };
    if (conversationId) body.conversation_id = conversationId;

    setPayload(body);

    try {
      const data = await apiFetch('generate', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      if (!conversationId || data.conversation_id !== conversationId) {
        selectConversation(data.conversation_id);
      } else {
        await loadConversation(data.conversation_id);
      }

      setMeta({
        duration_ms: data.duration_ms,
        log_id: data.log_id,
        memory_messages: data.memory_messages,
      });
      setPayload(data.payload_sent || body);
      setOllamaRaw(data.ollama || null);
      setPrompt('');
      loadConversations();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  const drawerSplitRef = useRef(null);

  return (
    <div className="local-layout">
      <aside className="conv-sidebar" style={{ width: sidebarW, flexShrink: 0 }}>
        <div className="conv-sidebar-header">
          <span>Conversations</span>
          <button type="button" className="btn btn-sm" onClick={newConversation}>New</button>
        </div>
        <div className="conv-list">
          {conversations.length === 0 && (
            <div className="empty">No conversations yet</div>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`conv-item ${conversationId === c.id ? 'active' : ''}`}
              onClick={() => selectConversation(c.id)}
            >
              <div className="conv-item-title">#{c.id} {c.title}</div>
              <div className="meta">{c.message_count} msgs</div>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={(e) => deleteConversation(c.id, e)}
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </aside>

      <ColResizer
        label="Resize conversations sidebar"
        getWidth={() => sidebarW}
        setWidth={setSidebarW}
      />

      <div className="local-center">
        <div className="controls">
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <label className="memory-toggle">
            <input type="checkbox" checked={memory} onChange={(e) => setMemory(e.target.checked)} />
            Memory
          </label>
          {conversationId && <span className="meta chip">#{conversationId}</span>}
          <button className="btn primary" onClick={send} disabled={loading || !prompt.trim()}>
            {loading ? 'Sending…' : 'Send'}
          </button>
        </div>

        <ChatThread messages={messages} />

        <div className="local-input-wrap">
          <div className="panel-header">
            <span>Your message</span>
            <span className="tag">Ctrl+Enter</span>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type your message…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) send();
            }}
          />
        </div>
      </div>

      {drawerOpen ? (
        <>
          <ColResizer
            label="Resize debug panel"
            getWidth={() => drawerW}
            setWidth={setDrawerW}
            invert
          />
          <aside className="debug-drawer" style={{ width: drawerW, flexShrink: 0 }}>
            <div className="drawer-header">
              <span>Debug</span>
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                onClick={() => setDrawerOpen(false)}
                title="Hide panel"
              >
                →
              </button>
            </div>
            <div
              ref={drawerSplitRef}
              className="drawer-split drawer-split-3"
              style={{
                gridTemplateRows: `${payloadPct}% 8px ${responsePct}% 8px minmax(0, 1fr)`,
              }}
            >
              <Panel title="Payload JSON" tag="out">
                {loading ? <span className="loading">Sending…</span> : <JsonBlock data={payload} />}
              </Panel>
              <RowResizer
                getPct={() => payloadPct}
                setPct={setPayloadPct}
                containerRef={drawerSplitRef}
              />
              <Panel title="Response JSON" tag={error ? 'error' : meta ? 'ok' : 'raw'}>
                {error && <div className="text-error">ERROR: {error}</div>}
                {loading && <span className="loading">Waiting…</span>}
                {!loading && !error && <JsonBlock data={ollamaRaw} />}
              </Panel>
              <RowResizer
                getPct={() => responsePct}
                setPct={setResponsePct}
                containerRef={drawerSplitRef}
              />
              <Panel title="AI Says" tag={meta ? `${meta.duration_ms}ms` : '—'}>
                {error && !loading && <div className="text-error">{error}</div>}
                {loading && <span className="loading">Waiting…</span>}
                {!loading && !error && (
                  <>
                    <FormattedText
                      className="response-text"
                      text={lastAssistant ? lastAssistant.content : '—'}
                    />
                    {meta && (
                      <div className="meta">
                        {meta.memory_messages} messages in context
                      </div>
                    )}
                  </>
                )}
              </Panel>
            </div>
          </aside>
        </>
      ) : (
        <button
          type="button"
          className="drawer-tab"
          onClick={() => setDrawerOpen(true)}
          title="Show payload and response"
        >
          ◀ Debug
        </button>
      )}
    </div>
  );
}

function ApiDebugTab() {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [hist, convs] = await Promise.all([
        apiFetch('history', {}, { source: 'api' }),
        apiFetch('conversations', {}, { source: 'api' }),
      ]);
      setItems(hist.items || []);
      setConversations(convs.items || []);
      if (hist.items && hist.items.length && !selected) setSelected(hist.items[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 8000);
    return () => clearInterval(iv);
  }, [load]);

  return (
    <div className="api-tab">
      <div className="docs-box">
        <strong>// API</strong>
        <pre>{`POST .../api.php?action=api
{"prompt":"...","conversation_id":3,"memory":true}`}</pre>
      </div>

      <div className="refresh-bar">
        <span className="meta">{items.length} req · {conversations.length} conv</span>
        <button className="btn" onClick={load} disabled={loading}>
          {loading ? '...' : '↻'}
        </button>
      </div>

      {conversations.length > 0 && (
        <div className="api-conv-strip api-list-flat">
          {conversations.map((c) => (
            <div key={c.id} className="api-entry">
              <div className="api-entry-header">
                <span className="api-entry-prompt">#{c.id} {c.title}</span>
                <span className="meta">{c.message_count} msgs</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="api-workspace">
        <div className="api-col">
          <div className="panel-header">INCOMING REQUESTS</div>
          <div className="api-col-scroll api-list-flat">
            {items.length === 0 && <div className="empty">No API requests yet</div>}
            {items.map((item) => (
              <div
                key={item.id}
                className={`api-entry ${selected && selected.id === item.id ? 'selected' : ''}`}
                onClick={() => setSelected(item)}
              >
                <div className="api-entry-header">
                  <span className="api-entry-prompt">
                    #{item.id}
                    {item.conversation_id ? ` c${item.conversation_id}` : ''} {item.prompt}
                  </span>
                  <span className={`badge ${item.status}`}>{item.status}</span>
                </div>
                <div className="meta" style={{ padding: '0 0.6rem 0.4rem' }}>
                  {item.created_at}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="api-col api-col-detail">
          {selected ? (
            <>
              <Panel title={`REQ #${selected.id}`} tag={selected.model}>
                <JsonBlock data={selected.request_payload} />
              </Panel>
              <Panel title="RESPONSE" tag={`${selected.duration_ms}ms`}>
                {selected.status === 'error' ? (
                  <div style={{ color: 'var(--red)' }}>{selected.error_message}</div>
                ) : (
                  <FormattedText className="response-text" text={selected.response_text} />
                )}
              </Panel>
            </>
          ) : (
            <div className="empty" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Select a request
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [tab, setTab] = useState('local');
  const [online, setOnline] = useState(null);
  const [models, setModels] = useState(['llama3.2']);

  useEffect(() => {
    apiFetch('health')
      .then((d) => setOnline(d.status === 'online'))
      .catch(() => setOnline(false));
    apiFetch('models')
      .then((d) => setModels(d.models && d.models.length ? d.models : ['llama3.2']))
      .catch(() => {});
  }, []);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo">
          Olamalab
        </div>
        <div className="header-status">
          <span className={`status-dot ${online ? '' : 'offline'}`} />
          {online === null ? 'Connecting…' : online ? 'Online' : 'Offline'}
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab ${tab === 'local' ? 'active' : ''}`} onClick={() => setTab('local')}>
          Chat
        </button>
        <button className={`tab ${tab === 'api' ? 'active' : ''}`} onClick={() => setTab('api')}>
          API Debug
        </button>
      </nav>

      <main className="main">
        {tab === 'local' ? <LocalTab models={models} /> : <ApiDebugTab />}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
