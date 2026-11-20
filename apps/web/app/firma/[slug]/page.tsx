import type { Metadata } from "next";
import { CompanyView, companyMetadata } from "@/components/pages/CompanyPage";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ marka?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return companyMetadata((await params).slug, "bs");
}

export default async function Page({ params, searchParams }: Props) {
  return <CompanyView slug={(await params).slug} brand={(await searchParams).marka} locale="bs" />;
}
