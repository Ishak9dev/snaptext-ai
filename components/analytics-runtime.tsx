"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCookiePreferences, GTM_ID, pushConsent, pushDefaultConsent } from "@/lib/analytics";

export function AnalyticsRuntime() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  const loaded = useRef(false);
  const lastPath = useRef<string | null>(null);
  const defaultsApplied = useRef(false);

  const syncConsent = useCallback(() => {
    const preferences = getCookiePreferences();
    const analytics = preferences?.analytics === true;
    if (!defaultsApplied.current) {
      pushDefaultConsent();
      defaultsApplied.current = true;
    }
    pushConsent(analytics, preferences?.advertising === true);
    setEnabled(analytics);
    if (!analytics) {
      // Keep the loaded container and last path. Consent updates disable tags;
      // if consent is granted again on the same page, don't emit a duplicate.
    }
  }, []);

  useEffect(() => {
    queueMicrotask(syncConsent);
    window.addEventListener("snaptext:consent-changed", syncConsent);
    window.addEventListener("storage", syncConsent);
    return () => {
      window.removeEventListener("snaptext:consent-changed", syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, [syncConsent]);

  const sendPageView = useCallback(() => {
    if (!enabled || !loaded.current || !pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: "page_view",
      // Never pass query strings or fragments to GTM/GA4: auth callbacks or
      // future routes may carry tokens or user-entered values there.
      page_location: `${window.location.origin}${pathname}`,
      page_title: document.title,
      page_path: pathname,
    });
  }, [enabled, pathname]);

  useEffect(() => { sendPageView(); }, [sendPageView]);

  useEffect(() => {
    if (!enabled || loaded.current) return;

    // The container is injected only after analytics consent. Queue the GTM
    // bootstrap event and Consent Mode commands before loading the container.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const script = document.createElement("script");
    script.id = "snaptext-google-tag-manager";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    script.onload = () => {
      loaded.current = true;
      sendPageView();
    };
    script.onerror = () => {
      script.remove();
    };
    document.head.appendChild(script);
  }, [enabled, sendPageView]);

  return null;
}
