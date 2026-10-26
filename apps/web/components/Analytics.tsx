"use client";

import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

/**
 * Loads Google Tag Manager (when NEXT_PUBLIC_GTM_ID is set) and sends a
 * page_view on every page change, since the site navigates without full
 * reloads. The admin panel is not tracked.
 */
export function Analytics() {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = params.toString();
  const admin = pathname.startsWith("/admin");

  useEffect(() => {
    if (admin) return;
    track("page_view", {
      page_path: pathname + (query ? `?${query}` : ""),
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, query, admin]);

  // Viber/WhatsApp/phone/email links and FAQ answers, wherever they are on the page.
  useEffect(() => {
    if (admin) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.("a[href]");
      const href = a?.getAttribute("href") ?? "";
      const method = href.startsWith("viber:") ? "viber" : href.includes("wa.me") ? "whatsapp" : href.startsWith("tel:") ? "phone" : href.startsWith("mailto:") ? "email" : null;
      if (method) track("contact", { method, page_path: window.location.pathname });
    };
    const onToggle = (e: Event) => {
      const d = e.target as HTMLDetailsElement;
      if (d.tagName === "DETAILS" && d.open && d.closest(".faq")) track("faq_open", { question: d.querySelector("summary")?.textContent ?? "" });
    };
    document.addEventListener("click", onClick);
    document.addEventListener("toggle", onToggle, true);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("toggle", onToggle, true);
    };
  }, [admin]);

  if (!GTM_ID || admin) return null;
  return (
    <Script id="gtm" strategy="afterInteractive">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(GTM_ID)});`}
    </Script>
  );
}
