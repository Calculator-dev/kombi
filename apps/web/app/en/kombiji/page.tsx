import { SearchPage, searchMetadata, type SearchParams } from "@/components/pages/SearchPage";

export const metadata = searchMetadata("en");

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div lang="en">
      <SearchPage searchParams={searchParams} locale="en" />
    </div>
  );
}
