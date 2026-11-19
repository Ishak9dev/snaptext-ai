import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SUPPORT_EMAIL = "ishakdev99@gmail.com";
const MAX_BODY_BYTES = 8_000;
const MAX_MESSAGE_LENGTH = 4_000;

type ContactPayload = { name?: unknown; email?: unknown; message?: unknown; website?: unknown };

function safeText(value: unknown, maximum: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, maximum)
    : "";
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  let payload: ContactPayload;
  try {
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Message is too large." }, { status: 413 });
    }
    payload = JSON.parse(raw) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Quietly accept honeypot submissions so bots do not learn the field rule.
  if (safeText(payload.website, 200)) return NextResponse.json({ success: true });

  const name = safeText(payload.name, 120);
  const email = safeText(payload.email, 254);
  const message = typeof payload.message === "string"
    ? payload.message.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, "").trim().slice(0, MAX_MESSAGE_LENGTH)
    : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || !message) {
    return NextResponse.json({ error: "Enter a valid email and message." }, { status: 400 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FROM_EMAIL;
  const salt = process.env.SUPABASE_SECRET_KEY;
  if (!apiKey || !from || !salt) {
    return NextResponse.json({ error: "Contact form is not configured.", code: "CONTACT_NOT_CONFIGURED" }, { status: 503 });
  }

  try {
    const address = request.headers.get("x-real-ip")
      ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? "unknown";
    const identifier = createHmac("sha256", salt).update(address).digest("hex");
    const { data: withinLimit, error: rateLimitError } = await getSupabaseAdmin()
      .rpc("consume_contact_rate_limit", { p_identifier: identifier });
    if (rateLimitError) throw rateLimitError;
    if (withinLimit !== true) {
      return NextResponse.json({ error: "Too many messages. Try again later." }, { status: 429 });
    }

    const result = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [SUPPORT_EMAIL],
        reply_to: email,
        subject: "New SnapTextAI contact message",
        text: `Name: ${name || "Not provided"}\nEmail: ${email}\n\n${message}`,
      }),
      cache: "no-store",
    });
    if (!result.ok) {
      console.error("Contact email provider rejected a message", { status: result.status });
      return NextResponse.json({ error: "Unable to send the message." }, { status: 502 });
    }

    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "contact_delivery_failed";
    console.error("Contact message delivery failed", { code });
    return NextResponse.json({ error: "Unable to send the message." }, { status: 503 });
  }
}
