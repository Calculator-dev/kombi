import type { Metadata } from "next";
import { BookingPage, type BookingParams } from "@/components/pages/BookingPage";

export const metadata: Metadata = { title: "Rezervacija", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams: BookingParams }) {
  return <BookingPage searchParams={searchParams} locale="bs" />;
}
