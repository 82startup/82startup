import { safeAvatarUrl } from "@/lib/members/avatar";

// A profile picture, or a ghost silhouette when there is none we trust.
export function Avatar({ url, size = 48 }: { name: string; url: string | null; size?: number }) {
  const src = safeAvatarUrl(url);
  const box = { width: size, height: size };
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Google-hosted picture; no image optimizer configured
      <img src={src} alt="" referrerPolicy="no-referrer" loading="lazy" width={size} height={size} style={box} className="flex-none rounded-full object-cover" />
    );
  }
  // No trusted picture: a neutral person silhouette (the name is always shown next to it).
  return (
    <span aria-hidden style={{ ...box, background: "#e2e1d4" }} className="avatar-ghost flex flex-none items-center justify-center overflow-hidden rounded-full">
      <svg viewBox="0 0 48 48" width="100%" height="100%" fill="#a9aa9c"><circle cx="24" cy="19" r="8.5" /><path d="M8.5 42.5c1.6-8.4 8-13.5 15.5-13.5s13.9 5.1 15.5 13.5a20 20 0 0 1-31 0Z" /></svg>
    </span>
  );
}
