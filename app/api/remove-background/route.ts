
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reserveToolUsage, completeToolUsage, releaseToolUsage } from "@/lib/usage";


const MAX_FILE_SIZE = 4 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(request: Request) {
  let pendingReservationId: string | null = null;
  try {
    // 1. Verify the authenticated user.
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();

    if (error || !data?.claims?.sub) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const quota = await reserveToolUsage(String(data.claims.sub), "background-remover");
    if (!quota.allowed) return NextResponse.json({ error: "You've used your two free lifetime background remover uses. Upgrade to Pro for unlimited access.", code: "TOOL_QUOTA_EXHAUSTED", used: quota.used, limit: 2 }, { status: 403 });
    pendingReservationId = quota.reservationId;

    // 2. Check the API key.
    const apiKey = process.env.REMOVE_BG_API_KEY;

    if (!apiKey) {
      console.error("REMOVE_BG_API_KEY is missing.");

      return NextResponse.json(
        { error: "Background removal is not configured." },
        { status: 500 }
      );
    }

    // 3. Read and validate the uploaded image.
    const incomingData = await request.formData();
    const file = incomingData.get("image");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please upload an image." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG and WEBP images are supported." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "The image must be smaller than 4 MB." },
        { status: 400 }
      );
    }

    // 4. Prepare the remove.bg request.
    const formData = new FormData();

    formData.append("image_file", file);
    formData.append("size", "auto");
    formData.append("format", "png");

    // 5. Send the image to remove.bg.
    const apiResponse = await fetch(
      "https://api.remove.bg/v1.0/removebg",
      {
        method: "POST",
        headers: {
          "X-Api-Key": apiKey,
        },
        body: formData,
        cache: "no-store",
      }
    );

    if (!apiResponse.ok) {
      const errorBody = await apiResponse.text();

      console.error(
        "remove.bg API error:",
        apiResponse.status,
        errorBody
      );

      if (apiResponse.status === 402) {
        return NextResponse.json(
          { error: "Your remove.bg API credits are exhausted." },
          { status: 402 }
        );
      }

      if (apiResponse.status === 429) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }

      if (apiResponse.status === 403) {
        return NextResponse.json(
          { error: "The background removal API key was rejected." },
          { status: 502 }
        );
      }

      return NextResponse.json(
        { error: "Could not remove the image background." },
        { status: 502 }
      );
    }

    // 6. Return the transparent PNG.
    const imageBuffer = await apiResponse.arrayBuffer();
    if (quota.reservationId) await completeToolUsage(quota.reservationId);
    pendingReservationId = null;

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": 'inline; filename="background-removed.png"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Background removal error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
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
