import { createEventStore } from "@/lib/events/store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createLumaClient } from "./client";
import { runSync, type SyncResult } from "./sync";

export class MissingConfigError extends Error {
  constructor(name: string) {
    super(`${name} is not set`);
    this.name = "MissingConfigError";
  }
}

// The one place that wires the Luma client, the service-role store and the sync together.
export async function runLumaSync(): Promise<SyncResult> {
  const apiKey = process.env.LUMA_API_KEY;
  if (!apiKey) throw new MissingConfigError("LUMA_API_KEY");
  return runSync(createLumaClient({ apiKey }), createEventStore(createAdminClient()));
}
