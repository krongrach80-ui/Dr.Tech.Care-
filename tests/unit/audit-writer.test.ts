import { describe, it, expect } from "vitest";
import {
  writeAudit,
  verifyAuditHashChain,
  type AuditLogRecord,
} from "@/lib/audit/writer";

describe("Cryptographic Audit Log Hash Chain (Section 5.5)", () => {
  it("creates valid sequential chain and verifies integrity", async () => {
    const log1 = await writeAudit({
      category: "auth",
      action: "staff_login",
      outcome: "success",
      actorId: "d0000000-0000-0000-0000-000000000001",
      actorRole: "director",
      actorLabel: "ผู้อำนวยการ",
      ip: "192.168.1.10",
    });

    const log2 = await writeAudit({
      category: "data",
      action: "create_user",
      outcome: "success",
      actorId: "d0000000-0000-0000-0000-000000000001",
      actorRole: "director",
      targetTable: "profiles",
      targetId: "p0000000-0000-0000-0000-000000000001",
      changes: { username: "physio.somchai", role: "physio" },
    });

    expect(log1.prevHash).toBeNull();
    expect(log2.prevHash).toBe(log1.rowHash);

    const verification = verifyAuditHashChain([log1, log2]);
    expect(verification.isValid).toBe(true);
    expect(verification.brokenLogId).toBeNull();
  });

  it("detects manual tampering of log payload", async () => {
    const log1 = await writeAudit({
      category: "security",
      action: "ban_ip",
      outcome: "success",
      actorId: "d0000000-0000-0000-0000-000000000001",
      targetId: "192.168.1.99",
    });

    // จำลองการแก้ไขข้อมูลแถวด้วยมือ
    const tamperedLog: AuditLogRecord = {
      ...log1,
      targetId: "192.168.1.100", // เปลี่ยน IP ที่แบน
    };

    const verification = verifyAuditHashChain([tamperedLog]);
    expect(verification.isValid).toBe(false);
    expect(verification.brokenLogId).toBe(tamperedLog.id);
    expect(verification.message).toContain("ข้อมูลถูกแก้ไขด้วยมือ");
  });

  it("detects broken chain link when prev_hash is mismatched", async () => {
    const log1 = await writeAudit({
      category: "system",
      action: "update_settings",
      outcome: "success",
      changes: { kioskIdleTimeoutSeconds: 45 },
    });

    const log2 = await writeAudit({
      category: "system",
      action: "update_settings",
      outcome: "success",
      changes: { kioskIdleTimeoutSeconds: 50 },
    });

    // จำลอง prevHash ผิดพลาด
    const brokenLog2: AuditLogRecord = {
      ...log2,
      prevHash: "0000000000000000000000000000000000000000000000000000000000000000",
    };

    const verification = verifyAuditHashChain([log1, brokenLog2]);
    expect(verification.isValid).toBe(false);
    expect(verification.brokenLogId).toBe(brokenLog2.id);
    expect(verification.message).toContain("สายโซ่ถูกทำลาย");
  });
});
