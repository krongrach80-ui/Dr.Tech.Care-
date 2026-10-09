import { describe, it, expect } from "vitest";
import { extractClientIp } from "@/lib/ip";

describe("Trusted Proxy Hop IP Extractor (extractClientIp)", () => {
  it("ป้องกัน IP Spoofing โดยไม่เชื่อตัวแรกเมื่อมี proxy หลาย hop", () => {
    const headers = new Headers({
      "x-forwarded-for": "1.1.1.1, 203.0.113.195, 10.0.0.1",
    });

    // trustedHops = 1 -> hop จากขวาสุดคือ 10.0.0.1
    expect(extractClientIp(headers, 1)).toBe("10.0.0.1");

    // trustedHops = 2 -> 203.0.113.195 (Client จริงที่ผ่าน reverse proxy 1 ตัว)
    expect(extractClientIp(headers, 2)).toBe("203.0.113.195");
  });

  it("ใช้ x-real-ip หากไม่มี x-forwarded-for", () => {
    const headers = new Headers({
      "x-real-ip": "192.168.1.50",
    });
    expect(extractClientIp(headers, 1)).toBe("192.168.1.50");
  });

  it("fallback เป็น 127.0.0.1 เมื่อไม่มี header ใดเลย", () => {
    const headers = new Headers();
    expect(extractClientIp(headers, 1)).toBe("127.0.0.1");
  });

  it("รองรับ header รูปแบบ Record/Object จาก Node request", () => {
    const headers = {
      "x-forwarded-for": "10.10.10.10, 172.16.0.5",
    };
    expect(extractClientIp(headers, 2)).toBe("10.10.10.10");
  });
});