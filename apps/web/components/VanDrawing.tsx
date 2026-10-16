import { VAN } from "@/lib/site";

/** Technical side profile of the van, drawn with dimension lines. */
export function VanDrawing() {
  return (
    <svg
      className="drawing"
      viewBox="0 0 1200 430"
      role="img"
      aria-label={`Tehnički crtež kombija ${VAN.name}: dužina ${VAN.length}, visina ${VAN.height}, ${VAN.seats} sjedišta`}
    >
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
      <g stroke="#111" strokeWidth="1" fill="none">
        <path d="M80 400 H1040 M80 392 V408 M1040 392 V408" />
        <path d="M1110 76 V380 M1102 76 H1118 M1102 380 H1118" />
        <path d="M205 150 L205 40 H160 M555 150 L555 40 H510 M120 280 L120 40 H80 M960 250 L960 40 H790" />
      </g>
      <g fontFamily="IBM Plex Mono, monospace" fontSize="15" fill="#111">
        <text x="560" y="424" textAnchor="middle">{VAN.length}</text>
        <text x="1126" y="234">{VAN.height}</text>
        <text x="80" y="32">PRTLJAG</text>
        <text x="160" y="32">{VAN.seats} SJEDIŠTA</text>
        <text x="510" y="32">KLIMA, 3 REDA</text>
        <text x="790" y="32">
          {VAN.engine}, {VAN.gearbox.toUpperCase()}
        </text>
      </g>
    </svg>
  );
}
