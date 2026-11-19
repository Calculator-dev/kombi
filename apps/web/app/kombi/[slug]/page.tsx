import type { Metadata } from "next";
import { VanPage, vanMetadata } from "@/components/pages/VanPage";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return vanMetadata((await params).slug, "bs");
}

export default async function Page({ params }: Props) {
  return <VanPage slug={(await params).slug} locale="bs" />;
}
