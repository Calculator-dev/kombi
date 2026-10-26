"use client";

import { useSearchParams } from "next/navigation";
import { isIsoDate } from "@kombi/shared";
import { BookingWidget } from "./BookingWidget";

/** The homepage calendar: dates come from, and go to, the address (?start&end). */
export function SearchTicket() {
  const params = useSearchParams();
  const start = params.get("start");
  const end = params.get("end");
  const valid = start && end && isIsoDate(start) && isIsoDate(end) && end > start;
  return <BookingWidget initialStart={valid ? start : undefined} initialEnd={valid ? end : undefined} />;
}
