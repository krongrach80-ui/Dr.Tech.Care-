"use client";

import type { FaceLandmarker, PoseLandmarker } from "@mediapipe/tasks-vision";

export type DelegateType = "GPU" | "CPU";
export type PoseModelVariant = "lite" | "full";

export interface MediaPipeInstances {
  faceLandmarker: FaceLandmarker | null;
  poseLandmarkerLite: PoseLandmarker | null;
  poseLandmarkerFull: PoseLandmarker | null;
  actualDelegate: DelegateType | null;
}

// Singleton Cache Instances
let cachedVisionResolver: unknown = null;
let cachedFaceLandmarker: FaceLandmarker | null = null;
let cachedPoseLandmarkerLite: PoseLandmarker | null = null;
let cachedPoseLandmarkerFull: PoseLandmarker | null = null;
let actualDelegateInUse: DelegateType | null = null;

// Lock flags to prevent race conditions during async initialization
let isInitializingFace = false;
let isInitializingPoseLite = false;
let isInitializingPoseFull = false;

/**
 * โหลด FilesetResolver สำหรับ Vision Tasks จาก Local WASM (/models/mediapipe/wasm)
 * ไม่พึ่งพา CDN ภายนอกตอนรันจริง
 */
export async function getVisionResolver(): Promise<unknown> {
  if (typeof window === "undefined") {
    throw new Error("MediaPipe loader can only be executed in browser environment");
  }

  if (cachedVisionResolver) {
    return cachedVisionResolver;
  }

  const { FilesetResolver } = await import("@mediapipe/tasks-vision");
  const wasmPath = `${window.location.origin}/models/mediapipe/wasm`;

  try {
    cachedVisionResolver = await FilesetResolver.forVisionTasks(wasmPath);
  } catch (localErr) {
    console.warn("Could not load local WASM, falling back to /wasm path:", localErr);
    cachedVisionResolver = await FilesetResolver.forVisionTasks(`${window.location.origin}/wasm`);
  }

  return cachedVisionResolver;
}

/**
 * สร้างหรือดึง singleton instance ของ FaceLandmarker
 * runningMode: VIDEO, numFaces: 2, outputFacialTransformationMatrixes: true
 * พยายามใช้ GPU ก่อน และ Fallback เป็น CPU อัตโนมัติเมื่อ GPU ล้มเหลว
 */
export async function createFaceLandmarker(): Promise<FaceLandmarker> {
  if (typeof window === "undefined") {
    throw new Error("createFaceLandmarker must be called on client-side");
  }

  if (cachedFaceLandmarker) {
    return cachedFaceLandmarker;
  }

  if (isInitializingFace) {
    while (isInitializingFace) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (cachedFaceLandmarker) return cachedFaceLandmarker;
  }

  isInitializingFace = true;

  try {
    const { FaceLandmarker } = await import("@mediapipe/tasks-vision");
    const vision = (await getVisionResolver()) as Parameters<typeof FaceLandmarker.createFromOptions>[0];
    const modelAssetPath = `${window.location.origin}/models/face_landmarker.task`;

    // 1. ลองใช้ GPU Delegate
    try {
      cachedFaceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numFaces: 2,
        outputFacialTransformationMatrixes: true,
      });
      actualDelegateInUse = "GPU";
      return cachedFaceLandmarker;
    } catch (gpuError) {
      console.warn("FaceLandmarker GPU delegate failed, falling back to CPU:", gpuError);
      // 2. Fallback เป็น CPU Delegate
      cachedFaceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numFaces: 2,
        outputFacialTransformationMatrixes: true,
      });
      actualDelegateInUse = "CPU";
      return cachedFaceLandmarker;
    }
  } finally {
    isInitializingFace = false;
  }
}

/**
 * สร้างหรือดึง singleton instance ของ PoseLandmarker (lite หรือ full)
 * delegate: GPU → fallback CPU อัตโนมัติ
 */
export async function createPoseLandmarker(
  model: PoseModelVariant = "lite"
): Promise<PoseLandmarker> {
  if (typeof window === "undefined") {
    throw new Error("createPoseLandmarker must be called on client-side");
  }

  if (model === "lite" && cachedPoseLandmarkerLite) {
    return cachedPoseLandmarkerLite;
  }
  if (model === "full" && cachedPoseLandmarkerFull) {
    return cachedPoseLandmarkerFull;
  }

  const isInitializing = model === "lite" ? isInitializingPoseLite : isInitializingPoseFull;
  if (isInitializing) {
    while (model === "lite" ? isInitializingPoseLite : isInitializingPoseFull) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (model === "lite" && cachedPoseLandmarkerLite) return cachedPoseLandmarkerLite;
    if (model === "full" && cachedPoseLandmarkerFull) return cachedPoseLandmarkerFull;
  }

  if (model === "lite") isInitializingPoseLite = true;
  else isInitializingPoseFull = true;

  try {
    const { PoseLandmarker } = await import("@mediapipe/tasks-vision");
    const vision = (await getVisionResolver()) as Parameters<typeof PoseLandmarker.createFromOptions>[0];
    const modelFileName = model === "lite" ? "pose_landmarker_lite.task" : "pose_landmarker_full.task";
    const modelAssetPath = `${window.location.origin}/models/${modelFileName}`;

    let instance: PoseLandmarker;

    // 1. ลองใช้ GPU Delegate
    try {
      instance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      actualDelegateInUse = "GPU";
    } catch (gpuError) {
      console.warn(`PoseLandmarker (${model}) GPU delegate failed, falling back to CPU:`, gpuError);
      // 2. Fallback เป็น CPU Delegate
      instance = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath,
          delegate: "CPU",
        },
        runningMode: "VIDEO",
        numPoses: 1,
      });
      actualDelegateInUse = "CPU";
    }

    if (model === "lite") {
      cachedPoseLandmarkerLite = instance;
    } else {
      cachedPoseLandmarkerFull = instance;
    }

    return instance;
  } finally {
    if (model === "lite") isInitializingPoseLite = false;
    else isInitializingPoseFull = false;
  }
}

/**
 * คืนค่า Delegate ปัจจุบันที่กำลังใช้งาน (GPU หรือ CPU)
 */
export function getActualDelegate(): DelegateType | null {
  return actualDelegateInUse;
}

/**
 * คืนสถานะ Active Instances ทั้งหมด
 */
export function getMediaPipeInstances(): MediaPipeInstances {
  return {
    faceLandmarker: cachedFaceLandmarker,
    poseLandmarkerLite: cachedPoseLandmarkerLite,
    poseLandmarkerFull: cachedPoseLandmarkerFull,
    actualDelegate: actualDelegateInUse,
  };
}

/**
 * ทำลายและคืนหน่วยความจำ WebGL / WebAssembly ของทุก Landmarker Instance ทันที
 */
export function dispose(): void {
  if (cachedFaceLandmarker) {
    try {
      cachedFaceLandmarker.close();
    } catch (e) {
      console.warn("Error closing cached FaceLandmarker:", e);
    }
    cachedFaceLandmarker = null;
  }

  if (cachedPoseLandmarkerLite) {
    try {
      cachedPoseLandmarkerLite.close();
    } catch (e) {
      console.warn("Error closing cached PoseLandmarkerLite:", e);
    }
    cachedPoseLandmarkerLite = null;
  }

  if (cachedPoseLandmarkerFull) {
    try {
      cachedPoseLandmarkerFull.close();
    } catch (e) {
      console.warn("Error closing cached PoseLandmarkerFull:", e);
    }
    cachedPoseLandmarkerFull = null;
  }

  cachedVisionResolver = null;
  actualDelegateInUse = null;
  isInitializingFace = false;
  isInitializingPoseLite = false;
  isInitializingPoseFull = false;
}
