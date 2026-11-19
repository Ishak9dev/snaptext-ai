import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FILES_PER_RUN = 1000;
const BUCKETS = ["document-analyzer", "tool-history"] as const;
type ExpiredObject = { bucket: typeof BUCKETS[number]; path: string };
type StorageEntry = { name: string; id: string | null; created_at: string | null };

async function collectExpiredObjects(bucket: typeof BUCKETS[number], cutoff: number, remaining: number) {
  const supabaseAdmin = getSupabaseAdmin();
  const queue = [""];
  const expired: ExpiredObject[] = [];
  let visited = 0;

  while (queue.length && expired.length < remaining) {
    const folder = queue.shift()!;
    let offset = 0;
    while (expired.length < remaining) {
      if (++visited > 5000) throw new Error("storage_scan_limit");
      const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw error;

      for (const entry of (data ?? []) as StorageEntry[]) {
        const path = folder ? `${folder}/${entry.name}` : entry.name;
        if (!entry.id) {
          queue.push(path);
          continue;
        }
        const created = entry.created_at ? Date.parse(entry.created_at) : NaN;
        if (Number.isFinite(created) && created < cutoff) expired.push({ bucket, path });
        if (expired.length >= remaining) break;
      }
      if (!data || data.length < 100) break;
      offset += data.length;
    }
  }
  return expired;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const cutoff = Date.now() - RETENTION_MS;
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const expired: ExpiredObject[] = [];
    for (const bucket of BUCKETS) {
      expired.push(...await collectExpiredObjects(bucket, cutoff, MAX_FILES_PER_RUN - expired.length));
      if (expired.length >= MAX_FILES_PER_RUN) break;
    }

    let deleted = 0;
    for (const bucket of BUCKETS) {
      const paths = expired.filter((file) => file.bucket === bucket).map((file) => file.path);
      for (let index = 0; index < paths.length; index += 100) {
        const { error } = await supabaseAdmin.storage.from(bucket).remove(paths.slice(index, index + 100));
        if (error) throw error;
        deleted += Math.min(100, paths.length - index);
      }
    }

    // Clear only matching history references after Storage confirms removal,
    // while retaining result_text and metadata for generated descriptions.
    const historyPaths = expired.filter((file) => file.bucket === "tool-history").map((file) => file.path);
    for (let index = 0; index < historyPaths.length; index += 100) {
      const batch = historyPaths.slice(index, index + 100);
      const { error } = await supabaseAdmin.from("tool_history")
        .update({ storage_path: null })
        .in("storage_path", batch);
      if (error) throw error;
    }

    console.info("Upload expiry job completed", { deleted, cutoff: new Date(cutoff).toISOString() });
    return NextResponse.json({ success: true, deleted, cutoff: new Date(cutoff).toISOString() });
  } catch (error) {
    const code = error instanceof Error && "code" in error ? String(error.code) : "expiry_job_failed";
    console.error("Upload expiry job failed", { code });
    return NextResponse.json({ error: "Expiry job failed." }, { status: 500 });
  }
}
