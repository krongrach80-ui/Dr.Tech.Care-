import { describe, it, expect } from "vitest";
import { evaluateQuizAnswer } from "@/features/quiz/verifier";

describe("Quiz Answer Server Verification & Anti-Cheating", () => {
  const validAttemptId = "e2d83b5b-2f3b-4871-bb61-482a0bdf5db9";

  it("evaluates a correct answer without revealing other answers", () => {
    const res = evaluateQuizAnswer({
      questionId: 1, // "ผลไม้อะไรมีสีเหลืองและลิงชอบกิน?" -> 1 (กล้วย)
      selectedChoiceIndex: 1,
      clientAttemptId: validAttemptId,
      answeredAt: Date.now(),
    });

    expect(res.success).toBe(true);
    expect(res.result?.isCorrect).toBe(true);
    expect(res.result?.explanation).toContain("กล้วย");
  });

  it("evaluates an incorrect answer accurately", () => {
    const res = evaluateQuizAnswer({
      questionId: 1,
      selectedChoiceIndex: 0, // แอปเปิ้ล (ผิด)
      clientAttemptId: "f3c92a11-1234-4567-89ab-cdef01234567",
      answeredAt: Date.now(),
    });

    expect(res.success).toBe(true);
    expect(res.result?.isCorrect).toBe(false);
  });

  it("handles duplicate submission idempotently via clientAttemptId", () => {
    const duplicateRes = evaluateQuizAnswer({
      questionId: 1,
      selectedChoiceIndex: 1,
      clientAttemptId: validAttemptId,
      answeredAt: Date.now(),
    });

    expect(duplicateRes.success).toBe(true);
    expect(duplicateRes.result?.alreadyEvaluated).toBe(true);
  });

  it("rejects invalid input not matching Zod schema", () => {
    const badInput = evaluateQuizAnswer({
      questionId: -5,
      selectedChoiceIndex: 99,
      clientAttemptId: "not-a-uuid",
    });

    expect(badInput.success).toBe(false);
    expect(badInput.errorMessage).toContain("Zod Schema");
  });
});
