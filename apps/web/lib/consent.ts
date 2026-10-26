/**
 * Cookie consent, stored in a first-party cookie so it also reaches the server.
 * Value: "v1.a1.m0" = version 1, analytics yes, marketing no.
 */
export const CONSENT_COOKIE = "kombi_consent";
export const CONSENT_DAYS = 180;

export interface Consent {
  analytics: boolean;
  marketing: boolean;
}

export function parseConsent(value: string | undefined | null): Consent | null {
  const m = value?.match(/^v1\.a([01])\.m([01])$/);
  return m ? { analytics: m[1] === "1", marketing: m[2] === "1" } : null;
}

export function readConsent(): Consent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie.split("; ").find((c) => c.startsWith(`${CONSENT_COOKIE}=`));
  return parseConsent(raw?.slice(CONSENT_COOKIE.length + 1));
}

/** Google Consent Mode v2 values for a choice. */
export function consentModeFor(c: Consent) {
  const v = (b: boolean) => (b ? "granted" : "denied");
  return {
    analytics_storage: v(c.analytics),
    ad_storage: v(c.marketing),
    ad_user_data: v(c.marketing),
    ad_personalization: v(c.marketing),
  };
}

/** Saves the choice and tells Google tags right away. */
export function saveConsent(c: Consent) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=v1.a${c.analytics ? 1 : 0}.m${c.marketing ? 1 : 0}; Max-Age=${CONSENT_DAYS * 86400}; Path=/; SameSite=Lax${secure}`;
  const w = window as unknown as { gtag?: (...a: unknown[]) => void; dataLayer?: unknown[] };
  w.gtag?.("consent", "update", consentModeFor(c));
  w.dataLayer?.push({ event: "consent_update", consent_analytics: c.analytics, consent_marketing: c.marketing });
}

/**
 * Runs in <head> before anything else: Consent Mode defaults to "denied", then
 * applies a choice made on an earlier visit. GTM tags only set analytics or
 * advertising cookies once the matching consent is granted.
 */
export const CONSENT_DEFAULT_SCRIPT = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', {
  ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
  analytics_storage: 'denied', functionality_storage: 'granted', security_storage: 'granted',
  wait_for_update: 500
});
gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', true);
var m = document.cookie.match(/(?:^|; )${CONSENT_COOKIE}=v1\\.a([01])\\.m([01])/);
if (m) {
  var a = m[1] === '1' ? 'granted' : 'denied', k = m[2] === '1' ? 'granted' : 'denied';
  gtag('consent', 'update', { analytics_storage: a, ad_storage: k, ad_user_data: k, ad_personalization: k });
}
`;
