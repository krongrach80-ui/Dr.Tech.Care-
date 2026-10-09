/**
 * src/lib/faceService.ts
 * Dr.Tech.Care — Face Biometrics Service (Server-side, Service Role Only)
 * จัดการตาราง face_challenges, face_enrollment_drafts, face_candidates, face_bind_requests,
 * face_consents, face_embeddings และการค้นหาเวกเตอร์ match_face
 */

import { createHash } from "node:crypto";
import { LivenessPose } from "@/lib/biometrics";

export interface StoredChallenge {
  id: string;
  nonce: string;
  nonceHash: string;
  purpose: "register" | "login" | "bind";
  poseOrder: LivenessPose[];
  issuedAt: number;
  expiresAt: number;
  usedAt?: number | undefined;
  kioskId?: string | undefined;
}

export interface StoredEnrollmentDraft {
  id: string;
  consent: {
    version: string;
    sha256: string;
    accepted: boolean;
  };
  embeddings: Record<LivenessPose, number[]>;
  kioskId?: string | undefined;
  createdAt: number;
  expiresAt: number;
}

export interface StoredCandidate {
  id: string;
  patientId: string;
  fullName: string;
  hn: string;
  birthDate: string;
  attemptNo: number;
  excludedPatientIds: string[];
  expiresAt: number;
  usedAt?: number | undefined;
}

export interface StoredBindRequest {
  id: string;
  patientId: string;
  patientName: string;
  requestedBy: string;
  kioskId?: string | undefined;
  createdAt: number;
  expiresAt: number;
  usedAt?: number | undefined;
}

export interface StoredFaceRecord {
  patientId: string;
  fullName: string;
  hn: string;
  birthDate: string;
  gender: string;
  phone: string;
  injuryDetails: string;
  embeddings: Record<LivenessPose, number[]>;
  consentVersion: string;
  consentSha256: string;
  enrolledAt: string;
}

// In-Memory store (Persists across route calls in runtime)
const challengesStore = new Map<string, StoredChallenge>();
const draftsStore = new Map<string, StoredEnrollmentDraft>();
const candidatesStore = new Map<string, StoredCandidate>();
const bindRequestsStore = new Map<string, StoredBindRequest>();
const enrolledFacesStore = new Map<string, StoredFaceRecord>();

// ข้อมูลตั้งต้นจำลองเพื่อรองรับ Flow B: สมศรี วงศ์สุวรรณ (u0000000-0000-0000-0000-000000000001)
// เวกเตอร์ 128 มิติ seed
function createSeedVector(baseVal: number): number[] {
  const v = new Array(128).fill(baseVal);
  const norm = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
  return v.map((x) => x / norm);
}

// กำหนด seed ให้สมศรี เพื่อให้ทดสอบ Flow B สแกนล็อกอินได้จริง
const SEED_PATIENT_ID = "u0000000-0000-0000-0000-000000000001";
enrolledFacesStore.set(SEED_PATIENT_ID, {
  patientId: SEED_PATIENT_ID,
  fullName: "สมศรี วงศ์สุวรรณ",
  hn: "69-00124",
  birthDate: "1954-05-12",
  gender: "female",
  phone: "081-234-5678",
  injuryDetails: "อาการข้อไหล่ติดข้างขวา ยกแขนได้ 80 องศา",
  embeddings: {
    center: createSeedVector(0.088),
    left: createSeedVector(0.088),
    right: createSeedVector(0.088),
  },
  consentVersion: "1.0",
  consentSha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  enrolledAt: "2026-09-01T00:00:00Z",
});

/**
 * คำนวณ Cosine Distance ระหว่าง 2 เวกเตอร์
 */
export function calculateCosineDistance(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 1.0;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] ?? 0;
    const b = vecB[i] ?? 0;
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 1.0;

  const similarity = dot / denominator;
  return Math.max(0, Math.min(2.0, 1.0 - similarity));
}

export const faceService = {
  /**
   * 1. สร้าง Challenge ป้องกัน Replay Attack
   */
  createChallenge(purpose: "register" | "login" | "bind", kioskId?: string): StoredChallenge {
    const isLeftFirst = Math.random() > 0.5;
    const poseOrder: LivenessPose[] = isLeftFirst
      ? ["center", "left", "right"]
      : ["center", "right", "left"];

    const now = Date.now();
    const nonce = `NONCE-${purpose.toUpperCase()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${now}`;
    const nonceHash = createHash("sha256").update(nonce).digest("hex");
    const id = `ch-${now}-${Math.random().toString(36).substring(2, 6)}`;

    const challenge: StoredChallenge = {
      id,
      nonce,
      nonceHash,
      purpose,
      poseOrder,
      issuedAt: now,
      expiresAt: now + 60_000, // หมดอายุใน 60 วินาที
      kioskId,
    };

    challengesStore.set(nonce, challenge);
    return challenge;
  },

  /**
   * ตรวจสอบ Challenge Nonce (ใช้ได้ครั้งเดียว)
   */
  verifyAndConsumeNonce(nonce: string, expectedPurpose?: string): StoredChallenge {
    const challenge = challengesStore.get(nonce);
    const now = Date.now();

    if (!challenge) {
      throw new Error("Challenge Nonce ไม่ถูกต้องหรือไม่มีในระบบ");
    }

    if (challenge.expiresAt < now) {
      challengesStore.delete(nonce);
      throw new Error("Challenge Nonce หมดอายุแล้ว กรุณาสแกนใหม่");
    }

    if (challenge.usedAt) {
      throw new Error("Challenge Nonce นี้ถูกใช้งานไปแล้ว (Replay Attack Prevention)");
    }

    if (expectedPurpose && challenge.purpose !== expectedPurpose) {
      throw new Error(`Challenge Purpose ไม่ตรงกัน: คาดหวัง ${expectedPurpose}`);
    }

    // มาร์กว่าใช้แล้ว
    challenge.usedAt = now;
    challengesStore.set(nonce, challenge);

    return challenge;
  },

  /**
   * 2. ค้นหาใบหน้า match_face ในระบบ
   */
  matchFace(probeEmbedding: number[], matchThreshold = 0.40, matchCount = 5): Array<{
    patientId: string;
    fullName: string;
    hn: string;
    birthDate: string;
    distance: number;
    confidence: number;
  }> {
    const results: Array<{
      patientId: string;
      fullName: string;
      hn: string;
      birthDate: string;
      distance: number;
      confidence: number;
    }> = [];

    for (const record of enrolledFacesStore.values()) {
      // เปรียบเทียบกับเวกเตอร์ center ของผู้ป่วย
      const targetVec = record.embeddings.center;
      const dist = calculateCosineDistance(probeEmbedding, targetVec);

      if (dist < matchThreshold) {
        results.push({
          patientId: record.patientId,
          fullName: record.fullName,
          hn: record.hn,
          birthDate: record.birthDate,
          distance: dist,
          confidence: Math.max(0, 1.0 - dist),
        });
      }
    }

    // เรียงตาม distance น้อยที่สุด (ใกล้เคียงที่สุด)
    results.sort((a, b) => a.distance - b.distance);
    return results.slice(0, matchCount);
  },

  /**
   * ตรวจสอบความซ้ำซ้อนของใบหน้า
   */
  checkDuplicateFace(embedding: number[], threshold = 0.38): {
    isDuplicate: boolean;
    matchedRecord?: StoredFaceRecord | undefined;
  } {
    for (const record of enrolledFacesStore.values()) {
      const dist = calculateCosineDistance(embedding, record.embeddings.center);
      if (dist < threshold) {
        return { isDuplicate: true, matchedRecord: record };
      }
    }
    return { isDuplicate: false };
  },

  /**
   * 3. บันทึก Enrollment Draft
   */
  createDraft(
    consent: { version: string; sha256: string; accepted: boolean },
    embeddings: Record<LivenessPose, number[]>,
    kioskId?: string
  ): StoredEnrollmentDraft {
    const now = Date.now();
    const id = `draft-${now}-${Math.random().toString(36).substring(2, 8)}`;
    const draft: StoredEnrollmentDraft = {
      id,
      consent,
      embeddings,
      kioskId,
      createdAt: now,
      expiresAt: now + 15 * 60_000, // ร่างมีอายุ 15 นาที
    };

    draftsStore.set(id, draft);
    return draft;
  },

  getDraft(draftId: string): StoredEnrollmentDraft | null {
    const draft = draftsStore.get(draftId);
    if (!draft) return null;
    if (draft.expiresAt < Date.now()) {
      draftsStore.delete(draftId);
      return null;
    }
    return draft;
  },

  consumeDraft(draftId: string): StoredEnrollmentDraft {
    const draft = this.getDraft(draftId);
    if (!draft) {
      throw new Error("Enrollment Draft ไม่พบหรือหมดอายุแล้ว");
    }
    draftsStore.delete(draftId);
    return draft;
  },

  /**
   * 4. สมัครและบันทึกผู้ป่วยพร้อมเวกเตอร์ใบหน้า
   */
  registerPatientWithFace(
    draftId: string,
    patientData: {
      hn?: string | undefined;
      firstName: string;
      lastName: string;
      birthDate: string;
      gender: string;
      phone: string;
      injuryDetails?: string | undefined;
    }
  ): StoredFaceRecord {
    const draft = this.consumeDraft(draftId);
    const patientId = `u${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const hn = patientData.hn || `69-${Math.floor(10000 + Math.random() * 90000)}`;
    const fullName = `${patientData.firstName.trim()} ${patientData.lastName.trim()}`;

    const record: StoredFaceRecord = {
      patientId,
      fullName,
      hn,
      birthDate: patientData.birthDate,
      gender: patientData.gender,
      phone: patientData.phone,
      injuryDetails: patientData.injuryDetails || "",
      embeddings: draft.embeddings,
      consentVersion: draft.consent.version,
      consentSha256: draft.consent.sha256,
      enrolledAt: new Date().toISOString(),
    };

    enrolledFacesStore.set(patientId, record);
    return record;
  },

  /**
   * 5. สร้าง Candidate สำหรับการยืนยันตัวตน
   */
  createCandidate(patientId: string, attemptNo = 1, excludedIds: string[] = []): StoredCandidate {
    const record = enrolledFacesStore.get(patientId);
    if (!record) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    const now = Date.now();
    const id = `cand-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const candidate: StoredCandidate = {
      id,
      patientId,
      fullName: record.fullName,
      hn: record.hn,
      birthDate: record.birthDate,
      attemptNo,
      excludedPatientIds: excludedIds,
      expiresAt: now + 5 * 60_000, // 5 นาที
    };

    candidatesStore.set(id, candidate);
    return candidate;
  },

  getCandidate(candidateId: string): StoredCandidate | null {
    const cand = candidatesStore.get(candidateId);
    if (!cand) return null;
    if (cand.expiresAt < Date.now()) {
      candidatesStore.delete(candidateId);
      return null;
    }
    return cand;
  },

  /**
   * 6. สร้างคำขอผูกใบหน้า (Bind Request)
   */
  createBindRequest(patientId: string, requestedBy: string, patientName: string, kioskId?: string): StoredBindRequest {
    const now = Date.now();
    const id = `bind-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const bindReq: StoredBindRequest = {
      id,
      patientId,
      patientName,
      requestedBy,
      kioskId,
      createdAt: now,
      expiresAt: now + 10 * 60_000, // 10 นาที
    };

    bindRequestsStore.set(id, bindReq);
    return bindReq;
  },

  getBindRequest(bindRequestId: string): StoredBindRequest | null {
    const req = bindRequestsStore.get(bindRequestId);
    if (!req) return null;
    if (req.expiresAt < Date.now()) {
      bindRequestsStore.delete(bindRequestId);
      return null;
    }
    return req;
  },

  bindFaceToPatient(
    bindRequestId: string,
    embeddings: Record<LivenessPose, number[]>,
    consent: { version: string; sha256: string; accepted: boolean }
  ): StoredFaceRecord {
    const bindReq = this.getBindRequest(bindRequestId);
    if (!bindReq) {
      throw new Error("คำขอผูกใบหน้าไม่พบหรือหมดอายุแล้ว");
    }

    // ตรวจสอบใบหน้าซ้ำกับคนอื่น
    const dupCheck = this.checkDuplicateFace(embeddings.center);
    if (dupCheck.isDuplicate && dupCheck.matchedRecord?.patientId !== bindReq.patientId) {
      throw new Error(`ใบหน้านี้ถูกผูกไว้กับผู้ป่วยอื่นแล้ว (${dupCheck.matchedRecord?.fullName})`);
    }

    const record: StoredFaceRecord = {
      patientId: bindReq.patientId,
      fullName: bindReq.patientName,
      hn: "69-BIND",
      birthDate: "1960-01-01",
      gender: "other",
      phone: "-",
      injuryDetails: "",
      embeddings,
      consentVersion: consent.version,
      consentSha256: consent.sha256,
      enrolledAt: new Date().toISOString(),
    };

    enrolledFacesStore.set(bindReq.patientId, record);
    bindReq.usedAt = Date.now();
    bindRequestsStore.set(bindRequestId, bindReq);

    return record;
  },

  /**
   * 7. เพิกถอนความยินยอมและลบข้อมูลใบหน้า (Withdraw Consent & Erasure)
   */
  withdrawFaceConsent(patientId: string): boolean {
    const existed = enrolledFacesStore.has(patientId);
    if (existed) {
      enrolledFacesStore.delete(patientId);
    }
    return existed;
  },

  isFaceEnrolled(patientId: string): boolean {
    return enrolledFacesStore.has(patientId);
  },
};
