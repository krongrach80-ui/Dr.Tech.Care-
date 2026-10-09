/**
 * Trusted Proxy Hop IP Extractor
 * ป้องกัน IP Spoofing โดยไม่เชื่อ x-forwarded-for ตัวแรก (client-supplied)
 * แต่คำนวณตามจำนวน trusted proxy hops ที่แท้จริง
 */

export function extractClientIp(
  headers: Headers | Record<string, string | string[] | undefined>,
  trustedHops: number = 1
): string {
  let forwardedFor: string | undefined;

  if (headers instanceof Headers) {
    forwardedFor = headers.get("x-forwarded-for") ?? undefined;
  } else {
    const raw = headers["x-forwarded-for"] ?? headers["X-Forwarded-For"];
    if (Array.isArray(raw)) {
      forwardedFor = raw[0];
    } else {
      forwardedFor = raw;
    }
  }

  if (!forwardedFor) {
    if (headers instanceof Headers) {
      return headers.get("x-real-ip") ?? "127.0.0.1";
    }
    const realIp = headers["x-real-ip"] ?? headers["X-Real-IP"];
    return (Array.isArray(realIp) ? realIp[0] : realIp) ?? "127.0.0.1";
  }

  const ips = forwardedFor
    .split(",")
    .map((ip) => ip.trim())
    .filter((ip) => ip.length > 0);

  if (ips.length === 0) {
    return "127.0.0.1";
  }

  // คำนวณ hop จากด้านหลัง (Right-to-Left) ตามจำนวน trusted proxies
  // ตัวอย่าง: client, spoofed_ip, cdn_ip, reverse_proxy_ip
  // หาก trustedHops = 1 -> เอา ip ก่อน reverse proxy 1 hop: ips[ips.length - 1]
  const targetIndex = Math.max(0, ips.length - Math.max(1, trustedHops));
  return ips[targetIndex] ?? "127.0.0.1";
}