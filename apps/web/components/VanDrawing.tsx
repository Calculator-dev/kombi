/** Technical side profile of a van: a stand-in where a van has no photo yet. */
export function VanDrawing({ compact = false, label = "Crtež kombija" }: { compact?: boolean; label?: string }) {
  return (
    <svg className={compact ? "drawing compact" : "drawing"} viewBox="0 40 1200 400" role="img" aria-label={label}>
      <g fill="none" stroke="#111" strokeWidth="2" strokeLinejoin="round">
        <path d="M80 300 V150 Q80 92 140 86 L700 76 Q770 74 820 118 L960 218 Q1030 232 1040 280 V310 Q1040 322 1028 322 H92 Q80 322 80 310 Z" />
        <rect x="130" y="108" width="150" height="86" />
        <rect x="300" y="106" width="150" height="88" />
        <rect x="470" y="104" width="170" height="90" />
        <path d="M690 100 Q740 98 776 128 L880 214 H690 Z" />
        <path d="M460 82 V322 M680 78 V322" />
        <circle cx="250" cy="322" r="58" fill="#e9e9e4" />
        <circle cx="250" cy="322" r="24" />
        <circle cx="880" cy="322" r="58" fill="#e9e9e4" />
        <circle cx="880" cy="322" r="24" />
        <rect x="1010" y="246" width="24" height="16" />
      </g>
      <rect x="82" y="236" width="954" height="14" fill="#ff4d1a" />
      <line x1="0" y1="380" x2="1200" y2="380" stroke="#111" strokeWidth="1" strokeDasharray="6 6" />
    </svg>
  );
}
