import { describe, it, expect } from "vitest";
import { maskName, formatThaiDate, calculateAge } from "@/lib/thai";

describe("Thai Utils - maskName (PDPA)", () => {
  it("masks standard Thai surname without leading vowel", () => {
    expect(maskName("ธนากร", "วงศ์สกุล")).toBe("ธนากร ว****");
    expect(maskName("สมชาย", "มีสุข")).toBe("สมชาย มี****");
  });

  it("handles surnames starting with leading vowels (เ, แ, โ, ใ, ไ)", () => {
    expect(maskName("วิชัย", "เกษมสุข")).toBe("วิชัย เก****");
    expect(maskName("อนันต์", "แสงสุริยะ")).toBe("อนันต์ แส****");
    expect(maskName("ประสิทธิ์", "โชติช่วง")).toBe("ประสิทธิ์ โช****");
    expect(maskName("มงคล", "ใจมั่น")).toBe("มงคล ใจ****");
    expect(maskName("ไพศาล", "ไพบูลย์")).toBe("ไพศาล ไพ****");
  });

  it("handles edge cases: empty or single letter surname", () => {
    expect(maskName("ธนากร", "")).toBe("ธนากร");
    expect(maskName("ธนากร", "ก")).toBe("ธนากร ก****");
  });
});

describe("Thai Utils - formatThaiDate (Buddhist Era)", () => {
  it("converts Christian year to Buddhist Era (B.E. = A.D. + 543)", () => {
    // 2026-10-10 -> 2569
    const testDate = new Date(2026, 9, 10, 14, 30);
    const formatted = formatThaiDate(testDate, { formatStyle: "full" });
    expect(formatted).toContain("2569");
    expect(formatted).toContain("10 ตุลาคม");
  });

  it("formats date with time when requested", () => {
    const testDate = new Date(2026, 9, 10, 14, 30);
    const formatted = formatThaiDate(testDate, {
      formatStyle: "medium",
      includeTime: true,
    });
    expect(formatted).toContain("2569");
    expect(formatted).toContain("14:30 น.");
  });

  it("returns '-' for invalid date", () => {
    expect(formatThaiDate("invalid-date")).toBe("-");
  });
});

describe("Thai Utils - calculateAge", () => {
  it("calculates age accurately", () => {
    // Reference against realistic year
    const birth = new Date(1960, 0, 1);
    const age = calculateAge(birth);
    expect(age).toBeGreaterThan(50);
  });
});
