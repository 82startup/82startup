const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** Resolve the browser-facing origin when Next rewrites request.url internally. */
export function requestOrigin(request: Request): URL {
  const internal = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0].trim();
  const host = forwardedHost || request.headers.get("host");
  if (!host) return new URL(internal.origin);

  try {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim();
    const protocol = forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : internal.protocol.slice(0, -1);
    const candidate = new URL(`${protocol}://${host}`);
    const hostname = candidate.hostname.toLowerCase();
    if (LOCAL_HOSTS.has(hostname) || hostname === "82startup.vercel.app" || hostname.endsWith(".vercel.app")) {
      return candidate;
    }
  } catch {
    // Ignore malformed or untrusted host headers and retain Next's request origin.
  }

  return new URL(internal.origin);
}
