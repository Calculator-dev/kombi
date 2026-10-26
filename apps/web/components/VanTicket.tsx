"use client";

import { useSearchParams } from "next/navigation";
import { isIsoDate, type Settings } from "@kombi/shared";
import { BookingWidget } from "./BookingWidget";

/** A van's calendar, starting with the dates picked on the homepage (if any). */
export function VanTicket({ van }: { van: { id: string; slug: string; pricing: Settings } }) {
  const params = useSearchParams();
  const start = params.get("start");
  const end = params.get("end");
  const valid = start && end && isIsoDate(start) && isIsoDate(end) && end > start;
  return <BookingWidget van={van} initialStart={valid ? start : undefined} initialEnd={valid ? end : undefined} />;
}
