"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { trackEcommerce, type TrackedVan } from "@/lib/analytics";
import { isIsoDate, type Settings } from "@kombi/shared";
import { BookingWidget } from "./BookingWidget";

/** A van's calendar, starting with the dates picked on the homepage (if any). */
export function VanTicket({ van }: { van: TrackedVan & { pricing: Settings } }) {
  useEffect(() => {
    trackEcommerce("view_item", [van], { value: van.pricing.priceOnRequest ? 0 : van.dailyRate });
    // Counted for the owner's analytics; nothing about the visitor is sent.
    void api(`/vans/${van.slug}/hit`, { method: "POST", json: { type: "view" } }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [van.id]);
  const params = useSearchParams();
  const start = params.get("start");
  const end = params.get("end");
  const valid = start && end && isIsoDate(start) && isIsoDate(end) && end > start;
  return <BookingWidget van={van} initialStart={valid ? start : undefined} initialEnd={valid ? end : undefined} />;
}
