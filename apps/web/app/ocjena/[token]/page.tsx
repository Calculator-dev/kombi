import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { ReviewForm, type ReviewContext } from "@/components/ReviewForm";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

// A personal link from the email after the rental: not for search engines.
export const metadata: Metadata = {
  title: "Ocijenite najam",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function ReviewPage({ params }: Props) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const res = await fetch(`${API_URL}/api/reviews/${token}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`API answered ${res.status} for a review link`);
  return (
    <>
      <Header />
      <main id="sadrzaj" className="section">
        <div className="wrap review-page">
          <ReviewForm token={token} initial={(await res.json()) as ReviewContext} />
        </div>
      </main>
      <Footer />
    </>
  );
}
