import type { Metadata } from "next";
import { VanPage, vanMetadata } from "@/components/pages/VanPage";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return vanMetadata((await params).slug, "en");
}

export default async function Page({ params }: Props) {
  return (
    <div lang="en">
      <VanPage slug={(await params).slug} locale="en" />
    </div>
  );
}
