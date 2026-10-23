// An avatar address comes from the sign-in provider's data (or is a photo the member uploaded), and a person can put anything
// there when they sign up by email. Showing an arbitrary address would tell its owner who looks at the directory, so only two
// places are accepted: Google's picture host, and this project's own public avatars bucket. Everything else shows initials.
export function safeAvatarUrl(url: string | null | undefined, ownUrl: string | undefined = process.env.NEXT_PUBLIC_SUPABASE_URL): string | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.username || parsed.password) return null;

  if (ownUrl) {
    try {
      if (parsed.origin === new URL(ownUrl).origin && parsed.pathname.startsWith("/storage/v1/object/public/avatars/")) return parsed.href;
    } catch {
      // an unreadable own address just means no bucket pictures are accepted
    }
  }

  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  if (host !== "googleusercontent.com" && !host.endsWith(".googleusercontent.com")) return null;
  return parsed.href;
}

// First letter of the first and the last word, upper-cased; "?" when there is no name.
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = [...words[0]][0];
  const last = words.length > 1 ? [...words[words.length - 1]][0] : "";
  return (first + last).toUpperCase();
}
