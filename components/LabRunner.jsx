'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/LabRunner.jsx
   The run screen for any lab.

   Nothing here knows about ledgers or contracts. The lab descriptor from
   `labs.list` supplies the accepted file types, the input form, and the table
   columns, so a new backend lab gets a working screen for free.

   The upload control is the one from the original Lab Jose screen — same
   drag-and-drop, dedupe-by-name+size, and file chips — generalised to take its
   `accept` list and file cap from the descriptor.
═══════════════════════════════════════════════ */

import { Fragment, useRef, useState } from 'react';
import { apiUpload } from '@/lib/api';
import { Ico, Spinner } from '@/lib/icons';

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

/* ── Cell rendering ──────────────────────────── */

const CONFIDENCE_STYLE = (score) =>
  score >= 0.9 ? { background: 'rgba(5,150,105,0.1)',  color: '#047857', border: '1px solid rgba(5,150,105,0.25)' }
: score >= 0.5 ? { background: 'rgba(217,119,6,0.1)',  color: '#92400e', border: '1px solid rgba(217,119,6,0.25)' }
:                { background: 'rgba(185,28,28,0.08)', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.2)' };

const STATUS_STYLE = (row) =>
  row.priority === 'BLOCKED' || row.status === 'FAILED' || row.status === 'UNREADABLE' || row.status === 'NEEDS_REVIEW'
    ? { background: 'rgba(185,28,28,0.08)', color: '#b91c1c', border: '1px solid rgba(185,28,28,0.2)' }
    : { background: 'rgba(13,27,42,0.05)',  color: '#334155', border: '1px solid rgba(13,27,42,0.12)' };

function Cell({ column, row }) {
  // Dynamic per-run column (contract fields): key is "field:<name>".
  if (column.key.startsWith('field:')) {
    const name = column.key.slice(6);
    const v = (row.values || []).find(x => x.field === name);
    if (!v || !v.found) {
      return <span className="text-xs" style={{ color: 'rgba(13,27,42,0.28)' }}>not found</span>;
    }
    return (
      <div className="min-w-0">
        <span className="text-xs text-gray-800">{v.value}</span>
        {v.confidence === 'low' && (
          <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded"
            style={{ background: 'rgba(217,119,6,0.1)', color: '#92400e' }}>check</span>
        )}
      </div>
    );
  }

  const value = row[column.key];

  if (column.type === 'confidence') {
    if (typeof value !== 'number') return <span className="text-xs text-gray-400">—</span>;
    return (
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded" style={CONFIDENCE_STYLE(value)}>
        {Math.round(value * 100)}%
      </span>
    );
  }

  if (column.type === 'status') {
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap" style={STATUS_STYLE(row)}>
        {value ?? '—'}
      </span>
    );
  }

  if (column.type === 'flag') {
    const atZero = row.balanceState === 'AT_ZERO';
    if (!value) return <span className="text-xs text-gray-400">—</span>;
    return (
      <span className="text-[11px] font-medium px-2 py-0.5 rounded whitespace-nowrap"
        style={atZero
          ? { background: 'rgba(217,119,6,0.1)', color: '#92400e', border: '1px solid rgba(217,119,6,0.25)' }
          : { background: 'rgba(5,150,105,0.1)', color: '#047857', border: '1px solid rgba(5,150,105,0.25)' }}>
        {value}
      </span>
    );
  }

  if (column.type === 'date') {
    // Ledger dates are calendar dates, not MySQL datetimes — render the raw
    // string. Putting them through parseDbDate would apply a timezone offset
    // and can shift the single most legally consequential field by a day.
    return value
      ? <span className="text-xs font-medium text-gray-800 whitespace-nowrap">{value}</span>
      : <span className="text-xs text-gray-400">—</span>;
  }

  if (column.type === 'money') {
    return <span className="text-xs font-medium text-gray-800 whitespace-nowrap">{value ?? '—'}</span>;
  }

  return (
    <span className={`text-xs ${column.primary ? 'font-semibold text-gray-900' : 'text-gray-700'} truncate block max-w-[220px]`}
      title={typeof value === 'string' ? value : undefined}>
      {value ?? '—'}
    </span>
  );
}

/* ── Expanded row detail ─────────────────────── */

function LedgerDetail({ row }) {
  return (
    <div className="flex flex-col gap-4">
      {row.citations?.firstDelinquency && (
        <div className="px-3 py-2.5 rounded-lg"
          style={{ background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.18)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#047857' }}>
            First delinquency — cited line
          </p>
          <p className="text-xs font-mono" style={{ color: '#065f46' }}>{row.citations.firstDelinquency.human}</p>
        </div>
      )}
      {row.citations?.anchor && (
        <div className="px-3 py-2.5 rounded-lg"
          style={{ background: 'rgba(13,27,42,0.04)', border: '1px solid rgba(13,27,42,0.1)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: 'rgba(13,27,42,0.45)' }}>
            Last zero balance — cited line
          </p>
          <p className="text-xs font-mono text-gray-700">{row.citations.anchor.human}</p>
        </div>
      )}

      {row.crossCheck && (
        <div className="px-3 py-2.5 rounded-lg"
          style={row.crossCheck.agrees === false
            ? { background: 'rgba(185,28,28,0.06)', border: '1px solid rgba(185,28,28,0.2)' }
            : { background: 'rgba(13,27,42,0.04)', border: '1px solid rgba(13,27,42,0.1)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-1"
            style={{ color: row.crossCheck.agrees === false ? '#b91c1c' : 'rgba(13,27,42,0.45)' }}>
            AI second reader — {row.crossCheck.agrees === true ? 'agrees' : row.crossCheck.agrees === false ? 'DISAGREES' : 'unavailable'}
          </p>
          <p className="text-xs text-gray-700 leading-relaxed">
            {row.crossCheck.reasoning || row.crossCheck.error || 'No reading returned.'}
          </p>
        </div>
      )}

      {/* charges / dates / payments */}
      {row.transactions?.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'rgba(13,27,42,0.35)' }}>
            Ledger — {row.transactions.length} transactions
          </p>
          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(13,27,42,0.1)' }}>
            <table className="w-full text-xs" style={{ background: 'rgba(255,255,255,0.6)' }}>
              <thead>
                <tr style={{ background: 'rgba(13,27,42,0.04)' }}>
                  {['Line', 'Date', 'Description', 'Charge', 'Payment', 'Balance'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-semibold whitespace-nowrap"
                      style={{ color: 'rgba(13,27,42,0.5)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {row.transactions.map(t => (
                  <tr key={t.lineNumber}
                    style={{
                      borderTop: '1px solid rgba(13,27,42,0.07)',
                      background: t.isFirstDelinquency ? 'rgba(5,150,105,0.09)'
                                : t.isAnchor           ? 'rgba(212,175,55,0.13)'
                                : 'transparent',
                    }}>
                    <td className="px-3 py-1.5 text-gray-400 whitespace-nowrap">
                      {t.lineNumber}
                      {t.isAnchor && <span className="ml-1 text-[9px] font-bold" style={{ color: '#b8902a' }}>ZERO</span>}
                      {t.isFirstDelinquency && <span className="ml-1 text-[9px] font-bold" style={{ color: '#047857' }}>FDOD</span>}
                    </td>
                    <td className="px-3 py-1.5 text-gray-700 whitespace-nowrap">{t.date || '—'}</td>
                    <td className="px-3 py-1.5 text-gray-700">{t.description}</td>
                    <td className="px-3 py-1.5 text-gray-800 text-right whitespace-nowrap">{t.charge}</td>
                    <td className="px-3 py-1.5 text-gray-800 text-right whitespace-nowrap">{t.payment}</td>
                    <td className="px-3 py-1.5 font-medium text-right whitespace-nowrap"
                      style={{ color: t.isZeroBalance ? '#047857' : '#1a1a2e' }}>
                      {t.balance}{t.balanceReconstructed ? '*' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {row.transactions.some(t => t.balanceReconstructed) && (
            <p className="text-[10px] text-gray-400 mt-1.5">* balance derived by addition — this ledger had no balance column</p>
          )}
        </div>
      )}
    </div>
  );
}

function FieldsDetail({ row }) {
  return (
    <div className="flex flex-col gap-2">
      {row.documentTitle && (
        <p className="text-xs text-gray-500">
          <span className="font-semibold text-gray-700">{row.documentTitle}</span>
          {row.parties?.length > 0 && <> — {row.parties.join(' / ')}</>}
        </p>
      )}
      {(row.values || []).map(v => (
        <div key={v.field} className="px-3 py-2.5 rounded-lg"
          style={{
            background: v.found ? 'rgba(255,255,255,0.7)' : 'rgba(13,27,42,0.03)',
            border: `1px solid ${v.found ? 'rgba(13,27,42,0.1)' : 'rgba(13,27,42,0.06)'}`,
          }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(13,27,42,0.45)' }}>
              {v.field}
            </span>
            {v.found && v.confidence !== 'high' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded"
                style={{ background: 'rgba(217,119,6,0.1)', color: '#92400e' }}>{v.confidence} confidence</span>
            )}
          </div>
          {v.found ? (
            <>
              <p className="text-sm text-gray-800">{v.value}</p>
              {v.quote && (
                <p className="text-[11px] mt-1.5 pl-2.5 italic text-gray-500"
                  style={{ borderLeft: '2px solid rgba(212,175,55,0.4)' }}>“{v.quote}”</p>
              )}
            </>
          ) : (
            <p className="text-xs text-gray-400">
              Not stated in this document{v.unsupported ? ' — the model offered a value it could not quote, so it was discarded' : ''}.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   LAB RUNNER
══════════════════════════════════════════════════════ */
function LabRunner({ lab, onBack }) {
  const [files, setFiles] = useState([]);
  const [inputs, setInputs] = useState(() => {
    const init = {};
    for (const i of lab.inputs || []) init[i.key] = i.default ?? (i.type === 'boolean' ? false : '');
    return init;
  });
  const [dragOver, setDragOver] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const fileRef = useRef();

  const accept = (lab.accepts || []).join(',');

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setFiles(prev => {
      const seen = new Set(prev.map(f => `${f.name}_${f.size}`));
      const fresh = incoming.filter(f => !seen.has(`${f.name}_${f.size}`));
      return [...prev, ...fresh].slice(0, lab.maxFiles);
    });
    setResult(null);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setResult(null);
  };

  const missingRequired = (lab.inputs || []).some(i => i.required && !String(inputs[i.key] ?? '').trim());
  const canRun = files.length > 0 && !missingRequired && !running;

  async function handleRun(e) {
    e.preventDefault();
    if (!canRun) return;

    setRunning(true);
    setError(null);
    setResult(null);
    setExpanded(null);

    try {
      const fd = new FormData();
      fd.append('lab', lab.id);
      fd.append('inputs', JSON.stringify(inputs));
      for (const f of files) fd.append('files', f);
      setResult(await apiUpload('labs.run', fd));
    } catch (err) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  }

  const columns = [...(lab.outputColumns || []), ...(result?.dynamicColumns || [])];
  const isLedger = lab.id === 'ledger-zero-balance';

  return (
    <div className="h-full flex flex-col animated-bg overflow-hidden" style={{ color: '#1a1a2e' }}>
      {/* Header */}
      <header
        className="glass flex-shrink-0 px-8 py-4 flex items-center gap-3"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <button
          type="button"
          onClick={onBack}
          title="Back to labs"
          className="p-1.5 rounded-lg transition-colors flex-shrink-0"
          style={{ color: 'rgba(13,27,42,0.45)' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(13,27,42,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-gray-800 font-medium text-sm truncate">{lab.name}</p>
          <p className="text-gray-400 text-xs mt-0.5 truncate">{lab.tagline}</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-6">

          {/* What the AI does here — never leave this a mystery */}
          {lab.aiRole && (
            <div className="px-4 py-3 rounded-lg flex items-start gap-2.5"
              style={{ background: 'rgba(13,27,42,0.04)', border: '1px solid rgba(13,27,42,0.09)' }}>
              <Ico name="chat" size={14} stroke="rgba(13,27,42,0.4)" className="mt-0.5 flex-shrink-0" />
              <p className="text-xs text-gray-600 leading-relaxed">
                <span className="font-semibold text-gray-700">What the AI does here: </span>
                {lab.aiRole}
              </p>
            </div>
          )}

          <form onSubmit={handleRun} className="flex flex-col gap-5">
            {/* Upload */}
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                Documents
              </label>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files); }}
                className="flex flex-col items-center justify-center gap-2 py-8 px-4 rounded-lg cursor-pointer transition-all"
                style={{
                  border:     `1px dashed ${dragOver ? 'rgba(212,175,55,0.6)' : 'rgba(13,27,42,0.15)'}`,
                  background: dragOver ? 'rgba(212,175,55,0.07)' : 'rgba(255,255,255,0.5)',
                  color:      '#9ca3af',
                }}>
                <Ico name="upload" size={22} stroke="currentColor" strokeWidth={1.5} />
                <span className="text-xs text-center leading-relaxed">
                  Drop documents here or click to browse<br />
                  <span style={{ color: '#c2c2c2' }}>
                    {(lab.accepts || []).map(a => a.replace('.', '').toUpperCase()).join(', ')} · up to {lab.maxFiles} files
                  </span>
                </span>
              </div>
              <input
                ref={fileRef} type="file" accept={accept} multiple className="hidden"
                onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
              />

              {files.length > 0 && (
                <ul className="flex flex-col gap-1.5 mt-3">
                  {files.map((f, idx) => (
                    <li key={`${f.name}_${f.size}_${idx}`}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                      style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(13,27,42,0.1)' }}>
                      <Ico name="file" size={14} stroke="#d4af37" className="flex-shrink-0" />
                      <span className="min-w-0 flex-1 text-xs font-medium text-gray-800 truncate">{f.name}</span>
                      <span className="text-[11px] text-gray-400 flex-shrink-0">{formatBytes(f.size)}</span>
                      <button type="button" onClick={() => removeFile(idx)}
                        className="flex-shrink-0 p-0.5 rounded transition-colors"
                        style={{ color: 'rgba(13,27,42,0.35)' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#b91c1c'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(13,27,42,0.35)'}>
                        <Ico name="close" size={12} stroke="currentColor" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Declared inputs */}
            {(lab.inputs || []).map(input => (
              <div key={input.key}>
                {input.type === 'boolean' ? (
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(inputs[input.key])}
                      onChange={e => setInputs(p => ({ ...p, [input.key]: e.target.checked }))}
                      className="mt-0.5"
                      style={{ accentColor: '#d4af37' }}
                    />
                    <span>
                      <span className="text-xs font-semibold text-gray-600">{input.label}</span>
                      {input.help && <span className="block text-[11px] text-gray-400 mt-0.5">{input.help}</span>}
                    </span>
                  </label>
                ) : (
                  <>
                    <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
                      {input.label}{input.required && ' *'}
                    </label>
                    {input.type === 'select' ? (
                      <select
                        value={inputs[input.key] ?? ''}
                        onChange={e => setInputs(p => ({ ...p, [input.key]: e.target.value }))}
                        className="w-full chat-input rounded-lg px-4 py-2.5 text-sm">
                        {(input.options || []).map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        value={inputs[input.key] ?? ''}
                        onChange={e => setInputs(p => ({ ...p, [input.key]: e.target.value }))}
                        placeholder={input.placeholder || ''}
                        className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
                      />
                    )}
                    {input.help && <p className="text-[11px] text-gray-400 mt-1.5">{input.help}</p>}
                  </>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={!canRun}
              className="btn-primary py-2.5 px-6 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 self-start">
              {running
                ? <><Spinner size={14} /> Running…</>
                : <><Ico name="chart" size={14} stroke="white" /> Run {lab.name}</>}
            </button>
          </form>

          {running && (
            <p className="text-xs text-gray-400">
              Reading {files.length} document{files.length !== 1 ? 's' : ''}. This can take a minute or two.
            </p>
          )}

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm text-red-600 flex items-start gap-3"
              style={{ background: 'rgba(185,28,28,0.08)', border: '1px solid rgba(185,28,28,0.2)' }}>
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)}><Ico name="close" size={13} stroke="currentColor" /></button>
            </div>
          )}

          {/* Results */}
          {result && (
            <section className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: 'rgba(13,27,42,0.35)' }}>
                  {result.summary?.headline}
                </p>
                <span className="text-[11px] text-gray-400">
                  {((result.summary?.elapsedMs ?? 0) / 1000).toFixed(1)}s
                </span>
              </div>

              {result.summary?.reviewRequired && (
                <div className="px-4 py-3 rounded-lg flex items-start gap-2.5"
                  style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.22)', color: '#92400e' }}>
                  <Ico name="empty" size={14} stroke="currentColor" className="mt-0.5 flex-shrink-0" />
                  <p className="text-xs leading-relaxed flex-1">{result.summary.reviewNote}</p>
                </div>
              )}

              {result.summary?.skippedFiles?.length > 0 && (
                <p className="text-[11px] text-gray-400">
                  Skipped (unsupported type): {result.summary.skippedFiles.join(', ')}
                </p>
              )}

              <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid rgba(13,27,42,0.1)' }}>
                <table className="w-full" style={{ background: 'rgba(255,255,255,0.75)' }}>
                  <thead>
                    <tr style={{ background: 'rgba(13,27,42,0.04)' }}>
                      <th className="w-8" />
                      {columns.map(c => (
                        <th key={c.key}
                          className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap"
                          style={{ color: 'rgba(13,27,42,0.5)' }}>
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.rows || []).map((row, i) => {
                      const open = expanded === i;
                      return (
                        <Fragment key={row.filename ? `${row.filename}_${i}` : i}>
                          <tr
                            onClick={() => setExpanded(open ? null : i)}
                            className="cursor-pointer transition-colors"
                            style={{ borderTop: '1px solid rgba(13,27,42,0.07)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(212,175,55,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <td className="px-2 py-2.5 text-gray-300">
                              <span style={{ display: 'inline-block', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>
                                <Ico name="chevright" size={12} stroke="currentColor" />
                              </span>
                            </td>
                            {columns.map(c => (
                              <td key={c.key} className="px-3 py-2.5 align-top">
                                <Cell column={c} row={row} />
                              </td>
                            ))}
                          </tr>
                          {open && (
                            <tr style={{ background: 'rgba(13,27,42,0.02)' }}>
                              <td colSpan={columns.length + 1} className="px-5 py-4">
                                {(row.reasons?.length > 0 || row.warnings?.length > 0) && (
                                  <ul className="flex flex-col gap-1 mb-4">
                                    {[...new Set([...(row.reasons || []), ...(row.warnings || [])])].map((r, k) => (
                                      <li key={k} className="text-[11px] text-gray-500 flex gap-1.5">
                                        <span style={{ color: 'rgba(212,175,55,0.7)' }}>•</span>{r}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {isLedger ? <LedgerDetail row={row} /> : <FieldsDetail row={row} />}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-gray-400">Click any row to see the evidence behind it.</p>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}

export default LabRunner;
