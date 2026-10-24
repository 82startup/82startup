// The events a speaker can be linked to: only our own calendar's events (not the ones added by link from other sites), newest first.
export function eventsForSpeakers(events: { id: string; title: string; source: "luma" | "external"; start_at: string }[]): { id: string; title: string }[] {
  return events
    .filter((event) => event.source === "luma")
    .sort((a, b) => b.start_at.localeCompare(a.start_at))
    .map(({ id, title }) => ({ id, title }));
}
