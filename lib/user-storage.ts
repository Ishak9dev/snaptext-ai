import { getSupabaseAdmin } from "@/lib/supabase/admin";

const USER_BUCKETS = ["document-analyzer", "tool-history"] as const;
type UserBucket = typeof USER_BUCKETS[number];
type StorageEntry = { name: string; id: string | null };

export async function listUserStorageObjects(userId: string) {
  const supabaseAdmin = getSupabaseAdmin();
  const files: Array<{ bucket: UserBucket; path: string }> = [];
  for (const bucket of USER_BUCKETS) {
    const folders = [userId];
    let visited = 0;
    while (folders.length) {
      const folder = folders.shift()!;
      let offset = 0;
      while (true) {
        if (++visited > 5000) throw new Error("storage_scan_limit");
        const { data, error } = await supabaseAdmin.storage.from(bucket).list(folder, {
          limit: 100,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (error) throw error;
        for (const entry of (data ?? []) as StorageEntry[]) {
          const path = `${folder}/${entry.name}`;
          if (!entry.id) folders.push(path);
          else files.push({ bucket, path });
          if (files.length > 10000) throw new Error("storage_file_limit");
        }
        if (!data || data.length < 100) break;
        offset += data.length;
      }
    }
  }
  return files;
}

export async function removeUserStorageObjects(files: Array<{ bucket: UserBucket; path: string }>) {
  const supabaseAdmin = getSupabaseAdmin();
  for (const bucket of USER_BUCKETS) {
    const paths = files.filter((file) => file.bucket === bucket).map((file) => file.path);
    for (let index = 0; index < paths.length; index += 100) {
      const { error } = await supabaseAdmin.storage.from(bucket).remove(paths.slice(index, index + 100));
      if (error) throw error;
    }
  }
}
