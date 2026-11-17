import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ContractData } from "@kombi/shared";
import { RenterContract } from "@/components/admin/ContractView";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

// The link is the only key to the customer's personal data: keep it out of
// search engines, caches and the Referer header of outgoing links.
export const metadata: Metadata = {
  title: "Ugovor o najmu",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export default async function RenterContractPage({ params }: Props) {
  const { token } = await params;
  if (!/^[0-9a-f]{64}$/.test(token)) notFound();
  const res = await fetch(`${API_URL}/api/contracts/${token}`, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (res.status === 404) notFound();
  if (!res.ok) throw new Error(`API answered ${res.status} for a contract`);
  return <RenterContract data={(await res.json()) as ContractData} />;
}
