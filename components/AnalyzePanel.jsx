/* ═══════════════════════════════════════════════
   LegalTek AI — components/AnalyzePanel.jsx
   Dummy contract metadata table + AI Query columns (demo)
═══════════════════════════════════════════════ */

const { useState, useEffect, useCallback, useMemo } = React;
const { Ico, Spinner, apiFetch, getUserId } = window;

const DUMMY_PARTIES = ['Acme Corp', 'Globex LLC', 'Initech Partners', 'Umbrella AG', 'Stark Industries Ltd.', 'Wayne Enterprises'];
const DUMMY_DATES = ['2024-03-15', '2023-11-02', '2025-01-20', '2024-08-01', '2022-12-10'];

function buildDummyRow(doc, index) {
  return {
    id: doc.id,
    fileName: doc.original_name || 'Untitled',
    contractDate: DUMMY_DATES[index % DUMMY_DATES.length],
    counterParty: DUMMY_PARTIES[index % DUMMY_PARTIES.length],
    totalClauses: 12 + (index % 7) * 4 + (Number(doc.id) % 5),
  };
}

/** Alternating Yes / No for demo */
function fakeYesNoForQuery(rowCount, queryIndex) {
  const out = [];
  for (let i = 0; i < rowCount; i++) {
    const flip = (i + queryIndex) % 2 === 0;
    out.push(flip ? 'Yes' : 'No');
  }
  return out;
}

function AnalyzePanel({ caseId, onEditDoc }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [queryInput, setQueryInput] = useState('');
  /** Each entry: { id, label, values: string[] } */
  const [queryColumns, setQueryColumns] = useState([]);

  const loadDocs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const base = caseId ? { case_id: caseId, folder_id: 'all' } : { user_id: getUserId(), folder_id: 'all' };
      const data = await apiFetch('documents.list_all', base);
      setDocs(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message || 'Could not load documents');
      setDocs([]);
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const rows = useMemo(
    () => docs.map((d, i) => buildDummyRow(d, i)),
    [docs]
  );

  useEffect(() => {
    setQueryColumns([]);
  }, [rows.length]);

  function handleRunAiQuery() {
    const label = queryInput.trim() || 'Query';
    setQueryColumns((prev) => {
      const nextIdx = prev.length;
      const values = fakeYesNoForQuery(rows.length, nextIdx);
      return [...prev, { id: `q-${Date.now()}`, label, values }];
    });
    setQueryInput('');
  }

  return (
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ color: '#1a1a2e' }}>
      <header className="glass flex-shrink-0 px-5 py-3.5"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
        <h1 className="text-base font-semibold text-gray-900 leading-none">Analyze</h1>
        <p className="text-xs text-gray-400 mt-1">
          Contract metadata preview (dummy data). Rows match uploaded documents in this project.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {error && (
          <div className="px-4 py-2.5 rounded-lg text-sm text-red-600"
            style={{ background: 'rgba(185,28,28,0.07)', border: '1px solid rgba(185,28,28,0.18)' }}>
            {error}
          </div>
        )}

        {/* AI Query */}
        <section
          className="rounded-lg p-4"
          style={{ background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(13,27,42,0.1)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-widest mb-2.5"
            style={{ color: 'rgba(13,27,42,0.45)' }}>
            AI query (demo)
          </p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <div className="flex-1 min-w-0">
              <label className="sr-only" htmlFor="analyze-ai-query">Question</label>
              <input
                id="analyze-ai-query"
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRunAiQuery(); }}
                placeholder="e.g. Contains NDA"
                className="w-full px-3 py-2 rounded-lg text-sm text-gray-900 outline-none"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(13,27,42,0.14)',
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleRunAiQuery}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white flex-shrink-0 transition-opacity disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#1a3a5c,#0d1b2a)', border: '1px solid rgba(212,175,55,0.35)' }}>
              <Ico name="chat" size={13} stroke="currentColor" />
              AI Query
            </button>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Adds a column with dummy Yes/No answers per row. Real extraction will replace this later.
          </p>
        </section>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-16 text-stone-400 text-sm">
            <Spinner size={16} /> Loading documents…
          </div>
        )}

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg"
            style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed rgba(13,27,42,0.12)' }}>
            <Ico name="file" size={36} stroke="rgba(13,27,42,0.2)" />
            <p className="text-gray-500 text-sm mt-3">No documents in this project yet.</p>
            <p className="text-gray-400 text-xs mt-1 max-w-sm">
              Upload files from Repository to populate this table (one row per document).
            </p>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg"
            style={{ border: '1px solid rgba(0,0,0,0.07)', background: 'rgba(255,255,255,0.85)' }}>
            <table className="w-full text-sm text-left min-w-[700px]">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', background: 'rgba(13,27,42,0.04)' }}>
                  <th className="px-3 py-2.5 font-semibold text-gray-700">Document</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap">Contract date</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-700">Counter party</th>
                  <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap text-right">Total clauses</th>
                  {onEditDoc && (
                    <th className="px-3 py-2.5 font-semibold text-gray-700 whitespace-nowrap text-right w-24">Open</th>
                  )}
                  {queryColumns.map((col) => (
                    <th key={col.id} className="px-3 py-2.5 font-semibold text-amber-900 whitespace-nowrap max-w-[140px] truncate"
                      title={col.label}>
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td className="px-3 py-2.5 text-gray-900 font-medium truncate max-w-[220px]" title={row.fileName}>
                      {row.fileName}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{row.contractDate}</td>
                    <td className="px-3 py-2.5 text-gray-600">{row.counterParty}</td>
                    <td className="px-3 py-2.5 text-gray-800 text-right tabular-nums">{row.totalClauses}</td>
                    {onEditDoc && (
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onEditDoc(row.id)}
                          title="Open in editor"
                          className="px-2.5 py-1 rounded text-xs font-medium transition-colors"
                          style={{
                            background: 'rgba(13,27,42,0.06)',
                            border: '1px solid rgba(13,27,42,0.14)',
                            color: '#374151',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(212,175,55,0.45)';
                            e.currentTarget.style.color = '#0d1b2a';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(13,27,42,0.14)';
                            e.currentTarget.style.color = '#374151';
                          }}>
                          Open
                        </button>
                      </td>
                    )}
                    {queryColumns.map((col) => (
                      <td key={col.id} className="px-3 py-2.5 font-medium whitespace-nowrap"
                        style={{ color: col.values[ri] === 'Yes' ? '#059669' : '#b91c1c' }}>
                        {col.values[ri] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

window.AnalyzePanel = AnalyzePanel;
