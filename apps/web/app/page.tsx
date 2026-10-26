import { FinderPage } from "@/components/FinderPage";
import { getVans } from "@/lib/vans";

export const revalidate = 60;

export default async function HomePage() {
  return (
    <FinderPage
      vans={await getVans()}
      title={
        <>
          Cijela ekipa
          <br />u jedan kombi<span className="dot">.</span>
        </>
      }
      intro="Kombiji za 8 i 9 osoba, bez vozača. Na more, na Jahorinu, na svadbu ili po goste na aerodrom. Odaberite datume i odmah vidite koji su kombiji slobodni i koliko koštaju."
    />
  );
}
