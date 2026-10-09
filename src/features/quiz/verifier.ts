import { z } from "zod";

export const quizSubmissionSchema = z.object({
  questionId: z.number().int().positive(),
  selectedChoiceIndex: z.number().int().min(0).max(3),
  clientAttemptId: z.string().uuid("clientAttemptId ต้องเป็น UUID ที่สร้างจากเครื่องตู้"),
  answeredAt: z.number().int().positive(),
});

export type QuizSubmission = z.infer<typeof quizSubmissionSchema>;

export interface ClientSafeQuizQuestion {
  id: number;
  prompt: string;
  choices: string[];
  category: string;
}

export interface QuizEvaluationResult {
  clientAttemptId: string;
  isCorrect: boolean;
  explanation: string;
  alreadyEvaluated?: boolean;
}

// แคชบันทึก idempotency สำหรับ clientAttemptId ป้องกันการส่งซ้ำ
const attemptIdCache = new Map<string, QuizEvaluationResult>();

// ธนาคารคำตอบฝั่งเซิร์ฟเวอร์ (ห้ามหลุดไปฝั่ง client)
const QUIZ_CORRECT_ANSWER_MAP: Record<number, { correctIndex: number; explanation: string }> = {
  1: { correctIndex: 1, explanation: "กล้วยมีเปลือกสีเหลืองและเป็นอาหารโปรดของลิง" },
  2: { correctIndex: 2, explanation: "หนึ่งสัปดาห์มี 7 วัน (จันทร์ถึงอาทิตย์)" },
  3: { correctIndex: 1, explanation: "สุนัขเห่าได้และเป็นสัตว์เลี้ยงเฝ้าบ้านยอดนิยม" },
  4: { correctIndex: 1, explanation: "15 + 5 = 20" },
  5: { correctIndex: 0, explanation: "ไฟสีแดงหมายถึงให้หยุดรถ" },
  6: { correctIndex: 2, explanation: "ประเทศไทยตั้งอยู่ในทวีปเอเชียตะวันออกเฉียงใต้" },
  7: { correctIndex: 2, explanation: "ดวงตาทำหน้าที่ในการมองเห็น" },
  8: { correctIndex: 0, explanation: "ดวงอาทิตย์ขึ้นทางทิศตะวันออกเสมอ" },
  9: { correctIndex: 0, explanation: "ข้าวสารต้องนำไปหุงให้สุกก่อนรับประทาน" },
  10: { correctIndex: 1, explanation: "78 มีค่ามากที่สุดในกลุ่มตัวเลขนี้" },
};

/**
 * ฟังก์ชันประเมินคำตอบมินิเกมฝั่งเซิร์ฟเวอร์ พร้อม Idempotency ด้วย clientAttemptId
 */
export function evaluateQuizAnswer(rawSubmission: unknown): {
  success: boolean;
  result?: QuizEvaluationResult;
  errorMessage?: string;
} {
  const parsed = quizSubmissionSchema.safeParse(rawSubmission);
  if (!parsed.success) {
    return {
      success: false,
      errorMessage: "ข้อมูลการตอบคำถามไม่ถูกต้องตาม Zod Schema",
    };
  }

  const { clientAttemptId, questionId, selectedChoiceIndex } = parsed.data;

  // ตรวจสอบ Idempotency
  const existing = attemptIdCache.get(clientAttemptId);
  if (existing) {
    return {
      success: true,
      result: { ...existing, alreadyEvaluated: true },
    };
  }

  const answerInfo = QUIZ_CORRECT_ANSWER_MAP[questionId];
  if (!answerInfo) {
    return {
      success: false,
      errorMessage: "ไม่พบคำถามที่ระบุในฐานข้อมูล",
    };
  }

  const isCorrect = selectedChoiceIndex === answerInfo.correctIndex;
  const result: QuizEvaluationResult = {
    clientAttemptId,
    isCorrect,
    explanation: answerInfo.explanation,
  };

  attemptIdCache.set(clientAttemptId, result);

  return {
    success: true,
    result,
  };
}
