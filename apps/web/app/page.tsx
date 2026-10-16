import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { Hero, PageBody } from "@/components/Sections";
import { getSettings } from "@/lib/settings";
import { VAN } from "@/lib/site";

export const revalidate = 60;

export default async function HomePage() {
  const settings = await getSettings();
  return (
    <>
      <Header />
      <main id="sadrzaj">
        <Hero
          settings={settings}
          title={
            <>
              Cijela ekipa
              <br />u jedan kombi<span className="dot">.</span>
            </>
          }
          intro={`${VAN.name} ${VAN.year}, ${VAN.seats} sjedišta, bez vozača. Na more, na Jahorinu, na svadbu ili po goste na aerodrom. Odaberite datume, cijenu vidite odmah.`}
        />
        <PageBody settings={settings} />
      </main>
      <Footer />
      <JsonLd settings={settings} />
    </>
  );
}
