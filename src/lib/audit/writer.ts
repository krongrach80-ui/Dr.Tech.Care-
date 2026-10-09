/**
 * src/lib/audit/writer.ts
 * Dr.Tech.Care — ระบบบันทึก Audit Log พร้อม Cryptographic Hash Chain (SHA-256)
 * อ้างอิงตาม Master Prompt ข้อ 5.5 และ supabase/migrations/0005_audit.sql
 */

import { createHash } from "node:crypto";
import type { AppRole } from "@/lib/rbac";

export type AuditCategory = "auth" | "data" | "security" | "system";
export type AuditOutcome = "success" | "failure" | "denied";

export interface AuditEntryInput {
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;
  actorId?: string | null | undefined;
  actorRole?: AppRole | null | undefined;
  actorLabel?: string | null | undefined;
  targetTable?: string | null | undefined;
  targetId?: string | null | undefined;
  changes?: Record<string, unknown> | null | undefined;
  kioskId?: string | null | undefined;
  deviceId?: string | null | undefined;
  ip?: string | null | undefined;
  userAgent?: string | null | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export interface AuditLogRecord {
  id: number;
  occurredAt: string;
  category: AuditCategory;
  action: string;
  outcome: AuditOutcome;
  actorId: string | null;
  actorRole: AppRole | null;
  actorLabel: string | null;
  targetTable: string | null;
  targetId: string | null;
  changes: Record<string, unknown> | null;
  kioskId: string | null;
  deviceId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown>;
  prevHash: string | null;
  rowHash: string;
}

// In-memory fallback chain สำหรับ Local Dev & State Persistence
const localAuditChain: AuditLogRecord[] = [];
let nextLogId = 1;

/**
 * คำนวณ SHA-256 Hash สำหรับแถว Audit Log
 * ตรงตามสูตรใน 0005_audit.sql ทุกประการ:
 * v_payload := coalesce(prev_hash, '') || category || '|' || action || '|' || outcome || '|' ||
 *              coalesce(actor_id, '') || '|' || coalesce(target_table, '') || '|' ||
 *              coalesce(target_id, '') || '|' || coalesce(changes, '{}') || '|' ||
 *              coalesce(metadata, '{}');
 */
export function computeAuditPayloadString(
  prevHash: string | null,
  category: string,
  action: string,
  outcome: string,
  actorId: string | null | undefined,
  targetTable: string | null | undefined,
  targetId: string | null | undefined,
  changes: Record<string, unknown> | null | undefined,
  metadata: Record<string, unknown> | undefined
): string {
  const changesStr = changes ? JSON.stringify(changes) : "{}";
  const metaStr = metadata ? JSON.stringify(metadata) : "{}";

  return (
    (prevHash ?? "") +
    category +
    "|" +
    action +
    "|" +
    outcome +
    "|" +
    (actorId ?? "") +
    "|" +
    (targetTable ?? "") +
    "|" +
    (targetId ?? "") +
    "|" +
    changesStr +
    "|" +
    metaStr
  );
}

export function computeAuditRowHash(
  prevHash: string | null,
  entry: {
    category: string;
    action: string;
    outcome: string;
    actorId?: string | null | undefined;
    targetTable?: string | null | undefined;
    targetId?: string | null | undefined;
    changes?: Record<string, unknown> | null | undefined;
    metadata?: Record<string, unknown> | undefined;
  }
): string {
  const payload = computeAuditPayloadString(
    prevHash,
    entry.category,
    entry.action,
    entry.outcome,
    entry.actorId,
    entry.targetTable,
    entry.targetId,
    entry.changes,
    entry.metadata
  );

  return createHash("sha256").update(payload, "utf8").digest("hex");
}

/**
 * บันทึก Audit Log แถวใหม่เข้าสู่ Hash Chain
 */
export async function writeAudit(input: AuditEntryInput): Promise<AuditLogRecord> {
  const lastRecord = localAuditChain[localAuditChain.length - 1];
  const prevHash = lastRecord ? lastRecord.rowHash : null;

  const rowHash = computeAuditRowHash(prevHash, {
    category: input.category,
    action: input.action,
    outcome: input.outcome,
    actorId: input.actorId,
    targetTable: input.targetTable,
    targetId: input.targetId,
    changes: input.changes,
    metadata: input.metadata,
  });

  const record: AuditLogRecord = {
    id: nextLogId++,
    occurredAt: new Date().toISOString(),
    category: input.category,
    action: input.action,
    outcome: input.outcome,
    actorId: input.actorId ?? null,
    actorRole: input.actorRole ?? null,
    actorLabel: input.actorLabel ?? null,
    targetTable: input.targetTable ?? null,
    targetId: input.targetId ?? null,
    changes: input.changes ?? null,
    kioskId: input.kioskId ?? null,
    deviceId: input.deviceId ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    metadata: input.metadata ?? {},
    prevHash,
    rowHash,
  };

  localAuditChain.push(record);
  return record;
}

/**
 * ดึงรายการ Audit Logs ทั้งหมดที่บันทึกไว้
 */
export function getLocalAuditLogs(): AuditLogRecord[] {
  return [...localAuditChain];
}

/**
 * ตรวจสอบความถูกต้องสมบูรณ์ของ Hash Chain (Verify Chain)
 * ตรวจจับการแก้ไขแถว การลบแถว หรือการดัดแปลงข้อมูลย้อนหลัง
 */
export function verifyAuditHashChain(logs: AuditLogRecord[]): {
  isValid: boolean;
  brokenLogId: number | null;
  message: string;
} {
  let expectedPrevHash: string | null = null;

  for (let i = 0; i < logs.length; i++) {
    const log = logs[i];
    if (!log) continue;

    // ตรวจสอบความต่อเนื่องของ Prev Hash
    if (i > 0 && log.prevHash !== expectedPrevHash) {
      return {
        isValid: false,
        brokenLogId: log.id,
        message: `สายโซ่ถูกทำลาย: prev_hash ของ log id ${log.id} ไม่ตรงกับ row_hash ก่อนหน้า`,
      };
    }

    // คำนวณ Hash ใหม่จากข้อมูล payload ในแถว
    const recalculated = computeAuditRowHash(log.prevHash, {
      category: log.category,
      action: log.action,
      outcome: log.outcome,
      actorId: log.actorId,
      targetTable: log.targetTable,
      targetId: log.targetId,
      changes: log.changes,
      metadata: log.metadata,
    });

    if (log.rowHash !== recalculated) {
      return {
        isValid: false,
        brokenLogId: log.id,
        message: `ข้อมูลถูกแก้ไขด้วยมือ: row_hash ของ log id ${log.id} ไม่ตรงกับค่าคำนวณจริง`,
      };
    }

    expectedPrevHash = log.rowHash;
  }

  return {
    isValid: true,
    brokenLogId: null,
    message: "สายโซ่ Audit Log ถูกต้องสมบูรณ์ ไม่พบการปลอมแปลงหรือลบข้อมูล",
  };
}
