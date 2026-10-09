"use client";

import type * as FaceApiTypes from "@vladmandic/face-api";

/**
 * ขนาดมิติของเวกเตอร์ชีวมิติใบหน้าตามมาตรฐาน PDPA
 * ห้ามเปลี่ยนค่าหรือกำหนดซ้ำที่อื่น (Single Source of Truth)
 */
export const EMBEDDING_DIM = 128;

export type VideoOrCanvasFrame = HTMLVideoElement | HTMLCanvasElement | ImageData | HTMLImageElement;

export interface FaceEmbedder {
  /**
   * สกัดเวกเตอร์ชีวมิติความยาว 128 มิติจากภาพใบหน้า
   * ไม่มีการบันทึกภาพถ่ายหรือส่งภาพออกนอกอุปกรณ์ (PDPA Privacy by Design)
   */
  embed(frame: VideoOrCanvasFrame): Promise<number[]>;
}

let faceApiInstance: typeof FaceApiTypes | null = null;
let isModelsLoaded = false;
let isModelLoadingPromise: Promise<void> | null = null;

/**
 * โหลดน้ำหนักโมเดล face-api จาก Local Storage (/models/face-api)
 * ไม่พึ่งพา CDN ภายนอก
 */
export async function loadFaceApiModels(): Promise<typeof FaceApiTypes> {
  if (typeof window === "undefined") {
    throw new Error("face-api can only run in a browser environment");
  }

  if (faceApiInstance && isModelsLoaded) {
    return faceApiInstance;
  }

  if (isModelLoadingPromise) {
    await isModelLoadingPromise;
    if (faceApiInstance && isModelsLoaded) {
      return faceApiInstance;
    }
  }

  isModelLoadingPromise = (async () => {
    const faceapi = await import("@vladmandic/face-api");
    faceApiInstance = faceapi;

    const modelPath = `${window.location.origin}/models/face-api`;

    // โหลดโมเดลสำหรับตรวจจับใบหน้า, Landmark 68 จุด และการสกัดเวกเตอร์ 128 มิติ
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
    ]);

    isModelsLoaded = true;
  })();

  await isModelLoadingPromise;
  isModelLoadingPromise = null;

  if (!faceApiInstance) {
    throw new Error("Failed to initialize @vladmandic/face-api");
  }

  return faceApiInstance;
}

/**
 * Implementation ของ FaceEmbedder โดยใช้ @vladmandic/face-api
 */
export class VladmandicFaceEmbedder implements FaceEmbedder {
  private isReady = false;

  async init(): Promise<void> {
    if (this.isReady) return;
    await loadFaceApiModels();
    this.isReady = true;
  }

  async embed(frame: VideoOrCanvasFrame): Promise<number[]> {
    if (!this.isReady) {
      await this.init();
    }

    if (!faceApiInstance) {
      throw new Error("Face-api models are not initialized");
    }

    // สกัด Landmark และคำนวณ Face Descriptor ขนาด 128 มิติ
    const detection = await faceApiInstance
      .detectSingleFace(frame as FaceApiTypes.TNetInput)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      throw new Error("No face detected for biometric embedding extraction");
    }

    const descriptorArray = Array.from(detection.descriptor);

    if (descriptorArray.length !== EMBEDDING_DIM) {
      throw new Error(
        `Invalid biometric descriptor dimension: expected ${EMBEDDING_DIM}, got ${descriptorArray.length}`
      );
    }

    return descriptorArray;
  }
}

// Default Singleton Instance
let defaultEmbedder: FaceEmbedder | null = null;

export function getFaceEmbedder(): FaceEmbedder {
  if (!defaultEmbedder) {
    defaultEmbedder = new VladmandicFaceEmbedder();
  }
  return defaultEmbedder;
}
