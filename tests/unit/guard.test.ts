import { describe, it, expect } from "vitest";
import {
  guardAdminAccess,
  guardDirectorOnly,
  guardPatientAccess,
  guardDeleteUser,
  guardBanTarget,
  GuardError,
  type AuthenticatedStaff,
} from "@/lib/auth/guard";

describe("Server-Side Guard Security Layer 2 (guard.ts)", () => {
  const directorActor: AuthenticatedStaff = {
    userId: "d0000000-0000-0000-0000-000000000001",
    username: "director.admin",
    role: "director",
    displayName: "ผู้อำนวยการโรงพยาบาล",
    deviceId: "KIOSK-DEV-01",
    ip: "192.168.1.100",
  };

  const physioActor: AuthenticatedStaff = {
    userId: "p0000000-0000-0000-0000-000000000001",
    username: "physio.somchai",
    role: "physio",
    displayName: "กภ. สมชาย",
    deviceId: "KIOSK-DEV-02",
    ip: "192.168.1.101",
  };

  describe("guardAdminAccess & guardDirectorOnly", () => {
    it("allows director and physio to admin access", () => {
      expect(() => guardAdminAccess(directorActor)).not.toThrow();
      expect(() => guardAdminAccess(physioActor)).not.toThrow();
    });

    it("throws 401 when actor is null", () => {
      expect(() => guardAdminAccess(null)).toThrow(GuardError);
    });

    it("allows director to director-only endpoints", () => {
      expect(() => guardDirectorOnly(directorActor)).not.toThrow();
    });

    it("strictly blocks physio from director-only endpoints with 403", () => {
      expect(() => guardDirectorOnly(physioActor)).toThrowError(
        /ต้องใช้สิทธิ์ผู้อำนวยการโรงพยาบาลเท่านั้น/
      );
    });
  });

  describe("guardDeleteUser safeguards", () => {
    it("prevents self-deletion for any actor", () => {
      expect(() =>
        guardDeleteUser(directorActor, directorActor.userId, "director", 2)
      ).toThrowError(/ห้ามลบบัญชีของตนเอง/);

      expect(() =>
        guardDeleteUser(physioActor, physioActor.userId, "physio", 2)
      ).toThrowError(/ห้ามลบบัญชีของตนเอง/);
    });

    it("prevents deleting the last director", () => {
      expect(() =>
        guardDeleteUser(directorActor, "d0000000-0000-0000-0000-000000000002", "director", 1)
      ).toThrowError(/ห้ามลบผู้อำนวยการคนสุดท้ายของระบบ/);
    });

    it("allows deleting director when more than 1 director exist", () => {
      expect(() =>
        guardDeleteUser(directorActor, "d0000000-0000-0000-0000-000000000002", "director", 2)
      ).not.toThrow();
    });

    it("blocks physio from deleting staff accounts", () => {
      expect(() =>
        guardDeleteUser(physioActor, "p0000000-0000-0000-0000-000000000002", "physio", 2)
      ).toThrowError(/นักกายภาพสามารถลบได้เฉพาะบัญชีคนไข้เท่านั้น/);
    });
  });

  describe("guardBanTarget safeguards", () => {
    it("prevents director from banning own active device", () => {
      expect(() =>
        guardBanTarget(directorActor, "KIOSK-DEV-01", "device")
      ).toThrowError(/ห้ามแบนเครื่องที่ตนเองกำลังใช้งานอยู่/);
    });

    it("prevents director from banning own active IP", () => {
      expect(() =>
        guardBanTarget(directorActor, "192.168.1.100", "ip")
      ).toThrowError(/ห้ามแบน IP ที่ตนเองกำลังใช้งานอยู่/);
    });

    it("allows banning other device/IP", () => {
      expect(() =>
        guardBanTarget(directorActor, "KIOSK-ATTACKER-99", "device")
      ).not.toThrow();

      expect(() =>
        guardBanTarget(directorActor, "10.0.0.99", "ip")
      ).not.toThrow();
    });

    it("blocks physio from banning anything", () => {
      expect(() =>
        guardBanTarget(physioActor, "10.0.0.99", "ip")
      ).toThrowError(/ต้องใช้สิทธิ์ผู้อำนวยการโรงพยาบาลเท่านั้น/);
    });
  });

  describe("guardPatientAccess", () => {
    it("allows director to access all patients", () => {
      expect(() => guardPatientAccess(directorActor, "any-physio-id", "own")).not.toThrow();
    });

    it("allows physio when scope is 'all'", () => {
      expect(() => guardPatientAccess(physioActor, "other-physio-id", "all")).not.toThrow();
    });

    it("blocks physio when scope is 'own' and patient is assigned to someone else", () => {
      expect(() =>
        guardPatientAccess(physioActor, "other-physio-id", "own")
      ).toThrowError(/ไม่มีสิทธิ์เข้าถึงข้อมูลคนไข้นอกความรับผิดชอบ/);
    });

    it("allows physio when scope is 'own' and patient is assigned to self", () => {
      expect(() =>
        guardPatientAccess(physioActor, physioActor.userId, "own")
      ).not.toThrow();
    });
  });
});
