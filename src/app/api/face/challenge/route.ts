import { NextRequest, NextResponse } from "next/server";
import { faceChallengeRequestSchema, faceChallengeResponseSchema } from "@/lib/schemas/face";
import { faceService } from "@/lib/faceService";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const parsedBody = faceChallengeRequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: "ข้อมูลคำขอไม่ถูกต้อง", issues: parsedBody.error.issues },
        { status: 400 }
      );
    }

    const { purpose, kioskId } = parsedBody.data;
    const challenge = faceService.createChallenge(purpose, kioskId);

    const responseData = faceChallengeResponseSchema.parse({
      challengeId: challenge.id,
      nonce: challenge.nonce,
      poseOrder: challenge.poseOrder,
      issuedAt: new Date(challenge.issuedAt).toISOString(),
      expiresAt: new Date(challenge.expiresAt).toISOString(),
    });

    return NextResponse.json(responseData, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการสร้าง Challenge";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
