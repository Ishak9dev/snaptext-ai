"use client";
import { openCookieSettings } from "@/components/cookie-consent";

export function CookieSettingsButton({ lang }: { lang: "en" | "fr" }) {
  return <button type="button" onClick={openCookieSettings} className="text-violet-700 hover:underline">{lang === "fr" ? "Paramètres des cookies" : "Cookie Settings"}</button>;
}
