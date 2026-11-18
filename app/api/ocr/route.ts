
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reserveToolUsage, completeToolUsage, releaseToolUsage } from "@/lib/usage";

const MODEL = "@cf/moondream/moondream3.1-9B-A2B";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(request: Request) {
  let pendingReservationId: string | null = null;
  try {
    // 1. Check Cloudflare configuration
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      console.error("Missing Cloudflare environment variables.");

      return NextResponse.json(
        { error: "AI service is not configured." },
        { status: 500 }
      );
    }

    // 2. Authenticate user
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const quota = await reserveToolUsage(user.id, "ocr");
    if (!quota.allowed) return NextResponse.json({ error: "You've used your two free lifetime OCR uses. Upgrade to Pro for unlimited access.", code: "TOOL_QUOTA_EXHAUSTED", used: quota.used, limit: 2 }, { status: 403 });
    pendingReservationId = quota.reservationId;

    // 4. Read and validate uploaded image
    const formData = await request.formData();
    const file = formData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload an image." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG and WebP images are supported." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be smaller than 10 MB." },
        { status: 400 }
      );
    }

    // 5. Enforce AI OCR rate limit (30 requests per hour)
    const { data: rateLimitData, error: rateLimitError } =
      await supabase.rpc("consume_ai_ocr_request");

    if (rateLimitError) {
      console.error("AI OCR rate-limit error:", rateLimitError);

      return NextResponse.json(
        { error: "Unable to verify AI usage limit. Please try again." },
        { status: 500 }
      );
    }

    const rateLimit = rateLimitData?.[0];

    if (!rateLimit) {
      return NextResponse.json(
        { error: "Unable to verify AI usage limit." },
        { status: 500 }
      );
    }

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "AI OCR limit reached. Please try again later.",
          code: "AI_RATE_LIMIT_REACHED",
          retryAfter: rateLimit.retry_after_seconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retry_after_seconds),
          },
        }
      );
    }


    // 5. Convert image to base64 data URI
    const imageBuffer = Buffer.from(await file.arrayBuffer());

    const base64Image = imageBuffer.toString("base64");

    const imageDataUri =
      `data:${file.type};base64,${base64Image}`;

    // 6. Call Cloudflare Workers AI
    const cloudflareResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: "query",
          image: imageDataUri,
          question:
            "Transcribe all visible text in this image exactly as written. " +
            "Preserve the original language, spelling, punctuation, " +
            "paragraphs and line breaks. Do not summarize, translate, " +
            "or describe the image. Return only the extracted text.",
          reasoning: false,
          temperature: 0,
          max_tokens: 4096,
          stream: false,
        }),
        signal: AbortSignal.timeout(90000),
      }
    );

    const aiResponse = await cloudflareResponse.json();

    if (!cloudflareResponse.ok || !aiResponse.success) {
      console.error("Cloudflare AI error:", aiResponse);

      return NextResponse.json(
        { error: "AI text extraction failed. Please try again." },
        { status: 502 }
      );
    }

    // 7. Extract model response
  const extractedText = aiResponse.result?.result?.answer?.trim();

    if (!extractedText) {
      return NextResponse.json(
        { error: "No text was detected in this image." },
        { status: 422 }
      );
    }

    // 8. Return extracted text
    if (quota.reservationId) await completeToolUsage(quota.reservationId);
    pendingReservationId = null;
    return NextResponse.json({
      success: true,
      text: extractedText,
      model: MODEL,
      mode: "ai",
    });

  } catch (error) {
    console.error("AI OCR route error:", error);

    if (
      error instanceof Error &&
      error.name === "TimeoutError"
    ) {
      return NextResponse.json(
        { error: "AI processing timed out. Please try again." },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected error occurred during AI extraction." },
      { status: 500 }
    );
  } finally {
    if (pendingReservationId) {
      try {
        await releaseToolUsage(pendingReservationId);
      } catch (releaseError) {
        // The database reservation has a 15-minute expiry as a final safety net.
        console.error("Could not release failed tool usage reservation", releaseError);
      }
    }
  }
}
