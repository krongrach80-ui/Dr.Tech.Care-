import { describe, it, expect } from "vitest";
import { evaluateFaceQuality } from "@/features/face/quality";
import {
  PoseFrameCollector,
  computeAverageEmbedding,
  normalizeVector,
} from "@/features/face/capture";
import { checkPoseYawCompliance } from "@/lib/biometrics";

describe("Face Quality & Pose Frame Capture (Phase 4)", () => {
  describe("evaluateFaceQuality", () => {
    it("ให้คะแนนคุณภาพดีเยี่ยมเมื่อใบหน้า 1 คน, ขนาด 30-60%, แสงและความคมชัดดี, ไม่ใส่หน้ากาก", () => {
      const assessment = evaluateFaceQuality({
        faceCount: 1,
        faceSizeRatio: 0.45,
        lightingScore: 75,
        sharpnessScore: 85,
        yaw: 2,
        pitch: 3,
        roll: 1,
        isMaskDetected: false,
      });

      expect(assessment.isAcceptable).toBe(true);
      expect(assessment.quality).toBeGreaterThanOrEqual(0.8);
      expect(assessment.issues).toHaveLength(0);
    });

    it("ปฏิเสธทันทีเมื่อไม่พบใบหน้า หรือตรวจพบใบหน้ามากกว่า 1 คน", () => {
      const noFace = evaluateFaceQuality({
        faceCount: 0,
        faceSizeRatio: 0,
        lightingScore: 50,
        sharpnessScore: 50,
        yaw: 0,
        pitch: 0,
        roll: 0,
      });
      expect(noFace.quality).toBe(0);
      expect(noFace.isAcceptable).toBe(false);

      const multiple = evaluateFaceQuality({
        faceCount: 2,
        faceSizeRatio: 0.4,
        lightingScore: 70,
        sharpnessScore: 80,
        yaw: 0,
        pitch: 0,
        roll: 0,
      });
      expect(multiple.quality).toBe(0);
      expect(multiple.isAcceptable).toBe(false);
      expect(multiple.issues[0]).toContain("มากกว่า 1 คน");
    });

    it("หักคะแนนเมื่อสวมหน้ากากอนามัย และตั้งค่า isAcceptable เป็น false", () => {
      const masked = evaluateFaceQuality({
        faceCount: 1,
        faceSizeRatio: 0.45,
        lightingScore: 80,
        sharpnessScore: 80,
        yaw: 0,
        pitch: 0,
        roll: 0,
        isMaskDetected: true,
      });
      expect(masked.isAcceptable).toBe(false);
      expect(masked.issues.some((i) => i.includes("หน้ากาก"))).toBe(true);
    });

    it("แจ้งเตือนเมื่อขนาดใบหน้าไม่อยู่ในช่วง 30-60%", () => {
      // เล็กเกินไป (ไกลกล้อง)
      const tooSmall = evaluateFaceQuality({
        faceCount: 1,
        faceSizeRatio: 0.20,
        lightingScore: 70,
        sharpnessScore: 70,
        yaw: 0,
        pitch: 0,
        roll: 0,
      });
      expect(tooSmall.issues.some((i) => i.includes("เข้าใกล้กล้อง"))).toBe(true);

      // ใหญ่เกินไป (ชิดกล้องเกินไป)
      const tooLarge = evaluateFaceQuality({
        faceCount: 1,
        faceSizeRatio: 0.75,
        lightingScore: 70,
        sharpnessScore: 70,
        yaw: 0,
        pitch: 0,
        roll: 0,
      });
      expect(tooLarge.issues.some((i) => i.includes("ถอยห่าง"))).toBe(true);
    });
  });

  describe("PoseFrameCollector & Averaging Engine", () => {
    it("เก็บ 3 เฟรมที่ดีที่สุด และคำนวณเวกเตอร์เฉลี่ยความยาว 1.0 (Unit L2 Norm)", () => {
      const collector = new PoseFrameCollector("center", 3);

      const makeVec = (seed: number) => {
        const v = new Array(128).fill(seed);
        return normalizeVector(v);
      };

      collector.addCandidate({ embedding: makeVec(0.1), quality: 0.75, yaw: 0, capturedAt: 100 });
      collector.addCandidate({ embedding: makeVec(0.2), quality: 0.90, yaw: 1, capturedAt: 200 });
      collector.addCandidate({ embedding: makeVec(0.3), quality: 0.85, yaw: -1, capturedAt: 300 });

      // เพิ่มเฟรมที่ 4 ที่มีคุณภาพต่ำกว่า (0.60) -> ต้องถูกคัดออก
      collector.addCandidate({ embedding: makeVec(0.4), quality: 0.60, yaw: 2, capturedAt: 400 });

      expect(collector.count).toBe(3);
      expect(collector.isComplete()).toBe(true);

      const result = collector.getResult();
      expect(result.frameCount).toBe(3);
      expect(result.bestQuality).toBe(0.90);
      expect(result.averageEmbedding).toHaveLength(128);

      // ตรวจสอบ L2 Norm ของ averageEmbedding ต้องใกล้เคียง 1.0
      const norm = Math.sqrt(result.averageEmbedding.reduce((acc, v) => acc + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 4);
    });

    it("คำนวณเวกเตอร์เฉลี่ยจากรายการเวกเตอร์หลายตัวและ L2 Normalize", () => {
      const v1 = new Array(128).fill(1);
      const v2 = new Array(128).fill(2);
      const avg = computeAverageEmbedding([v1, v2]);
      expect(avg).toHaveLength(128);
      const norm = Math.sqrt(avg.reduce((acc, v) => acc + v * v, 0));
      expect(norm).toBeCloseTo(1.0, 4);
    });
  });

  describe("Mirror Yaw Safety", () => {
    it("ตรวจสอบทิศทางซ้าย/ขวาไม่สลับเมื่อ mirror", () => {
      // หันซ้ายจริงของผู้ใช้: yaw เป็นลบ (-20 ถึง -42)
      expect(checkPoseYawCompliance("left", -26).isCompliant).toBe(true);
      expect(checkPoseYawCompliance("right", -26).isCompliant).toBe(false);

      // หันขวาจริงของผู้ใช้: yaw เป็นบวก (+20 ถึง +42)
      expect(checkPoseYawCompliance("right", 28).isCompliant).toBe(true);
      expect(checkPoseYawCompliance("left", 28).isCompliant).toBe(false);
    });
  });
});
