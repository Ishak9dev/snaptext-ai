export const GTM_ID = "GTM-TXFHQR2S";

export type AnalyticsEvent =
  | { event: "sign_up"; method: "email" }
  | { event: "login"; method: "email" }
  | { event: "begin_checkout"; plan_id: string; billing_interval: "month" | "year"; currency: "EUR" }
  | { event: "generate_image_description" };

type Preferences = { analytics?: boolean; advertising?: boolean; savedAt?: number };
const CONSENT_KEY = "snaptext-cookie-preferences-v1";
const MAX_AGE = 180 * 24 * 60 * 60 * 1000;

function pushConsentCommand(command: "default" | "update", values: Record<string, string>) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () {
    // eslint-disable-next-line prefer-rest-params -- Google Consent Mode expects this arguments object in the data layer.
    window.dataLayer.push(arguments);
  };
  window.gtag("consent", command, values);
}

export function getCookiePreferences(): Preferences | null {
  try {
    const value = JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null") as Preferences | null;
    if (!value || typeof value.savedAt !== "number" || Date.now() - value.savedAt > MAX_AGE) return null;
    return value;
  } catch {
    return null;
  }
}

export function pushConsent(analytics: boolean, advertising: boolean) {
  const values = {
      analytics_storage: analytics ? "granted" : "denied",
      ad_storage: advertising ? "granted" : "denied",
      ad_user_data: advertising ? "granted" : "denied",
      ad_personalization: advertising ? "granted" : "denied",
  };
  pushConsentCommand("update", values);
}

export function pushDefaultConsent() {
  pushConsentCommand("default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
}

export function trackAnalyticsEvent(payload: AnalyticsEvent) {
  if (getCookiePreferences()?.analytics !== true) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}
