import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST as challengeHandler } from "@/app/api/face/challenge/route";
import { POST as registerScanHandler } from "@/app/api/face/register/scan/route";
import { POST as patientsRegisterHandler } from "@/app/api/face/patients/register/route";
import { POST as loginHandler } from "@/app/api/face/login/route";
import { POST as confirmHandler } from "@/app/api/face/confirm/route";
import { POST as bindStartHandler } from "@/app/api/face/bind/start/route";
import { POST as bindScanHandler } from "@/app/api/face/bind/scan/route";
import { POST as withdrawHandler } from "@/app/api/face/withdraw/route";
import { faceService } from "@/lib/faceService";
import { createHash } from "node:crypto";

function makeJsonRequest(url: string, body: unknown) {
  return new NextRequest(new URL(url, "http://localhost:3000"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createOneHotVector(index: number): number[] {
  const v = new Array(128).fill(0);
  v[index % 128] = 1;
  return v;
}

describe("Face API Routes (Section 7.4 Endpoints)", () => {
  // เวกเตอร์ของสมศรี: 1/sqrt(128) ทุกมิติ
  const somsriVector = new Array(128).fill(1 / Math.sqrt(128));
  // เวกเตอร์ของผู้ป่วยคนอื่น ๆ ที่ไม่ซ้ำกับสมศรี
  const uniqueVectorA = createOneHotVector(1);
  const uniqueVectorB = createOneHotVector(2);
  const dummySha256 = createHash("sha256").update("consent-v1").digest("hex");

  it("1. POST /api/face/challenge creates nonce and 3 poses", async () => {
    const req = makeJsonRequest("/api/face/challenge", {
      purpose: "login",
      kioskId: "kiosk-unit-01",
    });
    const res = await challengeHandler(req);
    expect(res.status).toBe(201);
    const data = await res.json();

    expect(data.challengeId).toBeDefined();
    expect(data.nonce).toContain("NONCE-LOGIN-");
    expect(data.poseOrder).toHaveLength(3);
    expect(data.poseOrder).toContain("center");
  });

  it("2. POST /api/face/register/scan creates draft or detects duplicate", async () => {
    // A) กรณีหน้าใหม่
    const challenge = faceService.createChallenge("register");
    const newReq = makeJsonRequest("/api/face/register/scan", {
      challengeNonce: challenge.nonce,
      embeddings: {
        center: uniqueVectorA,
        left: uniqueVectorA,
        right: uniqueVectorA,
      },
      consent: {
        version: "1.0",
        sha256: dummySha256,
        accepted: true,
      },
      kioskId: "kiosk-01",
    });

    const newRes = await registerScanHandler(newReq);
    expect(newRes.status).toBe(201);
    const newData = await newRes.json();
    expect(newData.status).toBe("draft_created");
    expect(newData.draftId).toBeDefined();

    // B) กรณีหน้าซ้ำกับ สมศรี วงศ์สุวรรณ
    const dupChallenge = faceService.createChallenge("register");
    const dupReq = makeJsonRequest("/api/face/register/scan", {
      challengeNonce: dupChallenge.nonce,
      embeddings: {
        center: somsriVector,
        left: somsriVector,
        right: somsriVector,
      },
      consent: {
        version: "1.0",
        sha256: dummySha256,
        accepted: true,
      },
      kioskId: "kiosk-01",
    });

    const dupRes = await registerScanHandler(dupReq);
    expect(dupRes.status).toBe(200);
    const dupData = await dupRes.json();
    expect(dupData.status).toBe("duplicate_found");
    expect(dupData.maskedName).toBe("สมศรี ว****");
    expect(dupData.redirectTo).toBe("/login");
  });

  it("3. POST /api/face/patients/register completes self registration", async () => {
    const draft = faceService.createDraft(
      { version: "1.0", sha256: dummySha256, accepted: true },
      { center: uniqueVectorA, left: uniqueVectorA, right: uniqueVectorA }
    );

    const req = makeJsonRequest("/api/face/patients/register", {
      draftId: draft.id,
      firstName: "สมพร",
      lastName: "เกษมสุข",
      birthDate: "1958-03-15",
      gender: "female",
      phone: "089-111-2233",
      injuryDetails: "ปวดเข่าข้างซ้าย",
    });

    const res = await patientsRegisterHandler(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.patientId).toBeDefined();
    expect(data.hn).toBeDefined();
  });

  it("4. POST /api/face/login matches face without returning distance", async () => {
    const challenge = faceService.createChallenge("login");
    const req = makeJsonRequest("/api/face/login", {
      challengeNonce: challenge.nonce,
      embedding: somsriVector,
      quality: 0.95,
      attemptNo: 1,
      kioskId: "kiosk-login-test",
    });

    const res = await loginHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.outcome).toBe("match");
    expect(data.candidateId).toBeDefined();
    expect(data.maskedName).toBe("สมศรี ว****");
    expect(data.hn).toBe("69-00124");
    // CRITICAL SECURITY RULE: distance and raw vectors must never be returned!
    expect(data.distance).toBeUndefined();
    expect(data.embedding).toBeUndefined();
  });

  it("5. POST /api/face/confirm handles identity verification & 2-strike rejection", async () => {
    // 5.1 Confirmed = true
    const candidate1 = faceService.createCandidate("u0000000-0000-0000-0000-000000000001", 1);
    const reqOk = makeJsonRequest("/api/face/confirm", {
      candidateId: candidate1.id,
      confirmed: true,
    });
    const resOk = await confirmHandler(reqOk);
    const dataOk = await resOk.json();
    if (resOk.status !== 200) {
      console.error("confirmHandler error:", dataOk);
    }
    expect(resOk.status).toBe(200);
    expect(dataOk.success).toBe(true);
    expect(dataOk.patientId).toBe("u0000000-0000-0000-0000-000000000001");

    // 5.2 Confirmed = false (ครั้งที่ 1: retryAllowed = true)
    const candidate2 = faceService.createCandidate("u0000000-0000-0000-0000-000000000001", 1);
    const reqReject1 = makeJsonRequest("/api/face/confirm", {
      candidateId: candidate2.id,
      confirmed: false,
    });
    const resReject1 = await confirmHandler(reqReject1);
    expect(resReject1.status).toBe(200);
    const dataReject1 = await resReject1.json();
    expect(dataReject1.success).toBe(false);
    expect(dataReject1.retryAllowed).toBe(true);

    // 5.3 Confirmed = false (ครั้งที่ 2: retryAllowed = false -> ติดต่อเจ้าหน้าที่)
    const candidate3 = faceService.createCandidate("u0000000-0000-0000-0000-000000000001", 2);
    const reqReject2 = makeJsonRequest("/api/face/confirm", {
      candidateId: candidate3.id,
      confirmed: false,
    });
    const resReject2 = await confirmHandler(reqReject2);
    expect(resReject2.status).toBe(200);
    const dataReject2 = await resReject2.json();
    expect(dataReject2.success).toBe(false);
    expect(dataReject2.retryAllowed).toBe(false);
    expect(dataReject2.message).toContain("เจ้าหน้าที่");
  });

  it("6 & 7. POST /api/face/bind/start and /api/face/bind/scan binds face", async () => {
    // Bind Start
    const reqStart = makeJsonRequest("/api/face/bind/start", {
      patientId: "patient-test-bind-001",
    });
    const resStart = await bindStartHandler(reqStart);
    expect(resStart.status).toBe(201);
    const dataStart = await resStart.json();
    expect(dataStart.bindRequestId).toBeDefined();

    // Bind Scan
    const challenge = faceService.createChallenge("bind");
    const freshVec = uniqueVectorB;
    const reqScan = makeJsonRequest("/api/face/bind/scan", {
      bindRequestId: dataStart.bindRequestId,
      challengeNonce: challenge.nonce,
      embeddings: {
        center: freshVec,
        left: freshVec,
        right: freshVec,
      },
      consent: {
        version: "1.0",
        sha256: dummySha256,
        accepted: true,
      },
    });

    const resScan = await bindScanHandler(reqScan);
    expect(resScan.status).toBe(200);
    const dataScan = await resScan.json();
    expect(dataScan.success).toBe(true);
    expect(faceService.isFaceEnrolled("patient-test-bind-001")).toBe(true);
  });

  it("8. POST /api/face/withdraw erases biometric data (PDPA)", async () => {
    expect(faceService.isFaceEnrolled("patient-test-bind-001")).toBe(true);

    const req = makeJsonRequest("/api/face/withdraw", {
      patientId: "patient-test-bind-001",
      reason: "คนไข้ขอลบข้อมูลใบหน้าตามสิทธิ์ PDPA",
    });

    const res = await withdrawHandler(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(faceService.isFaceEnrolled("patient-test-bind-001")).toBe(false);
  });
});
