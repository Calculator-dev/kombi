"use client";

import { useEffect } from "react";
import { Header } from "@/components/Header";
import { SITE } from "@/lib/site";

/** Shown when a page can't be built, usually because the API is waking up or briefly down. */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <Header />
      <main id="sadrzaj" className="wrap login">
        <h1 className="display h-lg">Stranica se trenutno ne učitava.</h1>
        <p>Obično prođe za pola minute. Pokušajte ponovo, a ako i dalje ne radi, javite nam se na {SITE.phone}.</p>
        <button type="button" className="btn-dark" style={{ alignSelf: "flex-start" }} onClick={() => retry()}>
          Pokušaj ponovo
        </button>
      </main>
    </>
  );
}
