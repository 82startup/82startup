import { isIP } from "node:net";

function ipv4Parts(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const numbers = parts.map((part) => (/^(0|[1-9][0-9]{0,2})$/.test(part) ? Number(part) : NaN));
  return numbers.every((n) => n >= 0 && n <= 255) ? numbers : null;
}

function publicIpv4(p: number[]): boolean {
  const [a, b, c] = p;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false; // this network, private, loopback, multicast and reserved
  if (a === 100 && b >= 64 && b <= 127) return false; // shared address space
  if (a === 169 && b === 254) return false; // link-local, including the cloud metadata address
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && b === 168) return false;
  if (a === 192 && b === 0 && (c === 0 || c === 2)) return false;
  if (a === 192 && b === 88 && c === 99) return false;
  if (a === 198 && (b === 18 || b === 19)) return false;
  if (a === 198 && b === 51 && c === 100) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

// Eight 16-bit groups of an IPv6 address, or null if it is not one.
function ipv6Groups(ip: string): number[] | null {
  if (isIP(ip) !== 6) return null;
  let text = ip;
  const lastColon = text.lastIndexOf(":");
  const tail = text.slice(lastColon + 1);
  if (tail.includes(".")) {
    const v4 = ipv4Parts(tail);
    if (!v4) return null;
    text = `${text.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }
  const [head, rest] = text.split("::");
  const left = head === "" ? [] : head.split(":");
  const right = rest === undefined || rest === "" ? [] : rest.split(":");
  const fill = text.includes("::") ? 8 - left.length - right.length : 0;
  const groups = [...left, ...Array(Math.max(fill, 0)).fill("0"), ...right].map((g) => parseInt(g, 16));
  return groups.length === 8 && groups.every((g) => Number.isInteger(g) && g >= 0 && g <= 0xffff) ? groups : null;
}

const embedded = (hi: number, lo: number) => [hi >> 8, hi & 255, lo >> 8, lo & 255];

// True only for a public internet address. Anything private, local, reserved, or that is not an IP address at all gives false.
export function isPublicIp(ip: string): boolean {
  const v4 = isIP(ip) === 4 ? ipv4Parts(ip) : null;
  if (v4) return publicIpv4(v4);

  const g = ipv6Groups(ip);
  if (!g) return false;
  if (g.every((x) => x === 0)) return false; // ::
  if (g.slice(0, 7).every((x) => x === 0) && g[7] === 1) return false; // ::1
  if (g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff) return publicIpv4(embedded(g[6], g[7])); // IPv4-mapped
  if (g[0] === 0x64 && g[1] === 0xff9b && g.slice(2, 6).every((x) => x === 0)) return publicIpv4(embedded(g[6], g[7])); // NAT64
  if (g[0] === 0x2002) return publicIpv4(embedded(g[1], g[2])); // 6to4
  if ((g[0] & 0xfe00) === 0xfc00) return false; // unique local
  if ((g[0] & 0xffc0) === 0xfe80 || (g[0] & 0xffc0) === 0xfec0) return false; // link-local and site-local
  if ((g[0] & 0xff00) === 0xff00) return false; // multicast
  if (g[0] === 0x2001 && g[1] === 0x0db8) return false; // documentation
  return true;
}
