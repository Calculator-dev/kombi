"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Logo } from "../Header";

type Mode = "login" | "signup" | "forgot";

const MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Pogrešan email ili lozinka.",
  "Email not confirmed": "Email još nije potvrđen. Kliknite link koji smo vam poslali.",
  "User already registered": "Račun s ovim emailom već postoji. Prijavite se.",
};
const translate = (m: string) =>
  MESSAGES[m] ?? (m.includes("Password should be") ? "Lozinka mora imati najmanje 8 znakova." : m);

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <header className="header"><div className="wrap"><Logo /></div></header>
      <main className="wrap login">
        <h1 className="display h-lg">{title}</h1>
        {children}
      </main>
    </>
  );
}

/** Log in, sign up as a van owner, or ask for a password-reset email. */
export function AuthScreens() {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/admin`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const auth = supabase().auth;
      if (mode === "login") {
        const { error } = await auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        const { data, error } = await auth.signUp({ email, password, options: { emailRedirectTo: redirectTo } });
        if (error) throw error;
        // With email confirmation on, Supabase returns no session until the link is clicked.
        if (!data.session) setDone(`Poslali smo link za potvrdu na ${email}. Kliknite ga pa se prijavite.`);
      } else {
        const { error } = await auth.resetPasswordForEmail(email, { redirectTo });
        if (error) throw error;
        setDone(`Ako račun postoji, link za novu lozinku stiže na ${email}.`);
      }
    } catch (err) {
      setError(translate(err instanceof Error ? err.message : "Nešto nije u redu."));
    } finally {
      setBusy(false);
    }
  }

  const switchTo = (m: Mode) => {
    setMode(m);
    setError(null);
    setDone(null);
  };

  const title = mode === "login" ? "Prijava" : mode === "signup" ? "Postanite vlasnik" : "Nova lozinka";
  return (
    <Shell title={title}>
      {mode === "signup" && (
        <p className="lead">Iznajmljujete kombi? Napravite račun, dodajte kombi s fotografijama i cijenama. Nakon što vas odobrimo, kombi je na stranici.</p>
      )}
      {done ? (
        <p className="ok-box" role="status">{done}</p>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <label className="field">
            Email
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {mode !== "forgot" && (
            <label className="field" data-invalid={Boolean(error)}>
              Lozinka
              <input
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={mode === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
          )}
          {error && <p className="alert" role="alert">{error}</p>}
          <button className="btn-dark" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>
            {busy ? "Šaljem…" : mode === "login" ? "Prijavi se" : mode === "signup" ? "Napravi račun" : "Pošalji link"}
          </button>
        </form>
      )}
      <p className="auth-links">
        {mode !== "login" && <button type="button" className="link" onClick={() => switchTo("login")}>Imam račun, prijava</button>}
        {mode !== "signup" && <button type="button" className="link" onClick={() => switchTo("signup")}>Novi vlasnik? Napravite račun</button>}
        {mode === "login" && <button type="button" className="link" onClick={() => switchTo("forgot")}>Zaboravili ste lozinku?</button>}
      </p>
    </Shell>
  );
}

/** Shown after clicking the password-reset link from the email. */
export function NewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.updateUser({ password });
    setBusy(false);
    if (error) setError(translate(error.message));
    else onDone();
  }

  return (
    <Shell title="Nova lozinka">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <label className="field" data-invalid={Boolean(error)}>
          Nova lozinka
          <input type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          {error && <span className="field-error">{error}</span>}
        </label>
        <button className="btn-dark" type="submit" disabled={busy} style={{ alignSelf: "flex-start" }}>
          {busy ? "Spremam…" : "Sačuvaj lozinku"}
        </button>
      </form>
    </Shell>
  );
}
