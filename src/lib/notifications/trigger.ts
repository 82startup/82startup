import { after } from "next/server";
import { runNotifications } from "./run";

// Sends the notifications an action just created, after the answer has been sent (the member does not wait for it).
// Best effort: the 5-minute job picks up anything that is missed. Never throws.
export function triggerNotifications(): void {
  try {
    after(async () => {
      try {
        await runNotifications();
      } catch (error) {
        console.error("notifications run failed:", error instanceof Error ? error.name : "unknown");
      }
    });
  } catch {
    // Not inside a request (for example in a test): nothing to schedule.
  }
}
