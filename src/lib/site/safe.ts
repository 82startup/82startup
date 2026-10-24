// A read of the sponsors or speakers must never take a whole page down: if it fails, the section just shows as empty.
// (Called by the pages, not inside the cached reads, so a failure is never cached.)
export async function safely<T>(read: () => Promise<T> | T, fallback: T): Promise<T> {
  try {
    return await read();
  } catch (error) {
    console.error("site read failed:", error instanceof Error ? error.name : "unknown");
    return fallback;
  }
}
