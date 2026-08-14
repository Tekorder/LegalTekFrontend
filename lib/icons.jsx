'use client';

/* ═══════════════════════════════════════════════
   LegalTek AI — lib/icons.jsx
   SVG icons, mini-markdown renderer, spinner.
   Was utils.jsx (bottom half).
═══════════════════════════════════════════════ */

export const SVG_PATHS = {
  shield:   "M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z",
  chat:     "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  plus:     "M12 5v14M5 12h14",
  send:     "M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  file:     "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6",
  fileplus: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 18v-6M9 15h6",
  upload:   "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  close:    "M18 6L6 18M6 6l12 12",
  settings: "M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  spinner:  "M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83",
  empty:    "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2",
  trash:    "M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6",
  users:       "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  userplus:    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6",
  folder:      "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
  folderopen:  "M5 19a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2 2h4a2 2 0 0 1 2 2v1M5 19h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2H9a2 2 0 0 0-1.72.97L5 19z",
  pencil:      "M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z",
  chevright:   "M9 18l6-6-6-6",
  home:        "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  maximize:    "M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3",
  minimize:    "M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3",
  link:        "M10 13a5 5 0 0 1 0-7l1.5-1.5a5 5 0 0 1 7 7L16 13M14 11a5 5 0 0 1 0 7l-1.5 1.5a5 5 0 0 1-7-7l2-2",
  chart:       "M4 19h16M4 15l4-8 4 5 4-9 4 6",
  dollar:      "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  calendar:    "M8 2v4M16 2v4M3.5 9h17M4 4h16a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z",
};

export function Ico({ name, size = 18, stroke = 'currentColor', strokeWidth = 2, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={stroke} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={SVG_PATHS[name] ?? ''} />
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   MINI-MARKDOWN RENDERER  (**bold**, bullet •, newlines)
══════════════════════════════════════════════════════ */
export function RenderContent({ text }) {
  return (
    <>
      {String(text ?? '').split('\n').map((line, idx) => {
        if (!line.trim()) return <br key={idx} />;
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((p, i) =>
          p.startsWith('**') && p.endsWith('**')
            ? <strong key={i} className="text-purple-300 font-semibold">{p.slice(2, -2)}</strong>
            : p
        );
        return <p key={idx} className="mb-0.5 leading-relaxed">{rendered}</p>;
      })}
    </>
  );
}

/* ══════════════════════════════════════════════════════
   SPINNER
══════════════════════════════════════════════════════ */
export function Spinner({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      className="animate-spin">
      <path d={SVG_PATHS.spinner} />
    </svg>
  );
}
