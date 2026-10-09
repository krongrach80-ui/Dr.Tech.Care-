/**
 * src/features/face/quality.ts
 * Dr.Tech.Care — Face Quality Evaluation Engine (PDPA Compliant)
 * ตรวจใบหน้า 1 คน, ขนาด 30–60%, แสง, ความคมชัด, yaw, ไม่ใส่หน้ากาก -> quality 0–1
 */

export interface FaceQualityInput {
  faceCount: number;
  faceSizeRatio: number; // สัดส่วนขนาดกล่องใบหน้าเทียบกับขนาดเฟรมภาพ
  lightingScore: number; // คะแนนความสว่าง 0-100
  sharpnessScore: number; // ความคมชัด 0-100 (ป้องกันภาพเบลอ)
  yaw: number; // มุมหันศีรษะ ซ้าย-ขวา (-45° ถึง +45°)
  pitch: number; // มุมก้ม-เงย (-25° ถึง +25°)
  roll: number; // มุมเอียงศีรษะ (-20° ถึง +20°)
  isMaskDetected?: boolean | undefined;
}

export interface FaceQualityAssessment {
  quality: number; // คะแนนรวม 0.00 ถึง 1.00
  isAcceptable: boolean;
  issues: string[];
  metrics: {
    sizeScore: number;
    lightScore: number;
    sharpnessScore: number;
    poseScore: number;
    maskPenalty: number;
  };
}

/**
 * ประเมินคุณภาพของใบหน้าตามเกณฑ์การแพทย์และชีวมิติ
 */
export function evaluateFaceQuality(input: FaceQualityInput): FaceQualityAssessment {
  const issues: string[] = [];

  // 1. ตรวจสอบจำนวนใบหน้า (ต้องพบเพียง 1 คนเท่านั้น)
  if (input.faceCount === 0) {
    return {
      quality: 0,
      isAcceptable: false,
      issues: ["ไม่พบใบหน้าในกรอบภาพ"],
      metrics: { sizeScore: 0, lightScore: 0, sharpnessScore: 0, poseScore: 0, maskPenalty: 0 },
    };
  }

  if (input.faceCount > 1) {
    return {
      quality: 0,
      isAcceptable: false,
      issues: ["ตรวจพบใบหน้ามากกว่า 1 คนในกรอบภาพ"],
      metrics: { sizeScore: 0, lightScore: 0, sharpnessScore: 0, poseScore: 0, maskPenalty: 0 },
    };
  }

  // 2. ขนาดใบหน้าในกรอบ (ข้อกำหนด: 30% - 60% ของกรอบ)
  let sizeScore = 1.0;
  if (input.faceSizeRatio < 0.30) {
    // เล็กเกินไป (อยู่ไกลกล้อง)
    sizeScore = Math.max(0, 1 - (0.30 - input.faceSizeRatio) / 0.15);
    issues.push("กรุณาขยับเข้าใกล้กล้องอีกเล็กน้อย");
  } else if (input.faceSizeRatio > 0.60) {
    // ใหญ่เกินไป (อยู่ชิดกล้องเกินไป)
    sizeScore = Math.max(0, 1 - (input.faceSizeRatio - 0.60) / 0.20);
    issues.push("กรุณาขยับถอยห่างจากกล้องเล็กน้อย");
  }

  // 3. สภาพแสง (Lighting: เกณฑ์ >= 40, เหมาะสม 50 - 85)
  let lightScore = 1.0;
  if (input.lightingScore < 40) {
    lightScore = Math.max(0, input.lightingScore / 40);
    issues.push("แสงสว่างน้อยเกินไป กรุณาเพิ่มแสง");
  } else if (input.lightingScore > 92) {
    lightScore = Math.max(0.4, 1 - (input.lightingScore - 92) / 20);
    issues.push("แสงสะท้อนจ้าเกินไป");
  } else {
    lightScore = 1.0;
  }

  // 4. ความคมชัด (Sharpness: เกณฑ์ >= 65)
  let sharpnessScore = 1.0;
  if (input.sharpnessScore < 65) {
    sharpnessScore = Math.max(0, input.sharpnessScore / 65);
    issues.push("ภาพเบลอ กรุณานิ่งไว้สักครู่");
  }

  // 5. การเอียงศีรษะ (Pitch & Roll: ไม่ก้มเงยหรือเอียงคอมากเกินไป)
  let poseScore = 1.0;
  if (Math.abs(input.pitch) > 20) {
    poseScore *= 0.7;
    issues.push("กรุณาปรับระดับสายตาให้ตรงกับกล้อง ไม่ก้มหรือเงยศีรษะ");
  }
  if (Math.abs(input.roll) > 15) {
    poseScore *= 0.7;
    issues.push("กรุณาตั้งศีรษะตรง ไม่เอียงคอ");
  }

  // 6. ตรวจสอบการสวมหน้ากากอนามัย (Mask Detection)
  let maskPenalty = 0;
  if (input.isMaskDetected) {
    maskPenalty = 0.8;
    issues.push("กรุณาถอดหน้ากากอนามัยก่อนทำการสแกน");
  }

  // คำนวณคะแนนรวมถ่วงน้ำหนัก
  const weightedSum =
    sizeScore * 0.30 +
    lightScore * 0.25 +
    sharpnessScore * 0.25 +
    poseScore * 0.20;

  const finalQuality = Math.max(0, Math.min(1.0, weightedSum * (1 - maskPenalty)));

  // ปัดเศษทศนิยม 2 ตำแหน่ง
  const roundedQuality = Math.round(finalQuality * 100) / 100;

  // เกณฑ์ยอมรับ: คุณภาพรวม >= 0.60, ไม่มีหน้ากาก, ขนาดใบหน้า >= 0.25 และ <= 0.65
  const isAcceptable =
    roundedQuality >= 0.60 &&
    !input.isMaskDetected &&
    input.faceSizeRatio >= 0.25 &&
    input.faceSizeRatio <= 0.65;

  return {
    quality: roundedQuality,
    isAcceptable,
    issues,
    metrics: {
      sizeScore,
      lightScore,
      sharpnessScore,
      poseScore,
      maskPenalty,
    },
  };
}
