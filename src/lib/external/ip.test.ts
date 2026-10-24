import { describe, expect, it } from "vitest";
import { isPublicIp } from "./ip";

describe("isPublicIp", () => {
  it("accepts ordinary public IPv4 and IPv6 addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "151.101.1.69", "104.18.0.1", "2606:4700:4700::1111", "2a00:1450:4001:81b::200e"]) expect(isPublicIp(ip)).toBe(true);
  });

  it("refuses private, loopback, link-local, metadata and other special IPv4 ranges", () => {
    for (const ip of [
      "0.0.0.0", "0.1.2.3", "10.0.0.1", "10.255.255.255", "100.64.0.1", "100.127.255.255", "127.0.0.1", "127.255.255.254", "169.254.169.254", "172.16.0.1", "172.31.255.255",
      "192.0.0.1", "192.0.2.5", "192.168.1.1", "198.18.0.1", "198.19.255.255", "198.51.100.7", "203.0.113.9", "224.0.0.1", "239.255.255.255", "240.0.0.1", "255.255.255.255",
    ]) expect(isPublicIp(ip)).toBe(false);
  });

  it("accepts the edges just outside those ranges", () => {
    for (const ip of ["172.15.255.255", "172.32.0.1", "100.63.255.255", "100.128.0.1", "11.0.0.1", "126.255.255.255", "128.0.0.1", "169.253.0.1", "169.255.0.1", "192.167.0.1", "192.169.0.1"]) expect(isPublicIp(ip)).toBe(true);
  });

  it("refuses private, loopback, link-local and special IPv6 addresses", () => {
    for (const ip of ["::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "febf::1", "fec0::1", "ff02::1", "2001:db8::1", "2001:0db8:85a3::8a2e:370:7334"]) expect(isPublicIp(ip)).toBe(false);
  });

  it("looks inside IPv6 addresses that carry an IPv4 address", () => {
    expect(isPublicIp("::ffff:127.0.0.1")).toBe(false);
    expect(isPublicIp("::ffff:10.1.2.3")).toBe(false);
    expect(isPublicIp("::ffff:7f00:1")).toBe(false);
    expect(isPublicIp("::ffff:8.8.8.8")).toBe(true);
    expect(isPublicIp("64:ff9b::7f00:1")).toBe(false);
    expect(isPublicIp("64:ff9b::808:808")).toBe(true);
    expect(isPublicIp("2002:7f00:1::")).toBe(false);
    expect(isPublicIp("2002:808:808::")).toBe(true);
  });

  it("refuses anything that is not an IP address", () => {
    for (const bad of ["", "localhost", "example.com", "1.2.3", "1.2.3.4.5", "256.1.1.1", "01.2.3.4", "::g", "1::2::3", " 8.8.8.8", "8.8.8.8 "]) expect(isPublicIp(bad)).toBe(false);
  });
});
