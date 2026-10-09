import { describe, it, expect } from "vitest";
import {
  faceChallengeRequestSchema,
  faceRegisterScanRequestSchema,
  facePatientsRegisterRequestSchema,
  faceLoginRequestSchema,
  faceConfirmRequestSchema,
  faceBindStartRequestSchema,
  faceBindScanRequestSchema,
  faceWithdrawRequestSchema,
} from "@/lib/schemas/face";

describe("Face API Zod Schemas Validation (Phase 4)", () => {
  const validVector = new Array(128).fill(0.08);

  it("validates Challenge request", () => {
    const res = faceChallengeRequestSchema.safeParse({ purpose: "login" });
    expect(res.success).toBe(true);

    const invalid = faceChallengeRequestSchema.safeParse({ purpose: "invalid" });
    expect(invalid.success).toBe(false);
  });

  it("validates Register Scan request and requires 128-d vectors and accepted consent", () => {
    const valid = faceRegisterScanRequestSchema.safeParse({
      challengeNonce: "NONCE-12345",
      embeddings: {
        center: validVector,
        left: validVector,
        right: validVector,
      },
      consent: {
        version: "1.0",
        sha256: "a".repeat(64),
        accepted: true,
      },
    });
    expect(valid.success).toBe(true);

    // ปฏิเสธถ้าเวกเตอร์ไม่ครบ 128 มิติ
    const badVector = faceRegisterScanRequestSchema.safeParse({
      challengeNonce: "NONCE-12345",
      embeddings: {
        center: [0.1, 0.2], // ผิด: มีแค่ 2 มิติ
        left: validVector,
        right: validVector,
      },
      consent: { version: "1.0", sha256: "a".repeat(64), accepted: true },
    });
    expect(badVector.success).toBe(false);

    // ปฏิเสธถ้าไม่ยินยอม PDPA
    const notAccepted = faceRegisterScanRequestSchema.safeParse({
      challengeNonce: "NONCE-12345",
      embeddings: { center: validVector, left: validVector, right: validVector },
      consent: { version: "1.0", sha256: "a".repeat(64), accepted: false },
    });
    expect(notAccepted.success).toBe(false);
  });

  it("validates Patient Registration request", () => {
    const valid = facePatientsRegisterRequestSchema.safeParse({
      draftId: "draft-101",
      firstName: "สมพร",
      lastName: "ยิ้มแย้ม",
      birthDate: "1958-09-24",
      gender: "female",
      phone: "089-876-5432",
    });
    expect(valid.success).toBe(true);

    const invalidDate = facePatientsRegisterRequestSchema.safeParse({
      draftId: "draft-101",
      firstName: "สมพร",
      lastName: "ยิ้มแย้ม",
      birthDate: "invalid-date",
      gender: "female",
      phone: "089-876-5432",
    });
    expect(invalidDate.success).toBe(false);
  });

  it("validates Login request", () => {
    const valid = faceLoginRequestSchema.safeParse({
      challengeNonce: "NONCE-LOGIN",
      embedding: validVector,
      quality: 0.85,
    });
    expect(valid.success).toBe(true);
  });

  it("validates Confirm request", () => {
    const valid = faceConfirmRequestSchema.safeParse({
      candidateId: "cand-1",
      confirmed: true,
    });
    expect(valid.success).toBe(true);
  });

  it("validates Bind Start and Bind Scan requests", () => {
    const start = faceBindStartRequestSchema.safeParse({ patientId: "pat-1" });
    expect(start.success).toBe(true);

    const scan = faceBindScanRequestSchema.safeParse({
      bindRequestId: "bind-1",
      challengeNonce: "NONCE-BIND",
      embeddings: { center: validVector, left: validVector, right: validVector },
      consent: { version: "1.0", sha256: "b".repeat(64), accepted: true },
    });
    expect(scan.success).toBe(true);
  });

  it("validates Withdraw request", () => {
    const valid = faceWithdrawRequestSchema.safeParse({ patientId: "pat-1" });
    expect(valid.success).toBe(true);
  });
});
