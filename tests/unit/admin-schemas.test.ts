import { describe, it, expect } from "vitest";
import {
  createUserSchema,
  deleteUserConfirmSchema,
  patientFormSchema,
  physioNoteSchema,
  exerciseFormSchema,
  banTargetSchema,
  systemSettingsFormSchema,
} from "@/lib/schemas/admin";

describe("Admin Phase 1 Zod Schemas Validation", () => {
  describe("createUserSchema", () => {
    it("accepts valid director and physio inputs", () => {
      const valid = {
        username: "physio.somchai",
        displayName: "สมชาย รักษาดี",
        role: "physio",
        initialPassword: "Password1234!",
        forcePasswordChange: true,
      };
      expect(createUserSchema.safeParse(valid).success).toBe(true);
    });

    it("rejects invalid username with uppercase or special characters", () => {
      const invalid = {
        username: "Physio_SOMCHAI@!",
        displayName: "สมชาย",
        role: "physio",
        initialPassword: "Password1234!",
      };
      expect(createUserSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("deleteUserConfirmSchema", () => {
    it("passes when confirmedUsername matches targetUsername exactly", () => {
      const valid = {
        targetUserId: "usr-123",
        targetUsername: "patient.somchai",
        confirmedUsername: "patient.somchai",
      };
      expect(deleteUserConfirmSchema.safeParse(valid).success).toBe(true);
    });

    it("fails when confirmedUsername does not match", () => {
      const invalid = {
        targetUserId: "usr-123",
        targetUsername: "patient.somchai",
        confirmedUsername: "wrong_username",
      };
      expect(deleteUserConfirmSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe("patientFormSchema", () => {
    it("validates complete patient clinical record", () => {
      const valid = {
        firstName: "สมพร",
        lastName: "มณีรัตน์",
        gender: "female",
        birthDate: "1958-05-12",
        phone: "081-234-5678",
        medicalHistory: "ความดันโลหิตสูง ควบคุมได้",
        injuryDetails: "ไหล่ติดข้างขวา ขยับได้จำกัด",
        responsiblePhysioId: "physio-001",
      };
      expect(patientFormSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe("exerciseFormSchema", () => {
    it("validates exercise definition with analysisConfig as null in Phase 1", () => {
      const valid = {
        name: "กางแขนด้านข้าง (Shoulder Abduction)",
        summary: "เพิ่มองศาการเคลื่อนไหวของข้อไหล่",
        steps: ["ยืนตรงหรือนั่งหลังตรง", "ค่อยๆ ยกแขนขึ้นด้านข้าง", "ค้างไว้ 1 วินาทีแล้วเอาลง"],
        targetMuscles: ["Deltoid", "Supraspinatus"],
        recoveryPhase: "subacute",
        targetSets: 3,
        targetReps: 10,
        difficultyLevel: "medium",
        analysisConfig: null,
      };
      expect(exerciseFormSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe("banTargetSchema", () => {
    it("validates temporary and permanent bans", () => {
      const tempBan = {
        kind: "ip",
        value: "203.0.113.5",
        reason: "พยายามล็อกอินผิดปกติซ้ำซ้อน",
        durationHours: 24,
      };
      expect(banTargetSchema.safeParse(tempBan).success).toBe(true);

      const permBan = {
        kind: "device",
        value: "KIOSK-DEV-99",
        reason: "อุปกรณ์สูญหายหรือถูกดัดแปลง",
        durationHours: null,
      };
      expect(banTargetSchema.safeParse(permBan).success).toBe(true);
    });
  });

  describe("systemSettingsFormSchema", () => {
    it("validates kiosk timeout between 30 and 60 seconds", () => {
      const valid = {
        kioskIdleTimeoutSeconds: 45,
        kioskWarningSeconds: 10,
        physioScope: "all",
      };
      expect(systemSettingsFormSchema.safeParse(valid).success).toBe(true);

      const invalidLow = {
        kioskIdleTimeoutSeconds: 20, // Lower than 30
      };
      expect(systemSettingsFormSchema.safeParse(invalidLow).success).toBe(false);

      const invalidHigh = {
        kioskIdleTimeoutSeconds: 90, // Higher than 60
      };
      expect(systemSettingsFormSchema.safeParse(invalidHigh).success).toBe(false);
    });
  });

  describe("physioNoteSchema", () => {
    it("validates clinical note content", () => {
      const valid = {
        patientId: "11111111-1111-4111-8111-111111111111",
        note: "คนไข้มีอาการดีขึ้น ยกแขนได้ 80 องศาโดยไม่เจ็บ",
      };
      expect(physioNoteSchema.safeParse(valid).success).toBe(true);

      const invalidShort = {
        patientId: "11111111-1111-4111-8111-111111111111",
        note: "",
      };
      expect(physioNoteSchema.safeParse(invalidShort).success).toBe(false);
    });
  });
});