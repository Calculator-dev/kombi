/** Small line icons for the specs on vehicle cards; they take the text colour. */
const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const SeatIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="6.5" r="3" />
    <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
  </svg>
);
export const BagIcon = () => (
  <svg {...base}>
    <rect x="5" y="7" width="14" height="13" rx="2" />
    <path d="M9 7V4.5h6V7M9 11v5M15 11v5" />
  </svg>
);
export const CargoIcon = () => (
  <svg {...base}>
    <path d="M3 8l9-4 9 4v9l-9 4-9-4z" />
    <path d="M3 8l9 4 9-4M12 12v9" />
  </svg>
);
export const GearIcon = () => (
  <svg {...base}>
    <circle cx="6" cy="6" r="2" />
    <circle cx="12" cy="6" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="12" cy="18" r="2" />
    <path d="M6 8v8M12 8v8M18 8v4H6" />
  </svg>
);
export const FuelIcon = () => (
  <svg {...base}>
    <path d="M5 20V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v15M3.5 20h12" />
    <path d="M7.5 8h4M14 9h2.5a1.5 1.5 0 0 1 1.5 1.5V16a1.5 1.5 0 0 0 3 0V8l-2.5-2.5" />
  </svg>
);
export const PlaneIcon = () => (
  <svg {...base} width={14} height={14}>
    <path d="M10.5 13.5L3 11l1.5-1.5 7 1L17 5a2 2 0 0 1 3 3l-5.5 5.5 1 7L14 22l-2.5-7.5-3.5 3.5V21l-1.5 1-1-3.5L2 17.5l1-1.5h3l3.5-3.5" />
  </svg>
);
export const PinIcon = () => (
  <svg {...base} width={14} height={14}>
    <path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);
