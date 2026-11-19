import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reserveToolUsage, completeToolUsage, releaseToolUsage } from "@/lib/usage";

export const maxDuration = 60;

const BUCKET = "document-analyzer";
const VISION_MODEL = "@cf/moondream/moondream3.1-9B-A2B";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type SupportedImageType =
  | "image/jpeg"
  | "image/png"
  | "image/webp";

type DescriptionMode = "short" | "detailed";
type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function detectImageType(bytes: Uint8Array): SupportedImageType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

function extractDescription(payload: unknown): string {
  const root = asRecord(payload);
  const result = asRecord(root?.result);
  const nested = asRecord(result?.result);
  const candidates = [
    nested?.answer,
    result?.answer,
    result?.description,
    result?.response,
    result?.output,
    root?.response,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

export async function POST(request: Request) {
  let pendingReservationId: string | null = null;
  try {
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { error: "AI service is not configured." },
        { status: 500 }
      );
    }

    // 1. Authenticate the user.
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

    const quota = await reserveToolUsage(user.id, "image-description");
    if (!quota.allowed) return NextResponse.json({ error: "You've used your two free lifetime image description uses. Upgrade to Pro for unlimited access.", code: "TOOL_QUOTA_EXHAUSTED", used: quota.used, limit: 2 }, { status: 403 });
    pendingReservationId = quota.reservationId;

    // 3. Validate the private Storage path and description mode.
    let body: { storagePath?: unknown; mode?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const storagePath = body.storagePath;
    const mode: DescriptionMode =
      body.mode === "short" ? "short" : "detailed";

    if (
      typeof storagePath !== "string" ||
      storagePath.length > 500 ||
      storagePath.startsWith("/") ||
      storagePath.split("/").includes("..") ||
      storagePath.split("/")[0] !== user.id
    ) {
      return NextResponse.json(
        { error: "Invalid image path." },
        { status: 400 }
      );
    }

    // 4. Download the user's image from the existing private bucket.
    const {
      data: file,
      error: downloadError,
    } = await supabase.storage.from(BUCKET).download(storagePath);

    if (downloadError || !file) {
      return NextResponse.json(
        { error: "Unable to access the uploaded image." },
        { status: 404 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be smaller than 10 MB." },
        { status: 400 }
      );
    }

    const imageBytes = new Uint8Array(await file.arrayBuffer());
    const imageType = detectImageType(imageBytes);

    if (!imageType) {
      return NextResponse.json(
        { error: "Unsupported or invalid image. Use JPG, PNG, or WEBP." },
        { status: 415 }
      );
    }

    const imageDataUri =
      `data:${imageType};base64,${Buffer.from(imageBytes).toString("base64")}`;

    const question =
      mode === "short"
        ? [
            "Describe this image in 2 to 4 clear sentences.",
            "Mention the main subject, setting, and most important visible details.",
            "If readable text is prominent, briefly include it.",
            "Do not guess identities or invent details.",
            "Return only the description.",
          ].join(" ")
        : [
            "Provide a detailed, accurate description of this image.",
            "Organize the response with these plain-text headings:",
            "OVERVIEW, PEOPLE AND SUBJECTS, OBJECTS AND DETAILS, SETTING AND ACTIVITY, VISIBLE TEXT.",
            "Describe visible people respectfully without guessing their identities.",
            "Mention positions, colors, appearance, relationships between objects, and relevant background details.",
            "Transcribe clearly readable text when practical.",
            "If a heading has no relevant information, write 'Not applicable'.",
            "Do not infer facts that cannot be seen, and do not invent details.",
            "Return only the description.",
          ].join(" ");

    // 5. Generate the description with Cloudflare Moondream.
    const aiResponse = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${VISION_MODEL}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: "query",
          image: imageDataUri,
          question,
          reasoning: false,
          temperature: 0.2,
          max_tokens: mode === "short" ? 512 : 1800,
          stream: false,
        }),
        signal: AbortSignal.timeout(50000),
      }
    );

    const payload = (await aiResponse.json()) as UnknownRecord;

    if (!aiResponse.ok || !payload.success) {
      console.error("Cloudflare image description failed:", {
        status: aiResponse.status,
        errors: payload.errors,
      });
      return NextResponse.json(
        { error: "The AI could not process this image. Please try again." },
        { status: 502 }
      );
    }

    const description = extractDescription(payload);

    if (!description) {
      console.error("Unexpected Moondream response structure:", {
        topLevelKeys: Object.keys(payload),
        resultKeys: asRecord(payload.result) ? Object.keys(asRecord(payload.result)!) : [],
      });

      return NextResponse.json(
        {
          error: "The AI returned an empty description. Please try another image.",
          code: "EMPTY_DESCRIPTION",
        },
        { status: 502 }
      );
    }

    if (quota.reservationId) await completeToolUsage(quota.reservationId);
    pendingReservationId = null;
    return NextResponse.json({
      success: true,
      description,
      metadata: {
        imageType,
        mode,
        model: VISION_MODEL,
      },
    });
  } catch (error) {
    console.error("AI image description error:", error);

    if (error instanceof Error && error.name === "TimeoutError") {
      return NextResponse.json(
        {
          error: "Image description timed out. Please try again.",
          code: "ANALYSIS_TIMEOUT",
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { error: "An unexpected image description error occurred." },
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
