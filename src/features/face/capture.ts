/**
 * src/features/face/capture.ts
 * Dr.Tech.Care — Face Pose Frame Collector & Vector Averaging Engine (PDPA Zero-Image Retention)
 * เก็บ 3 เฟรมดีสุดต่อท่า -> embedding เฉลี่ย -> ทิ้งเฟรมทันที ส่งเฉพาะตัวเลข + nonce
 */

import { LivenessPose } from "@/lib/biometrics";

export interface CapturedFrameCandidate {
  embedding: number[]; // 128-d Vector
  quality: number; // 0.0 - 1.0
  yaw: number;
  capturedAt: number;
}

export interface PoseEmbeddingResult {
  pose: LivenessPose;
  averageEmbedding: number[]; // 128-d Vector หน่วย Normalized L2
  bestQuality: number;
  averageQuality: number;
  capturedYaw: number;
  frameCount: number;
}

/**
 * คำนวณ Euclidean L2 Norm และ Normalize เวกเตอร์ให้มีความยาว 1.0
 */
export function normalizeVector(vec: number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    const val = vec[i] ?? 0;
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec.slice();
  return vec.map((v) => v / norm);
}

/**
 * คำนวณเวกเตอร์เฉลี่ยจาก 3 เฟรมที่ดีที่สุด
 */
export function computeAverageEmbedding(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return [];
  const dim = embeddings[0]?.length ?? 128;
  const sumVec = new Array<number>(dim).fill(0);

  for (const emb of embeddings) {
    for (let i = 0; i < dim; i++) {
      sumVec[i] = (sumVec[i] ?? 0) + (emb[i] ?? 0);
    }
  }

  const count = embeddings.length;
  const avgVec = sumVec.map((val) => val / count);
  return normalizeVector(avgVec);
}

/**
 * คลาสบริหารจัดการการเก็บเฟรมที่ดีที่สุด 3 เฟรมต่อท่า
 * ทิ้งข้อมูลภาพดิบทันที เก็บเฉพาะตัวเลขเวกเตอร์ 128 มิติและคะแนนคุณภาพ
 */
export class PoseFrameCollector {
  private candidates: CapturedFrameCandidate[] = [];
  public readonly targetPose: LivenessPose;
  public readonly maxFrames: number;

  constructor(targetPose: LivenessPose, maxFrames = 3) {
    this.targetPose = targetPose;
    this.maxFrames = maxFrames;
  }

  /**
   * เพิ่มเฟรมใหม่ และรักษาเฉพาะ top 3 เฟรมที่มีคะแนนคุณภาพสูงสุด
   */
  public addCandidate(candidate: CapturedFrameCandidate): boolean {
    if (candidate.embedding.length !== 128) {
      throw new Error(`Embedding must be 128-dimensional vector, got ${candidate.embedding.length}`);
    }

    this.candidates.push({ ...candidate });

    // เรียงลำดับตามคุณภาพจากสูงไปต่ำ
    this.candidates.sort((a, b) => b.quality - a.quality);

    // เก็บเฉพาะ 3 เฟรมที่ดีที่สุด
    if (this.candidates.length > this.maxFrames) {
      this.candidates = this.candidates.slice(0, this.maxFrames);
    }

    return this.candidates.length >= this.maxFrames;
  }

  public get count(): number {
    return this.candidates.length;
  }

  public isComplete(): boolean {
    return this.candidates.length >= this.maxFrames;
  }

  /**
   * สรุปผลเวกเตอร์เฉลี่ยและคะแนนคุณภาพ
   */
  public getResult(): PoseEmbeddingResult {
    if (this.candidates.length === 0) {
      throw new Error(`No frames captured for pose ${this.targetPose}`);
    }

    const embeddings = this.candidates.map((c) => c.embedding);
    const avgEmbedding = computeAverageEmbedding(embeddings);

    const qualitySum = this.candidates.reduce((acc, c) => acc + c.quality, 0);
    const bestQuality = this.candidates[0]?.quality ?? 0;
    const avgQuality = Math.round((qualitySum / this.candidates.length) * 100) / 100;
    const capturedYaw = this.candidates[0]?.yaw ?? 0;

    return {
      pose: this.targetPose,
      averageEmbedding: avgEmbedding,
      bestQuality,
      averageQuality: avgQuality,
      capturedYaw,
      frameCount: this.candidates.length,
    };
  }

  /**
   * ล้างข้อมูลในหน่วยความจำ
   */
  public clear(): void {
    this.candidates = [];
  }
}
