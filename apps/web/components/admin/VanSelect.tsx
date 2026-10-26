"use client";

import type { OwnerVan } from "./types";

export function VanSelect({
  vans,
  value,
  onChange,
  allLabel,
  label = "Kombi",
}: {
  vans: OwnerVan[];
  value: string;
  onChange: (id: string) => void;
  /** Adds an "all vans" choice with value "". */
  allLabel?: string;
  label?: string;
}) {
  return (
    <label className="field" style={{ minWidth: 220 }}>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {allLabel && <option value="">{allLabel}</option>}
        {vans.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
    </label>
  );
}
