import { describe, it, expect } from "vitest";
import {
  canAccessAdmin,
  getAccessibleAdminMenus,
  canPhysioAccessPatient,
  canViewPatient,
  canEditPatient,
  canCreateAccount,
  canEditUser,
  canDeleteAccount,
  canManageContentItem,
  canBanTarget,
  canManageSystemSettings,
  canManageAuditAndBans,
  type AppRole,
  type PhysioScope,
} from "@/lib/rbac";

describe("Table-Driven RBAC Permission Matrix (Section 1.2)", () => {
  // 1. ตรวจสอบการเข้าถึง /admin (3 บทบาท)
  describe("Resource: /admin access", () => {
    const adminAccessCases: Array<{ role: AppRole; expected: boolean }> = [
      { role: "director", expected: true },
      { role: "physio", expected: true },
      { role: "patient", expected: false },
    ];

    adminAccessCases.forEach(({ role, expected }) => {
      it(`role '${role}' access to /admin should be ${expected}`, () => {
        expect(canAccessAdmin(role)).toBe(expected);
      });
    });
  });

  // 2. ตรวจสอบเมนูแอดมิน (ผอ.รพ. 9 เมนู, นักกายภาพ 7 เมนู, คนไข้ 0)
  describe("Resource: Admin Menus Visibility", () => {
    const menuCases = [
      {
        role: "director" as const,
        shouldInclude: ["overview", "users", "patients", "physios", "exercises", "schedule", "symptoms", "audit", "settings"],
        shouldExclude: [],
      },
      {
        role: "physio" as const,
        shouldInclude: ["overview", "users", "patients", "physios", "exercises", "schedule", "symptoms"],
        shouldExclude: ["audit", "settings"], // สเปกข้อ 1.2: ไม่เห็นประวัติการใช้งานและตั้งค่าระบบเลย
      },
      {
        role: "patient" as const,
        shouldInclude: [],
        shouldExclude: ["overview", "users", "patients", "physios", "exercises", "schedule", "symptoms", "audit", "settings"],
      },
    ];

    menuCases.forEach(({ role, shouldInclude, shouldExclude }) => {
      it(`role '${role}' should have exact accessible menus`, () => {
        const accessible = getAccessibleAdminMenus(role);
        shouldInclude.forEach((m) => expect(accessible).toContain(m));
        shouldExclude.forEach((m) => expect(accessible).not.toContain(m));
      });
    });
  });

  // 3. จัดการผู้ใช้งาน: เพิ่มบัญชี (3 บทบาท × 3 ชนิดบัญชีเป้าหมาย)
  describe("Resource: Account Creation Matrix (canCreateAccount)", () => {
    const createAccountCases: Array<{
      actorRole: AppRole;
      targetRole: AppRole;
      expected: boolean;
      description: string;
    }> = [
      { actorRole: "director", targetRole: "director", expected: true, description: "director can create director" },
      { actorRole: "director", targetRole: "physio", expected: true, description: "director can create physio" },
      { actorRole: "director", targetRole: "patient", expected: true, description: "director can create patient" },
      { actorRole: "physio", targetRole: "director", expected: false, description: "physio CANNOT create director" },
      { actorRole: "physio", targetRole: "physio", expected: false, description: "physio CANNOT create physio" },
      { actorRole: "physio", targetRole: "patient", expected: true, description: "physio CAN ONLY create patient" },
      { actorRole: "patient", targetRole: "director", expected: false, description: "patient CANNOT create director" },
      { actorRole: "patient", targetRole: "physio", expected: false, description: "patient CANNOT create physio" },
      { actorRole: "patient", targetRole: "patient", expected: false, description: "patient CANNOT create patient" },
    ];

    createAccountCases.forEach(({ actorRole, targetRole, expected, description }) => {
      it(description, () => {
        expect(canCreateAccount(actorRole, targetRole)).toBe(expected);
      });
    });
  });

  // 3.1 แก้ไขข้อมูลผู้ใช้และรีเซ็ตรหัสผ่าน (canEditUser)
  describe("Resource: User Editing Matrix (canEditUser)", () => {
    it("allows director to edit any user", () => {
      const ctx = { actorId: "dir-1", actorRole: "director" as const, targetUserId: "physio-1" };
      expect(canEditUser(ctx, "physio")).toBe(true);
    });

    it("allows physio to edit self", () => {
      const ctx = { actorId: "physio-1", actorRole: "physio" as const, targetUserId: "physio-1" };
      expect(canEditUser(ctx, "physio")).toBe(true);
    });

    it("allows physio to edit patient in scope and denies other physio", () => {
      const ctxPatient = {
        actorId: "physio-1",
        actorRole: "physio" as const,
        targetUserId: "pat-1",
        physioScope: "all" as const,
      };
      expect(canEditUser(ctxPatient, "patient")).toBe(true);

      const ctxOtherPhysio = {
        actorId: "physio-1",
        actorRole: "physio" as const,
        targetUserId: "physio-2",
      };
      expect(canEditUser(ctxOtherPhysio, "physio")).toBe(false);
    });

    it("verifies canPhysioAccessPatient standalone helper directly", () => {
      expect(canPhysioAccessPatient("p1", "all", "p2")).toBe(true);
      expect(canPhysioAccessPatient("p1", "own", "p1")).toBe(true);
      expect(canPhysioAccessPatient("p1", "own", "p2")).toBe(false);
    });
  });

  // 4. ข้อมูลคนไข้: ดูและแก้ไข ตาม physio_scope ('all' และ 'own')
  describe("Resource: Patients Access Matrix with physio_scope (all vs own)", () => {
    const patientAccessCases: Array<{
      actorRole: AppRole;
      actorId: string;
      physioScope: PhysioScope;
      responsiblePhysioId?: string | undefined;
      targetPatientId: string;
      canView: boolean;
      canEdit: boolean;
      description: string;
    }> = [
      // ผอ.รพ. เข้าถึงคนไข้ได้ทั้งหมดเสมอ
      {
        actorRole: "director",
        actorId: "dir-1",
        physioScope: "own",
        responsiblePhysioId: "physio-other",
        targetPatientId: "pat-1",
        canView: true,
        canEdit: true,
        description: "director can view and edit any patient regardless of scope or responsible physio",
      },
      // นักกายภาพ: scope = 'all' เข้าถึงคนไข้ทุกคนได้
      {
        actorRole: "physio",
        actorId: "physio-1",
        physioScope: "all",
        responsiblePhysioId: "physio-2",
        targetPatientId: "pat-1",
        canView: true,
        canEdit: true,
        description: "physio with scope='all' can view and edit patient of another physio",
      },
      // นักกายภาพ: scope = 'own' เข้าถึงได้เฉพาะคนไข้ที่ตนดูแล
      {
        actorRole: "physio",
        actorId: "physio-1",
        physioScope: "own",
        responsiblePhysioId: "physio-1",
        targetPatientId: "pat-1",
        canView: true,
        canEdit: true,
        description: "physio with scope='own' CAN view and edit own patient",
      },
      {
        actorRole: "physio",
        actorId: "physio-1",
        physioScope: "own",
        responsiblePhysioId: "physio-2",
        targetPatientId: "pat-2",
        canView: false,
        canEdit: false,
        description: "physio with scope='own' CANNOT view or edit patient assigned to another physio",
      },
      {
        actorRole: "physio",
        actorId: "physio-1",
        physioScope: "own",
        responsiblePhysioId: undefined,
        targetPatientId: "pat-unassigned",
        canView: false,
        canEdit: false,
        description: "physio with scope='own' CANNOT view unassigned patient",
      },
      // คนไข้: ดูได้เฉพาะของตัวเอง ห้ามแก้ไข
      {
        actorRole: "patient",
        actorId: "pat-1",
        physioScope: "all",
        targetPatientId: "pat-1",
        canView: true,
        canEdit: false,
        description: "patient can view own profile but cannot edit",
      },
      {
        actorRole: "patient",
        actorId: "pat-1",
        physioScope: "all",
        targetPatientId: "pat-2",
        canView: false,
        canEdit: false,
        description: "patient CANNOT view other patient profile",
      },
    ];

    patientAccessCases.forEach(({ actorRole, actorId, physioScope, responsiblePhysioId, targetPatientId, canView, canEdit, description }) => {
      it(description, () => {
        const ctx = {
          actorRole,
          actorId,
          physioScope,
          responsiblePhysioId,
          targetPatientId,
        };
        expect(canViewPatient(ctx)).toBe(canView);
        expect(canEditPatient(ctx)).toBe(canEdit);
      });
    });
  });

  // 5. ท่ากายภาพและโจทย์มินิเกม: กฎ created_by
  describe("Resource: Exercises and Quizzes (created_by Ownership)", () => {
    const contentCases: Array<{
      actorRole: AppRole;
      actorId: string;
      creatorId?: string | undefined;
      expected: boolean;
      description: string;
    }> = [
      { actorRole: "director", actorId: "dir-1", creatorId: "physio-1", expected: true, description: "director can manage content created by physio" },
      { actorRole: "director", actorId: "dir-1", creatorId: "dir-2", expected: true, description: "director can manage content created by another director" },
      { actorRole: "director", actorId: "dir-1", creatorId: undefined, expected: true, description: "director can manage system content without creator" },
      { actorRole: "physio", actorId: "physio-1", creatorId: "physio-1", expected: true, description: "physio CAN manage content created by self" },
      { actorRole: "physio", actorId: "physio-1", creatorId: "physio-2", expected: false, description: "physio CANNOT manage content created by another physio" },
      { actorRole: "physio", actorId: "physio-1", creatorId: "dir-1", expected: false, description: "physio CANNOT manage content created by director" },
      { actorRole: "patient", actorId: "pat-1", creatorId: "pat-1", expected: false, description: "patient cannot manage content" },
    ];

    contentCases.forEach(({ actorRole, actorId, creatorId, expected, description }) => {
      it(description, () => {
        expect(canManageContentItem(actorRole, actorId, creatorId)).toBe(expected);
      });
    });
  });

  // 6. กฎกันพลาด: การลบบัญชี (canDeleteAccount)
  describe("Resource: Account Deletion Safeguards", () => {
    const deletionCases: Array<{
      actorRole: AppRole;
      actorId: string;
      targetUserId: string;
      targetUserRole: AppRole;
      totalDirectorCount?: number | undefined;
      physioScope?: PhysioScope | undefined;
      responsiblePhysioId?: string | undefined;
      expectedAllowed: boolean;
      expectedReasonPattern?: string;
      description: string;
    }> = [
      // ห้ามลบบัญชีตัวเอง
      {
        actorRole: "director",
        actorId: "user-1",
        targetUserId: "user-1",
        targetUserRole: "director",
        expectedAllowed: false,
        expectedReasonPattern: "ตนเอง",
        description: "director cannot delete own account",
      },
      {
        actorRole: "physio",
        actorId: "physio-1",
        targetUserId: "physio-1",
        targetUserRole: "physio",
        expectedAllowed: false,
        expectedReasonPattern: "ตนเอง",
        description: "physio cannot delete own account",
      },
      // ห้ามลบผู้อำนวยการคนสุดท้าย
      {
        actorRole: "director",
        actorId: "dir-1",
        targetUserId: "dir-2",
        targetUserRole: "director",
        totalDirectorCount: 1,
        expectedAllowed: false,
        expectedReasonPattern: "ผู้อำนวยการคนสุดท้าย",
        description: "cannot delete the last director when count is 1",
      },
      {
        actorRole: "director",
        actorId: "dir-1",
        targetUserId: "dir-2",
        targetUserRole: "director",
        totalDirectorCount: 2,
        expectedAllowed: true,
        description: "can delete director when multiple directors exist",
      },
      // นักกายภาพลบได้เฉพาะคนไข้เท่านั้น
      {
        actorRole: "physio",
        actorId: "physio-1",
        targetUserId: "dir-1",
        targetUserRole: "director",
        expectedAllowed: false,
        description: "physio CANNOT delete director",
      },
      {
        actorRole: "physio",
        actorId: "physio-1",
        targetUserId: "physio-2",
        targetUserRole: "physio",
        expectedAllowed: false,
        description: "physio CANNOT delete another physio",
      },
      {
        actorRole: "physio",
        actorId: "physio-1",
        targetUserId: "pat-1",
        targetUserRole: "patient",
        physioScope: "all",
        expectedAllowed: true,
        description: "physio can delete patient when scope is all",
      },
      {
        actorRole: "physio",
        actorId: "physio-1",
        targetUserId: "pat-2",
        targetUserRole: "patient",
        physioScope: "own",
        responsiblePhysioId: "physio-2",
        expectedAllowed: false,
        description: "physio CANNOT delete patient assigned to another physio when scope is own",
      },
    ];

    deletionCases.forEach(({ actorRole, actorId, targetUserId, targetUserRole, totalDirectorCount, physioScope, responsiblePhysioId, expectedAllowed, expectedReasonPattern, description }) => {
      it(description, () => {
        const ctx = {
          actorRole,
          actorId,
          targetUserId,
          totalDirectorCount,
          physioScope,
          responsiblePhysioId,
        };
        const result = canDeleteAccount(ctx, targetUserRole);
        expect(result.allowed).toBe(expectedAllowed);
        if (expectedReasonPattern && result.reason) {
          expect(result.reason).toContain(expectedReasonPattern);
        }
      });
    });
  });

  // 7. กฎกันพลาด: การแบนเครื่องและ IP (canBanTarget)
  describe("Resource: Banning Safeguards", () => {
    const banCases: Array<{
      actorRole: AppRole;
      currentKioskOrDeviceId?: string | undefined;
      currentIp?: string | undefined;
      targetValue: string;
      kind: "device" | "ip";
      expectedAllowed: boolean;
      expectedReasonPattern?: string;
      description: string;
    }> = [
      {
        actorRole: "director",
        currentKioskOrDeviceId: "kiosk-active-1",
        targetValue: "kiosk-active-1",
        kind: "device",
        expectedAllowed: false,
        expectedReasonPattern: "เครื่องที่ตนเองกำลังใช้งาน",
        description: "director cannot ban own active device",
      },
      {
        actorRole: "director",
        currentIp: "192.168.1.50",
        targetValue: "192.168.1.50",
        kind: "ip",
        expectedAllowed: false,
        expectedReasonPattern: "IP ที่ตนเองกำลังใช้งาน",
        description: "director cannot ban own active IP",
      },
      {
        actorRole: "director",
        currentKioskOrDeviceId: "kiosk-active-1",
        targetValue: "kiosk-other",
        kind: "device",
        expectedAllowed: true,
        description: "director can ban another device",
      },
      {
        actorRole: "director",
        currentIp: "192.168.1.50",
        targetValue: "192.168.1.99",
        kind: "ip",
        expectedAllowed: true,
        description: "director can ban another IP",
      },
      {
        actorRole: "physio",
        targetValue: "192.168.1.99",
        kind: "ip",
        expectedAllowed: false,
        description: "physio CANNOT ban IP",
      },
      {
        actorRole: "patient",
        targetValue: "kiosk-1",
        kind: "device",
        expectedAllowed: false,
        description: "patient CANNOT ban device",
      },
    ];

    banCases.forEach(({ actorRole, currentKioskOrDeviceId, currentIp, targetValue, kind, expectedAllowed, expectedReasonPattern, description }) => {
      it(description, () => {
        const ctx = {
          actorId: "actor-1",
          actorRole,
          currentKioskOrDeviceId,
          currentIp,
        };
        const result = canBanTarget(ctx, targetValue, kind);
        expect(result.allowed).toBe(expectedAllowed);
        if (expectedReasonPattern && result.reason) {
          expect(result.reason).toContain(expectedReasonPattern);
        }
      });
    });
  });

  // 8. การตั้งค่าระบบ และการดู Audit/เตะเซสชัน
  describe("Resource: Settings and Audit Management", () => {
    const roles: AppRole[] = ["director", "physio", "patient"];

    roles.forEach((role) => {
      it(`role '${role}' permission for system settings and audit`, () => {
        const isDirector = role === "director";
        expect(canManageSystemSettings(role)).toBe(isDirector);
        expect(canManageAuditAndBans(role)).toBe(isDirector);
      });
    });
  });
});
