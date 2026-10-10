import { describe, it, expect } from "vitest";
import {
  isExerciseTimeWindowOpen,
  timeStringToMinutes,
  minutesToTimeString,
} from "@/lib/timeWindow";

describe("Exercise Time Window Engine (Phase 5)", () => {
  it("แปลงรูปแบบเวลา HH:mm เป็นนาทีและกลับคืนถูกต้อง", () => {
    expect(timeStringToMinutes("09:00")).toBe(540);
    expect(timeStringToMinutes("10:30")).toBe(630);
    expect(minutesToTimeString(540)).toBe("09:00");
    expect(minutesToTimeString(630)).toBe("10:30");
  });

  describe("ช่วงเวลามาตรฐาน [เริ่ม − 30 นาที, สิ้นสุด + 60 นาที]", () => {
    const startTime = "09:00";
    const endTime = "10:00";

    it("ก่อน 08:30 (เริ่ม - 30 นาที) ต้องสถานะ pending และ isOpen = false", () => {
      const res = isExerciseTimeWindowOpen(startTime, endTime, "08:15");
      expect(res.isOpen).toBe(false);
      expect(res.status).toBe("pending");
      expect(res.earliestAllowedTime).toBe("08:30");
      expect(res.latestAllowedTime).toBe("11:00");
    });

    it("พอดี 08:30 (ขอบเขตล่าง) ต้องสถานะ ready และ isOpen = true", () => {
      const res = isExerciseTimeWindowOpen(startTime, endTime, "08:30");
      expect(res.isOpen).toBe(true);
      expect(res.status).toBe("ready");
    });

    it("ระหว่าง 09:15 ต้องสถานะ ready และ isOpen = true", () => {
      const res = isExerciseTimeWindowOpen(startTime, endTime, "09:15");
      expect(res.isOpen).toBe(true);
      expect(res.status).toBe("ready");
    });

    it("พอดี 11:00 (สิ้นสุด + 60 นาที) ต้องสถานะ ready และ isOpen = true", () => {
      const res = isExerciseTimeWindowOpen(startTime, endTime, "11:00");
      expect(res.isOpen).toBe(true);
      expect(res.status).toBe("ready");
    });

    it("หลัง 11:00 เช่น 11:01 ต้องสถานะ missed และ isOpen = false", () => {
      const res = isExerciseTimeWindowOpen(startTime, endTime, "11:01");
      expect(res.isOpen).toBe(false);
      expect(res.status).toBe("missed");
    });
  });

  describe("โหมด allow_anytime_today", () => {
    it("เมื่อเปิด allow_anytime_today จะพร้อมทำได้ตลอดทั้งวัน แม้อยู่นอกช่วง", () => {
      const res = isExerciseTimeWindowOpen("09:00", "10:00", "06:00", {
        allowAnytimeToday: true,
      });
      expect(res.isOpen).toBe(true);
      expect(res.status).toBe("ready");
    });
  });

  describe("การปรับแต่ง windowBeforeMinutes และ windowAfterMinutes", () => {
    it("ปรับก่อนเวลา 15 นาที และหลังเวลา 30 นาที", () => {
      const res1 = isExerciseTimeWindowOpen("14:00", "15:00", "13:40", {
        windowBeforeMinutes: 15,
        windowAfterMinutes: 30,
      });
      expect(res1.isOpen).toBe(false); // 13:45 จึงจะเริ่มได้

      const res2 = isExerciseTimeWindowOpen("14:00", "15:00", "13:45", {
        windowBeforeMinutes: 15,
        windowAfterMinutes: 30,
      });
      expect(res2.isOpen).toBe(true);

      const res3 = isExerciseTimeWindowOpen("14:00", "15:00", "15:31", {
        windowBeforeMinutes: 15,
        windowAfterMinutes: 30,
      });
      expect(res3.isOpen).toBe(false);
      expect(res3.status).toBe("missed");
    });
  });
});
