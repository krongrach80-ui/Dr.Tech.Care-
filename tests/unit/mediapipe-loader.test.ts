import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EMBEDDING_DIM } from "@/features/face/embedder";
import {
  createFaceLandmarker,
  createPoseLandmarker,
  dispose,
  getActualDelegate,
  getMediaPipeInstances,
} from "@/lib/mediapipe/loader";

// Mock เฉพาะ @mediapipe/tasks-vision ในชั้น Unit Test เพื่อทดสอบ Singleton, Fallback และ Dispose
const mockCloseFn = vi.fn();
const mockFaceLandmarkerCreate = vi.fn();
const mockPoseLandmarkerCreate = vi.fn();
const mockForVisionTasks = vi.fn();

vi.mock("@mediapipe/tasks-vision", () => {
  return {
    FilesetResolver: {
      forVisionTasks: (...args: unknown[]) => mockForVisionTasks(...args),
    },
    FaceLandmarker: {
      createFromOptions: (...args: unknown[]) => mockFaceLandmarkerCreate(...args),
    },
    PoseLandmarker: {
      createFromOptions: (...args: unknown[]) => mockPoseLandmarkerCreate(...args),
    },
  };
});

describe("Biometric Embedding Dimension Standards", () => {
  it("EMBEDDING_DIM ต้องเท่ากับ 128 มิติตามมาตรฐาน PDPA biometric embedding", () => {
    expect(EMBEDDING_DIM).toBe(128);
  });
});

describe("MediaPipe Loader & Resource Lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispose();

    mockForVisionTasks.mockResolvedValue({ wasmPath: "/mock/wasm" });

    // ค่าเริ่มต้นของ mock instances
    mockFaceLandmarkerCreate.mockResolvedValue({
      detectForVideo: vi.fn(),
      close: mockCloseFn,
    });

    mockPoseLandmarkerCreate.mockResolvedValue({
      detectForVideo: vi.fn(),
      close: mockCloseFn,
    });
  });

  afterEach(() => {
    dispose();
  });

  it("สร้าง FaceLandmarker ได้สำเร็จและเก็บแคชแบบ Singleton", async () => {
    const firstInstance = await createFaceLandmarker();
    expect(firstInstance).toBeDefined();
    expect(mockFaceLandmarkerCreate).toHaveBeenCalledTimes(1);

    // เรียกครั้งที่สองต้องได้ instance เดิมจากแคช โดยไม่สร้างซ้ำ
    const secondInstance = await createFaceLandmarker();
    expect(secondInstance).toBe(firstInstance);
    expect(mockFaceLandmarkerCreate).toHaveBeenCalledTimes(1);
  });

  it("รองรับการ Fallback จาก GPU ไปยัง CPU เมื่อ GPU Delegate ล้มเหลว", async () => {
    // กำหนดให้ GPU รอบแรกล้มเหลว แล้วรอบสอง (CPU) สำเร็จ
    mockFaceLandmarkerCreate
      .mockRejectedValueOnce(new Error("WebGL Context Lost or Not Supported"))
      .mockResolvedValueOnce({
        detectForVideo: vi.fn(),
        close: mockCloseFn,
      });

    const instance = await createFaceLandmarker();
    expect(instance).toBeDefined();

    // ต้องมีการลองเรียก 2 ครั้ง (GPU -> CPU)
    expect(mockFaceLandmarkerCreate).toHaveBeenCalledTimes(2);
    expect(getActualDelegate()).toBe("CPU");
  });

  it("สร้าง PoseLandmarker (lite และ full) แยกแคชกันถูกต้อง", async () => {
    const liteInstance = await createPoseLandmarker("lite");
    const fullInstance = await createPoseLandmarker("full");

    expect(liteInstance).toBeDefined();
    expect(fullInstance).toBeDefined();
    expect(mockPoseLandmarkerCreate).toHaveBeenCalledTimes(2);

    // ดึงซ้ำต้องใช้แคช
    const liteCached = await createPoseLandmarker("lite");
    expect(liteCached).toBe(liteInstance);
    expect(mockPoseLandmarkerCreate).toHaveBeenCalledTimes(2);
  });

  it("ฟังก์ชัน dispose() ปิดทุก instance และคืนหน่วยความจำอย่างสมบูรณ์", async () => {
    await createFaceLandmarker();
    await createPoseLandmarker("lite");

    const instancesBefore = getMediaPipeInstances();
    expect(instancesBefore.faceLandmarker).not.toBeNull();
    expect(instancesBefore.poseLandmarkerLite).not.toBeNull();

    // เรียก dispose
    dispose();

    expect(mockCloseFn).toHaveBeenCalledTimes(2);

    const instancesAfter = getMediaPipeInstances();
    expect(instancesAfter.faceLandmarker).toBeNull();
    expect(instancesAfter.poseLandmarkerLite).toBeNull();
    expect(instancesAfter.actualDelegate).toBeNull();
  });
});
