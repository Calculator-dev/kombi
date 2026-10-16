import Link from "next/link";
import { Header } from "@/components/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="sadrzaj" className="wrap login">
        <h1 className="display h-lg">Ova stranica ne postoji.</h1>
        <p>Možda je link star. Slobodne termine i cijene naći ćete na početnoj.</p>
        <Link className="btn-dark" href="/">
          Na početnu
        </Link>
      </main>
    </>
  );
}
