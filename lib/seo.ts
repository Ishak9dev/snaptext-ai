const configuredAppUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
const defaultAppUrl = process.env.NODE_ENV === "production"
  ? "https://www.snaptextai.app"
  : "http://localhost:3000";

const canonicalProductionUrl = process.env.VERCEL_ENV === "production"
  ? "https://www.snaptextai.app"
  : configuredAppUrl || defaultAppUrl;
export const APP_URL = canonicalProductionUrl.replace(/\/+$/, "");
// Keep the previous export available while consumers migrate to APP_URL.
export const SITE_URL = APP_URL;
export const SITE_NAME = "SnapText AI";
export const SITE_DESCRIPTION = "Simplify your workflow with SnapText AI. Extract text from images, scan receipts, analyze documents, extract forms, remove backgrounds and clean image metadata with powerful online AI tools.";
export function absoluteUrl(path: string): string {
  return new URL(path, `${APP_URL}/`).toString();
}
