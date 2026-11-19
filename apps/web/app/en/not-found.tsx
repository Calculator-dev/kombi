import Link from "next/link";
import { Header } from "@/components/Header";
import { dict } from "@/lib/i18n";

export default function NotFound() {
  const t = dict("en").notFound;
  return (
    <div lang="en">
      <Header locale="en" />
      <main id="sadrzaj" className="wrap login">
        <h1 className="display h-lg">{t.title}</h1>
        <p>{t.text}</p>
        <Link className="btn-dark" href="/en">
          {t.home}
        </Link>
      </main>
    </div>
  );
}
