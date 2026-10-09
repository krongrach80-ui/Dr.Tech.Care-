import { NextRequest, NextResponse } from "next/server";
import { faceLoginRequestSchema, faceLoginResponseSchema } from "@/lib/schemas/face";
import { faceService } from "@/lib/faceService";
import { decideIdentity, type IdentityCandidate } from "@/lib/biometrics";
import { writeAudit } from "@/lib/audit/writer";
import { checkLoginRateLimit, recordFailedLoginAttempt } from "@/lib/rateLimit";
import { maskName, calculateAge } from "@/lib/thai";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsedBody = faceLoginRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "ข้อมูลคำขอล็อกอินไม่ถูกต้อง", issues: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const { challengeNonce, embedding, quality, attemptNo, excludedPatientIds, kioskId } =
      parsedBody.data;
    const rateLimitKey = kioskId ?? "kiosk-01";

    // 1. ตรวจสอบ Lockout / Rate Limit
    const rateCheck = checkLoginRateLimit(rateLimitKey);
    if (!rateCheck.isAllowed) {
      await writeAudit({
        category: "security",
        action: "face_lockout",
        outcome: "denied",
        actorRole: "patient",
        kioskId: rateLimitKey,
        metadata: {
          lockedUntil: rateCheck.lockedUntil,
          reason: "Too many failed face login attempts",
        },
      });

      const lockoutResponse = faceLoginResponseSchema.parse({
        outcome: "locked_out",
        candidateId: null,
        message:
          "ระงับการเข้าสู่ระบบชั่วคราวเนื่องจากพยายามไม่สำเร็จเกินกำหนด กรุณาติดต่อเจ้าหน้าที่คลินิก",
      });
      return NextResponse.json(lockoutResponse, { status: 429 });
    }

    // 2. ตรวจสอบ Challenge Nonce (ใช้ครั้งเดียว)
    try {
      faceService.verifyAndConsumeNonce(challengeNonce, "login");
    } catch (nonceErr: unknown) {
      const msg = nonceErr instanceof Error ? nonceErr.message : "Nonce ไม่ถูกต้องหรือหมดอายุ";
      recordFailedLoginAttempt(rateLimitKey);
      await writeAudit({
        category: "security",
        action: "face_login_fail",
        outcome: "failure",
        actorRole: "patient",
        kioskId: rateLimitKey,
        metadata: { reason: "Invalid or expired challenge nonce", error: msg },
      });
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    // 3. ตรวจสอบคุณภาพภาพ (Quality Check)
    if (quality < 0.35) {
      recordFailedLoginAttempt(rateLimitKey);
      await writeAudit({
        category: "security",
        action: "liveness_fail",
        outcome: "failure",
        actorRole: "patient",
        kioskId: rateLimitKey,
        metadata: { quality, reason: "Face quality below acceptable threshold" },
      });

      const lowQualityResponse = faceLoginResponseSchema.parse({
        outcome: "no_match",
        candidateId: null,
        message: "คุณภาพภาพสแกนไม่ชัดเจนหรือแสงสว่างไม่เพียงพอ กรุณาสแกนใหม่อีกครั้ง",
      });
      return NextResponse.json(lowQualityResponse, { status: 200 });
    }

    // 4. ค้นหาใบหน้าใกล้เคียงในระบบ (Vector Search)
    const matches = faceService.matchFace(embedding, 0.40, 5);
    const filteredMatches = matches.filter((m) => !excludedPatientIds.includes(m.patientId));

    // แปลงเข้าโครงสร้าง IdentityCandidate ของ decideIdentity()
    const identityCandidates: IdentityCandidate[] = filteredMatches.map((m) => ({
      profileId: m.patientId,
      fullName: m.fullName,
      distance: m.distance,
    }));

    // 5. ประเมินอัตลักษณ์ด้วย decideIdentity() (Pure function)
    const decision = decideIdentity(identityCandidates, {
      matchThreshold: 0.40,
      ambiguousDelta: 0.05,
    });

    if (decision.outcome === "match" && decision.profileId) {
      const best = filteredMatches.find((m) => m.patientId === decision.profileId);
      if (!best) {
        throw new Error("Match profile not found in candidates list");
      }

      // สร้าง Candidate สำหรับรอการยืนยัน
      const candidate = faceService.createCandidate(best.patientId, attemptNo, excludedPatientIds);

      // สำคัญมาก: ห้ามส่ง distance หรือเวกเตอร์กลับไปยังไคลเอนต์เด็ดขาด
      const responseData = faceLoginResponseSchema.parse({
        outcome: "match",
        candidateId: candidate.id,
        maskedName: maskName(best.fullName),
        hn: best.hn,
        age: calculateAge(best.birthDate),
        message: "ตรวจพบข้อมูลผู้ป่วย กรุณายืนยันตัวตน",
      });

      return NextResponse.json(responseData, { status: 200 });
    }

    // กรณี Ambiguous, No Match หรือ Inconsistent
    recordFailedLoginAttempt(rateLimitKey);

    await writeAudit({
      category: "security",
      action: "face_login_fail",
      outcome: "failure",
      actorRole: "patient",
      kioskId: rateLimitKey,
      metadata: {
        reason: decision.outcome,
        candidateCount: filteredMatches.length,
      },
      // สำคัญ: ห้ามบันทึก embedding ใน metadata / changes เด็ดขาด!
    });

    const failureResponse = faceLoginResponseSchema.parse({
      outcome: decision.outcome,
      candidateId: null,
      message: decision.message,
    });

    return NextResponse.json(failureResponse, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการตรวจสอบใบหน้า";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
