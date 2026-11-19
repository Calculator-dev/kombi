import type { Metadata } from "next";
import { BookingPage, type BookingParams } from "@/components/pages/BookingPage";

export const metadata: Metadata = { title: "Booking", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function Page({ searchParams }: { searchParams: BookingParams }) {
  return (
    <div lang="en">
      <BookingPage searchParams={searchParams} locale="en" />
    </div>
  );
}
