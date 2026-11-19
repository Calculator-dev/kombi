import { SearchPage, searchMetadata, type SearchParams } from "@/components/pages/SearchPage";

export const metadata = searchMetadata("bs");

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return <SearchPage searchParams={searchParams} locale="bs" />;
}
