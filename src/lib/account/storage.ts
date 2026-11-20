import type { SupabaseClient } from "@supabase/supabase-js";

// Every file under "<prefix>/" in a bucket, following sub-folders (board pictures sit in <member>/<post>/<file>).
// Storage lists one folder level at a time; folders come back without an id.
export async function listFilesUnder(client: SupabaseClient, bucket: string, prefix: string): Promise<string[]> {
  const files: string[] = [];
  const folders = [prefix];
  while (folders.length > 0) {
    const folder = folders.shift()!;
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.storage.from(bucket).list(folder, { limit: 1000, offset });
      if (error) throw error;
      for (const item of data ?? []) (item.id ? files : folders).push(`${folder}/${item.name}`);
      if (!data || data.length < 1000) break;
    }
  }
  return files;
}
