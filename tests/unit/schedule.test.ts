import { describe, it, expect } from "vitest";
import {
  generateScheduleDates,
  getIsoDayOfWeek,
  doTimeIntervalsOverlap,
  checkScheduleOverlap,
  generateEntriesFromRule,
  copyWeekEntries,
  type ScheduleRuleInput,
  type ScheduleEntryItem,
} from "@/lib/schedule/generator";

describe("Schedule Generator & Overlap Detection (Phase 3)", () => {
  describe("getIsoDayOfWeek", () => {
    it("คืนค่า 1 สำหรับวันจันทร์ และ 7 สำหรับวันอาทิตย์", () => {
      // 2026-10-12 เป็นวันจันทร์ (Monday)
      expect(getIsoDayOfWeek("2026-10-12")).toBe(1);
      // 2026-10-15 เป็นวันพฤหัสบดี (Thursday)
      expect(getIsoDayOfWeek("2026-10-15")).toBe(4);
      // 2026-10-18 เป็นวันอาทิตย์ (Sunday)
      expect(getIsoDayOfWeek("2026-10-18")).toBe(7);
    });
  });

  describe("generateScheduleDates", () => {
    it("สร้างตาราง จันทร์–พฤหัสบดี (จ–พฤ ท่ากายภาพช่วงเช้า) ได้ถูกต้อง", () => {
      // สัปดาห์ 12 ต.ค. - 18 ต.ค. 2026
      const dates = generateScheduleDates("2026-10-12", "2026-10-18", [1, 2, 3, 4]);
      expect(dates).toEqual([
        "2026-10-12", // จันทร์
        "2026-10-13", // อังคาร
        "2026-10-14", // พุธ
        "2026-10-15", // พฤหัส
      ]);
    });

    it("รองรับการสร้างข้ามเดือน (Cross-month) ได้อย่างไร้รอยต่อ", () => {
      // 28 ต.ค. 2026 ถึง 3 พ.ย. 2026 (เฉพาะ จันทร์, พุธ, ศุกร์: 1, 3, 5)
      // 28 ต.ค. (พุธ=3), 30 ต.ค. (ศุกร์=5), 2 พ.ย. (จันทร์=1)
      const dates = generateScheduleDates("2026-10-28", "2026-11-03", [1, 3, 5]);
      expect(dates).toEqual(["2026-10-28", "2026-10-30", "2026-11-02"]);
    });

    it("รองรับการสร้างข้ามปี (Cross-year) ได้ถูกต้อง", () => {
      // 28 ธ.ค. 2026 ถึง 4 ม.ค. 2027 (เฉพาะวันจันทร์=1)
      // 2026-12-28 (จันทร์=1), 2027-01-04 (จันทร์=1)
      const dates = generateScheduleDates("2026-12-28", "2027-01-04", [1]);
      expect(dates).toEqual(["2026-12-28", "2027-01-04"]);
    });
  });

  describe("doTimeIntervalsOverlap & checkScheduleOverlap", () => {
    it("ตรวจจับช่วงเวลาทับซ้อนได้ถูกต้อง", () => {
      // 09:00 - 10:00 กับ 09:30 - 10:30 -> ทับซ้อน
      expect(doTimeIntervalsOverlap("09:00", "10:00", "09:30", "10:30")).toBe(true);
      // 09:00 - 10:00 กับ 10:00 - 11:00 -> ไม่ทับซ้อน (ชนขอบพอดี)
      expect(doTimeIntervalsOverlap("09:00", "10:00", "10:00", "11:00")).toBe(false);
      // 09:00 - 09:30 กับ 11:00 - 12:00 -> ไม่ทับซ้อน
      expect(doTimeIntervalsOverlap("09:00", "09:30", "11:00", "12:00")).toBe(false);
    });

    it("checkScheduleOverlap ตรวจพบการชนเวลาของผู้ป่วยคนเดียวกัน", () => {
      const existing: ScheduleEntryItem[] = [
        {
          id: "entry-1",
          patientId: "patient-1",
          scheduledDate: "2026-10-12",
          startTime: "09:00",
          endTime: "10:00",
          kind: "exercise",
          status: "planned",
          createdBy: "user-1",
          createdAt: "2026-10-10T00:00:00Z",
          updatedAt: "2026-10-10T00:00:00Z",
        },
      ];

      // ชนเวลาในวันเดียวกัน
      const check1 = checkScheduleOverlap(existing, {
        patientId: "patient-1",
        scheduledDate: "2026-10-12",
        startTime: "09:30",
        endTime: "10:30",
      });
      expect(check1.hasOverlap).toBe(true);
      expect(check1.conflictingEntry?.id).toBe("entry-1");

      // ผู้ป่วยคนละคน -> ไม่ชน
      const check2 = checkScheduleOverlap(existing, {
        patientId: "patient-2",
        scheduledDate: "2026-10-12",
        startTime: "09:30",
        endTime: "10:30",
      });
      expect(check2.hasOverlap).toBe(false);

      // วันเดียวกันแต่คนละเวลา -> ไม่ชน
      const check3 = checkScheduleOverlap(existing, {
        patientId: "patient-1",
        scheduledDate: "2026-10-12",
        startTime: "10:30",
        endTime: "11:30",
      });
      expect(check3.hasOverlap).toBe(false);
    });

    it("ไม่นับรายการที่ถูกยกเลิก (status='cancelled') เป็นการทับซ้อน", () => {
      const existing: ScheduleEntryItem[] = [
        {
          id: "entry-cancelled",
          patientId: "patient-1",
          scheduledDate: "2026-10-12",
          startTime: "09:00",
          endTime: "10:00",
          kind: "exercise",
          status: "cancelled",
          createdBy: "user-1",
          createdAt: "2026-10-10T00:00:00Z",
          updatedAt: "2026-10-10T00:00:00Z",
        },
      ];

      const check = checkScheduleOverlap(existing, {
        patientId: "patient-1",
        scheduledDate: "2026-10-12",
        startTime: "09:00",
        endTime: "10:00",
      });
      expect(check.hasOverlap).toBe(false);
    });
  });

  describe("generateEntriesFromRule (Idempotent)", () => {
    it("สร้างรายการใหม่และไม่สร้างซ้ำเมื่อรันรอบสอง (Idempotent)", () => {
      const rule: ScheduleRuleInput = {
        id: "rule-101",
        patientId: "patient-1",
        startDate: "2026-10-12",
        endDate: "2026-10-15",
        daysOfWeek: [1, 2, 3, 4],
        startTime: "08:30",
        endTime: "09:15",
        kind: "exercise",
        exerciseId: "ex-1",
        targetSets: 3,
        targetReps: 12,
        createdBy: "physio-1",
      };

      // รอบที่ 1: สร้าง 4 รายการ
      const res1 = generateEntriesFromRule(rule, []);
      expect(res1.newEntries).toHaveLength(4);
      expect(res1.skippedCount).toBe(0);

      // รอบที่ 2: นำรายการเดิมมาส่งต่อ -> ต้องไม่สร้างเพิ่ม (skippedCount = 4)
      const res2 = generateEntriesFromRule(rule, res1.newEntries);
      expect(res2.newEntries).toHaveLength(0);
      expect(res2.skippedCount).toBe(4);
    });
  });

  describe("copyWeekEntries", () => {
    it("คัดลอกรายการกายภาพจากสัปดาห์นี้ไปยังสัปดาห์หน้าได้ถูกต้อง (+7 วัน)", () => {
      const existing: ScheduleEntryItem[] = [
        {
          id: "src-1",
          patientId: "p-1",
          scheduledDate: "2026-10-12", // จันทร์ สัปดาห์แรก
          startTime: "09:00",
          endTime: "09:45",
          kind: "exercise",
          exerciseId: "ex-1",
          targetSets: 3,
          targetReps: 10,
          status: "planned",
          createdBy: "physio-1",
          createdAt: "2026-10-10T00:00:00Z",
          updatedAt: "2026-10-10T00:00:00Z",
        },
      ];

      const { copiedEntries, conflictCount } = copyWeekEntries(
        "2026-10-12",
        "2026-10-19",
        "p-1",
        existing,
        "physio-1"
      );

      expect(conflictCount).toBe(0);
      expect(copiedEntries).toHaveLength(1);
      expect(copiedEntries[0]?.scheduledDate).toBe("2026-10-19");
      expect(copiedEntries[0]?.startTime).toBe("09:00");
      expect(copiedEntries[0]?.targetSets).toBe(3);
    });
  });
});
