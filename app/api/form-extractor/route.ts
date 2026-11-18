import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reserveToolUsage, completeToolUsage, releaseToolUsage } from "@/lib/usage";

const OCR_MODEL = "@cf/moondream/moondream3.1-9B-A2B";
const TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_PDF_PAGES = 20;

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

type ExtractedField = {
  label: string;
  value: string;
  type?: string;
  confidence?: number;
};

function getImageType(bytes: Uint8Array): string | null {
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
    bytes[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function extractText(payload: any): string {
  const result = payload?.result;

  const candidates = [
    result?.result?.answer,
    result?.answer,
    result?.description,
    result?.response,
    result?.output,
    payload?.response,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

async function callCloudflare(
  model: string,
  body: BodyInit,
  contentType: string
) {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId || !apiToken) {
    throw new Error("Cloudflare AI environment variables are missing.");
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": contentType,
      },
      body,
      signal: AbortSignal.timeout(50000),
    }
  );

  const payload = await response.json();

  if (!response.ok || payload?.success === false) {
    console.error("Cloudflare AI error:", payload);
    throw new Error("AI processing failed.");
  }

  return payload;
}

async function imageToBase64(bytes: Uint8Array, mimeType: string) {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

async function extractImageText(
  bytes: Uint8Array,
  mimeType: string
): Promise<string> {
  const image = await imageToBase64(bytes, mimeType);

  const payload = await callCloudflare(
    OCR_MODEL,
    JSON.stringify({
      image,
      prompt:
        "Read all visible text in this document image. Preserve the original wording, field labels, values, table rows, checkbox labels and checkbox states. Clearly indicate checked and unchecked boxes when visible. Do not summarize or invent missing information.",
    }),
    "application/json"
  );

  const text = extractText(payload);

  if (!text) {
    throw new Error("No readable text was detected in the image.");
  }

  return text;
}

async function extractPdfText(bytes: Uint8Array): Promise<string> {
  const { getDocumentProxy, extractText: extractPdfTextContent } =
    await import("unpdf");

  const pdf = await getDocumentProxy(new Uint8Array(bytes));

  if (pdf.numPages > MAX_PDF_PAGES) {
    throw new Error(`PDF exceeds the ${MAX_PDF_PAGES}-page limit.`);
  }

  const result = await extractPdfTextContent(pdf, {
    mergePages: true,
  });

  const text =
    typeof result.text === "string" ? result.text.trim() : "";

  if (text.length > 100) {
    return text;
  }

  // Scanned PDFs may not contain an embedded text layer.
  const { renderPageAsImage } = await import("unpdf");

  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const rendered = await renderPageAsImage(
      pdf,
      pageNumber - 1,
      { scale: 1.5 }
    );

    const imageBytes = Buffer.from(rendered);
    const pageText = await extractImageText(
      new Uint8Array(imageBytes),
      "image/png"
    );

    pages.push(`Page ${pageNumber}\n${pageText}`);
  }

  return pages.join("\n\n");
}

function parseJsonResponse(value: string): any {
  const cleaned = value
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start === -1 || end <= start) {
      throw new Error("AI returned invalid structured data.");
    }

    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

function normalizeResult(value: any) {
  const fields: ExtractedField[] = Array.isArray(value?.fields)
    ? value.fields
        .filter(
          (field: any) =>
            field &&
            typeof field.label === "string" &&
            typeof field.value === "string"
        )
        .map((field: any) => ({
          label: field.label.slice(0, 300),
          value: field.value.slice(0, 5000),
          type:
            typeof field.type === "string"
              ? field.type.slice(0, 100)
              : "text",
          confidence:
            typeof field.confidence === "number"
              ? Math.max(0, Math.min(1, field.confidence))
              : undefined,
        }))
    : [];

  const tables = Array.isArray(value?.tables)
    ? value.tables
        .filter((table: any) => table && Array.isArray(table.rows))
        .slice(0, 30)
        .map((table: any) => ({
          title:
            typeof table.title === "string"
              ? table.title.slice(0, 300)
              : "Table",
          headers: Array.isArray(table.headers)
            ? table.headers.slice(0, 30).map(String)
            : [],
          rows: table.rows.slice(0, 200).map((row: any) =>
            Array.isArray(row) ? row.slice(0, 30).map(String) : []
          ),
        }))
    : [];

  const checkboxes = Array.isArray(value?.checkboxes)
    ? value.checkboxes
        .filter((item: any) => item && typeof item.label === "string")
        .slice(0, 200)
        .map((item: any) => ({
          label: item.label.slice(0, 300),
          checked: item.checked === true,
        }))
    : [];

  return {
    documentType:
      typeof value?.documentType === "string"
        ? value.documentType.slice(0, 200)
        : "Unknown",
    fields,
    tables,
    checkboxes,
    summary:
      typeof value?.summary === "string"
        ? value.summary.slice(0, 3000)
        : "",
    notes: Array.isArray(value?.notes)
      ? value.notes
          .filter((note: any) => typeof note === "string")
          .slice(0, 30)
          .map((note: string) => note.slice(0, 500))
      : [],
  };
}

async function structureDocument(text: string) {
  const prompt = `
You are an expert document and form data extraction system.

Extract information from the supplied document text.
Do not invent information. Use empty strings for missing values.
Preserve original values and wording as much as possible.

Return ONLY valid JSON with this exact structure:

{
  "documentType": "string",
  "summary": "string",
  "fields": [
    {
      "label": "string",
      "value": "string",
      "type": "text, date, number, email, phone, address, checkbox, or other",
      "confidence": 0.0
    }
  ],
  "tables": [
    {
      "title": "string",
      "headers": ["string"],
      "rows": [["string"]]
    }
  ],
  "checkboxes": [
    {
      "label": "string",
      "checked": true
    }
  ],
  "notes": ["string"]
}

Rules:
- Extract form labels and their corresponding values.
- Include names, dates, addresses, identifiers and reference numbers.
- Preserve table headers and row values.
- Include checked and unchecked checkboxes only when their state is clear.
- Do not guess unclear or missing values.
- Add uncertainty to notes when appropriate.
- Do not add Markdown or explanations outside the JSON.

DOCUMENT TEXT:
${text.slice(0, 45000)}
`;

  const payload = await callCloudflare(
    TEXT_MODEL,
    JSON.stringify({
      messages: [
        {
          role: "system",
          content:
            "You extract structured data from documents. Return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 6000,
      temperature: 0.1,
    }),
    "application/json"
  );

  const result = payload?.result;
  const responseText =
    typeof result?.response === "string"
      ? result.response
      : typeof result?.output === "string"
        ? result.output
        : typeof result === "string"
          ? result
          : "";

  if (!responseText) {
    console.error("Unexpected Llama response:", payload);
    throw new Error("AI could not structure the extracted information.");
  }

  return normalizeResult(parseJsonResponse(responseText));
}

export async function POST(request: Request) {
  let pendingReservationId: string | null = null;
  try {
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

    const quota = await reserveToolUsage(user.id, "form-extractor");
    if (!quota.allowed) return NextResponse.json({ error: "You've used your two free lifetime form extraction uses. Upgrade to Pro for unlimited access.", code: "TOOL_QUOTA_EXHAUSTED", used: quota.used, limit: 2 }, { status: 403 });
    pendingReservationId = quota.reservationId;
    const body = await request.json();
    const storagePath = body?.storagePath;

    if (
      typeof storagePath !== "string" ||
      storagePath.length > 500 ||
      storagePath.startsWith("/") ||
      storagePath.includes("..") ||
      !storagePath.startsWith(`${user.id}/`)
    ) {
      return NextResponse.json(
        { error: "Invalid file reference." },
        { status: 400 }
      );
    }

    const { data: file, error: downloadError } = await supabase.storage
      .from("document-analyzer")
      .download(storagePath);

    if (downloadError || !file) {
      return NextResponse.json(
        { error: "Unable to access the uploaded document." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the 10 MB limit." },
        { status: 413 }
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mimeType = file.type || "";

    let documentText = "";
    let detectedType = "";

    if (mimeType === "application/pdf") {
      if (
        bytes.length < 5 ||
        String.fromCharCode(...bytes.slice(0, 5)) !== "%PDF-"
      ) {
        return NextResponse.json(
          { error: "Invalid PDF file." },
          { status: 400 }
        );
      }

      detectedType = "application/pdf";
      documentText = await extractPdfText(bytes);
    } else {
      const actualType = getImageType(bytes);

      if (
        !actualType ||
        !ALLOWED_TYPES.includes(mimeType) ||
        actualType !== mimeType
      ) {
        return NextResponse.json(
          { error: "Unsupported or invalid image file." },
          { status: 400 }
        );
      }

      detectedType = actualType;
      documentText = await extractImageText(bytes, actualType);
    }

    if (!documentText.trim()) {
      return NextResponse.json(
        { error: "No readable document content was found." },
        { status: 422 }
      );
    }

    const extracted = await structureDocument(documentText);

    if (quota.reservationId) await completeToolUsage(quota.reservationId);
    pendingReservationId = null;
    return NextResponse.json({
      success: true,
      result: extracted,
      metadata: {
        fileType: detectedType,
        model: TEXT_MODEL,
        charactersProcessed: documentText.length,
      },
    });
  } catch (error: any) {
    console.error("Form extractor error:", error);

    const message =
      error?.message === "No readable text was detected in the image."
        ? error.message
        : error?.message === "PDF exceeds the 20-page limit."
          ? error.message
          : "Unable to extract form data. Please try another document.";

    return NextResponse.json({ error: message }, { status: 500 });
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
