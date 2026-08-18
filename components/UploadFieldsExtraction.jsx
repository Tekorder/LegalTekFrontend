'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — components/UploadFieldsExtraction.jsx
   "Lab Jose": bulk contract upload + comma-separated field search
═══════════════════════════════════════════════ */

import { useRef, useState } from 'react';
import { Ico } from '@/lib/icons';

const ACCEPTED = '.pdf,.doc,.docx,.txt';

function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function UploadFieldsExtraction() {
  const [files, setFiles] = useState([]);
  const [fieldsInput, setFieldsInput] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const fileRef = useRef();

  const addFiles = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;
    setFiles(prev => {
      const existingKeys = new Set(prev.map(f => `${f.name}_${f.size}`));
      const fresh = incoming.filter(f => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...fresh];
    });
    setSubmitted(null);
  };

  const removeFile = (idx) => {
    setFiles(prev => prev.filter((_, i) => i !== idx));
    setSubmitted(null);
  };

  const fields = fieldsInput.split(',').map(s => s.trim()).filter(Boolean);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!files.length || !fields.length) return;
    setSubmitted({ fileCount: files.length, fields });
  };

  return (
    <div className="h-full flex flex-col animated-bg overflow-hidden" style={{ color: '#1a1a2e' }}>
      <header
        className="glass flex-shrink-0 px-8 py-4"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <p className="text-gray-800 font-medium text-sm">Lab Jose</p>
        <p className="text-gray-400 text-xs mt-0.5">Upload contracts and search across them</p>
      </header>

      <main className="flex-1 overflow-y-auto px-8 py-6">
        <form onSubmit={handleSubmit} className="max-w-xl mx-auto flex flex-col gap-6">

          {/* Multi-file upload */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
              Contracts
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
                Drop contracts here or click to browse<br />
                <span style={{ color: '#c2c2c2' }}>PDF, DOC, DOCX, TXT</span>
              </span>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept={ACCEPTED}
              multiple
              className="hidden"
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
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
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

          {/* Fields to search */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block uppercase tracking-wide">
              Fields to search
            </label>
            <input
              value={fieldsInput}
              onChange={e => setFieldsInput(e.target.value)}
              placeholder="e.g. effective date, governing law, termination clause"
              className="w-full chat-input rounded-lg px-4 py-2.5 text-sm"
            />
            <p className="text-[11px] text-gray-400 mt-1.5">Separate multiple fields with commas.</p>
          </div>

          <button
            type="submit"
            disabled={!files.length || !fields.length}
            className="btn-primary py-2.5 px-6 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 self-start">
            <Ico name="chart" size={14} stroke="white" />
            Run Search
          </button>

          {submitted && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{ background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.2)', color: '#047857' }}>
              Ready to search {submitted.fields.length} field{submitted.fields.length !== 1 ? 's' : ''} across{' '}
              {submitted.fileCount} contract{submitted.fileCount !== 1 ? 's' : ''}: {submitted.fields.join(', ')}
            </div>
          )}
        </form>
      </main>
    </div>
  );
}

export default UploadFieldsExtraction;
