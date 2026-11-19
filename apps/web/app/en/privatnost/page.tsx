import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What personal data kombi.ba collects when you send a request or book, why, who receives it and what your rights are.",
  alternates: { canonical: "/en/privatnost", languages: { bs: "/privatnost", en: "/en/privatnost" } },
};

const DATA: [string, string, string][] = [
  // what, why, when
  ["Full name, email, phone, how to contact you (Viber, WhatsApp, call, email)", "To answer your request and arrange pickup.", "Every request"],
  ["Date of birth and the year you got your driving licence", "To check the owner's requirements (driver's minimum age and experience).", "Every request"],
  ["Dates, pickup place, extras and your note", "The booking and the price.", "Every request"],
  ["Address, JMB, ID card number, driving licence number", "Filling in the rental contract.", "Only if you enter them; you can also give them at pickup"],
  ["Name, email, phone, address and company ID of the van's owner", "The owner's account, listing the van and the rental contract (the owner is the lessor).", "Owner sign-up"],
];

const PROCESSORS: [string, string, string][] = [
  // who, what for, where
  ["Render", "Servers that run the website and the app", "Germany (Frankfurt)"],
  ["Supabase", "Database and owner sign-in", "The region chosen when the project was set up"],
  ["Backblaze", "Van photos (no personal data)", "EU"],
  ["Resend", "Emails about requests and bookings", "USA"],
  ["Google (Tag Manager, Analytics)", "Visit statistics, only with your cookie consent, without names or contacts", "USA and EU"],
];

export default function PrivacyPage() {
  return (
    <div lang="en">
      <Header locale="en" />
      <main id="sadrzaj" className="wrap legal">
        <h1 className="display h-lg">Privacy policy</h1>
        <p className="lead">
          This page explains what personal data we ask for when you send a request for a van, why we need it, who we give it
          to, and how you can see, correct or delete it. The Bosnian version of this policy is the binding one.
        </p>

        <h2>Who is responsible</h2>
        <p>
          The {SITE.name} platform is run by {SITE.operator}. For questions about your data, write to {SITE.email}.
        </p>
        <p>
          Vans on {SITE.name} are rented out by their owners. When you send a request for a van, its owner receives the
          details from your request, because they confirm the booking, hand over the van and sign the contract with you.
          The owner is also responsible for the data they receive.
        </p>

        <h2>What data we collect and why</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Data</th><th>Why</th><th>When</th></tr>
            </thead>
            <tbody>
              {DATA.map(([what, why, when]) => (
                <tr key={what}><td>{what}</td><td>{why}</td><td>{when}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We process the data because it is needed to prepare and carry out the rental contract at your request, and for
          legal obligations (e.g. accounting). We keep visit statistics only if you allow it in the cookie settings.
        </p>
        <p>
          For the owners' statistics we only count how many times a van's page and its booking form were opened. Nothing
          about the visitor is kept with it.
        </p>

        <h2>Who we give data to</h2>
        <ul>
          <li>The owner of the van you send a request for.</li>
          <li>Companies that run the technology for us. They process data only on our instructions and not for their own purposes:</li>
        </ul>
        <div className="table-scroll">
          <table>
            <thead>
              <tr><th>Company</th><th>What for</th><th>Where the data is</th></tr>
            </thead>
            <tbody>
              {PROCESSORS.map(([who, what, where]) => (
                <tr key={who}><td>{who}</td><td>{what}</td><td>{where}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          We don't sell data or give it out for advertising. Names, emails, phone numbers and document numbers never go to
          Google Analytics or advertising systems. We give data to authorities only when the law requires it.
        </p>

        <h2>The rental contract</h2>
        <p>
          When the owner confirms your booking, you receive an email with a link to the contract filled in with your
          details. The link is yours only and shouldn't be forwarded. The contract page doesn't appear on Google.
        </p>

        <h2>How long we keep data</h2>
        <ul>
          <li>A request that isn't confirmed is deleted when no longer needed, at the latest a year after the requested dates.</li>
          <li>Booking and contract data is kept for {SITE.keepBookings} after the rental ends, for accounting and possible disputes (e.g. damage or fines).</li>
          <li>An owner's account is kept until the owner closes it.</li>
        </ul>

        <h2>Your rights</h2>
        <p>You can ask for:</p>
        <ul>
          <li>a copy of the data we hold about you;</li>
          <li>correction of inaccurate data;</li>
          <li>deletion, except for data we must keep by law;</li>
          <li>us to stop processing it, or to give it to you in a form you can pass on to someone else.</li>
        </ul>
        <p>
          Write to {SITE.email}. We reply within 30 days. If you think we don't handle your data properly, you can complain
          to the Personal Data Protection Agency of Bosnia and Herzegovina.
        </p>

        <h2>Cookies</h2>
        <p>
          Which cookies we use and how to change your choice is on the <Link href="/en/kolacici">Cookies</Link> page.
        </p>

        <h2>Changes</h2>
        <p>If we change this policy, we publish the new version here. Last updated: 18 November 2026.</p>
      </main>
      <Footer locale="en" />
    </div>
  );
}
