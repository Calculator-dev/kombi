import type { Metadata } from "next";
import { ContractView } from "@/components/admin/ContractView";

export const metadata: Metadata = { title: "Ugovor o najmu", robots: { index: false, follow: false } };

type Props = { searchParams: Promise<{ id?: string }> };

export default async function ContractPage({ searchParams }: Props) {
  const { id } = await searchParams;
  return <ContractView bookingId={id ?? ""} />;
}
