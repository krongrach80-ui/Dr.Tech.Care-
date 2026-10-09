/**
 * src/lib/auth/guard.ts
 * Dr.Tech.Care — Server Guard (ชั้นที่ 2 ของระบบรักษาความปลอดภัย 3 ชั้น)
 * UI ซ่อน -> server guard() -> DB RLS
 */

import type { AppRole, PhysioScope } from "@/lib/rbac";
import {
  canPhysioAccessPatient,
  canDeleteAccount,
  canBanTarget,
  type RbacContext,
} from "@/lib/rbac";

export class GuardError extends Error {
  public readonly statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = "GuardError";
    this.statusCode = statusCode;
  }
}

export interface AuthenticatedStaff {
  userId: string;
  username: string;
  role: "director" | "physio";
  displayName: string;
  kioskId?: string;
  deviceId?: string;
  ip?: string;
}

/**
 * ตรวจสอบสิทธิ์การเข้าถึง /admin ทั่วไป (ต้องเป็น director หรือ physio)
 */
export function guardAdminAccess(actor: AuthenticatedStaff | null): void {
  if (!actor) {
    throw new GuardError("กรุณาเข้าสู่ระบบก่อนเข้าใช้งาน", 401);
  }
  if (actor.role !== "director" && actor.role !== "physio") {
    throw new GuardError("ไม่มีสิทธิ์เข้าถึงส่วนผู้ดูแลระบบ (403 Forbidden)", 403);
  }
}

/**
 * ตรวจสอบสิทธิ์เฉพาะผู้อำนวยการ (Director-Only)
 * สำหรับหน้า /admin/audit และ /admin/settings รวมถึง API ที่เกี่ยวข้อง
 * นักกายภาพและคนไข้จะได้รับ 403 ทันที
 */
export function guardDirectorOnly(actor: AuthenticatedStaff | null): void {
  guardAdminAccess(actor);
  if (actor?.role !== "director") {
    throw new GuardError("ต้องใช้สิทธิ์ผู้อำนวยการโรงพยาบาลเท่านั้น (403 Forbidden)", 403);
  }
}

/**
 * ตรวจสอบสิทธิ์การเข้าถึงข้อมูลคนไข้ตามนโยบาย physio_scope
 */
export function guardPatientAccess(
  actor: AuthenticatedStaff,
  patientPhysioId: string | undefined,
  scope: PhysioScope = "all"
): void {
  guardAdminAccess(actor);
  if (actor.role === "director") return;

  if (actor.role === "physio") {
    const allowed = canPhysioAccessPatient(actor.userId, scope, patientPhysioId);
    if (!allowed) {
      throw new GuardError("ไม่มีสิทธิ์เข้าถึงข้อมูลคนไข้นอกความรับผิดชอบ", 403);
    }
  }
}

/**
 * ตรวจสอบสิทธิ์การลบบัญชีผู้ใช้งาน พร้อมกฎกันพลาด (Safeguards)
 */
export function guardDeleteUser(
  actor: AuthenticatedStaff,
  targetUserId: string,
  targetRole: AppRole,
  totalDirectors = 1,
  responsiblePhysioId?: string,
  physioScope: PhysioScope = "all"
): void {
  guardAdminAccess(actor);

  const ctx: RbacContext = {
    actorId: actor.userId,
    actorRole: actor.role,
    targetUserId,
    totalDirectorCount: totalDirectors,
    responsiblePhysioId,
    physioScope,
  };

  const check = canDeleteAccount(ctx, targetRole);
  if (!check.allowed) {
    throw new GuardError(check.reason ?? "ไม่มีสิทธิ์ลบบัญชีผู้ใช้นี้", 403);
  }
}

/**
 * ตรวจสอบสิทธิ์การแบนเครื่องหรือ IP พร้อมกฎกันพลาด (ห้ามแบนเครื่อง/IP ตนเอง)
 */
export function guardBanTarget(
  actor: AuthenticatedStaff,
  targetValue: string,
  kind: "device" | "ip"
): void {
  guardDirectorOnly(actor);

  const ctx: RbacContext = {
    actorId: actor.userId,
    actorRole: actor.role,
    currentKioskOrDeviceId: actor.deviceId,
    currentIp: actor.ip,
  };

  const check = canBanTarget(ctx, targetValue, kind);
  if (!check.allowed) {
    throw new GuardError(check.reason ?? "ไม่สามารถดำเนินการแบนเป้าหมายนี้ได้", 403);
  }
}
