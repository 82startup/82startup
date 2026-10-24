// Keeps a signed-in member with an incomplete profile on the profile setup screen. These are the pure parts; the proxy does
// the database check.

// Addresses an incomplete member may still open: the setup screen itself, sign-out and the sign-in return, and API routes
// (cron and webhooks are not member pages). Static files never reach the proxy.
export function isGateOpenPath(pathname: string): boolean {
  return pathname === "/profile" || pathname.startsWith("/auth/") || pathname.startsWith("/api/");
}

// Where to send an incomplete member, remembering the page they wanted (the setup screen reads it back through the safe-path check).
export function setupRedirectPath(pathname: string, search: string): string {
  if (pathname === "/" || pathname === "/login") return "/profile";
  return `/profile?next=${encodeURIComponent(pathname + search)}`;
}

// A short-lived "this member's profile is complete" note, so the database is not asked on every click. It is only an
// optimisation: it never grants access to data.
export const GATE_COOKIE = "profile_ok";
const LIFETIME_MS = 10 * 60_000;

export const GATE_COOKIE_MAX_AGE_SECONDS = LIFETIME_MS / 1000;

export function gateCookieValue(sub: string, now: Date): string {
  return `${sub}:${now.getTime() + LIFETIME_MS}`;
}

export function cookieMatches(value: string | undefined, sub: string, now: Date): boolean {
  if (!value) return false;
  const at = value.lastIndexOf(":");
  if (at <= 0) return false;
  const expires = Number(value.slice(at + 1));
  if (value.slice(0, at) !== sub || !Number.isFinite(expires)) return false;
  // Also reject a value that claims to last longer than it can, so a forged far-future cookie does not stick.
  return expires > now.getTime() && expires <= now.getTime() + LIFETIME_MS;
}
