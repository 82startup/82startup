// The event code at the end of a Luma link (https://luma.com/<code>), or "" for anything else.
export function lumaCode(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    if (!/(^|\.)(luma\.com|lu\.ma)$/.test(hostname)) return "";
    return pathname.replace(/^\/+|\/+$/g, "");
  } catch {
    return "";
  }
}
