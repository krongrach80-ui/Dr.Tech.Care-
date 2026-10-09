"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import {
  LivenessPose,
  CameraErrorInfo,
  CAMERA_ERROR_CATALOG,
  classifyCameraStreamError,
  checkPoseYawCompliance,
  extract128dEmbeddingFromPose,
} from "@/lib/biometrics";
import {
  initializeFaceLandmarker,
  cleanupFaceLandmarker,
  detectFaceLandmarksFromVideo,
  extractEmbeddingFromLandmarks,
} from "@/lib/mediapipe";
import { registerActiveKioskMediaStream } from "@/lib/kiosk";

export interface FaceQualityReport {
  lightingScore: number;
  faceSizeRatio: number;
  facesCount: number;
  isAcceptable: boolean;
  warningMessage?: string | undefined;
}

export interface UseFaceLandmarkerOptions {
  autoStart?: boolean;
  initialFacingMode?: "user" | "environment";
  detectionIntervalMs?: number;
  onPoseCompliant?: (pose: LivenessPose, yaw: number) => void;
  onError?: (error: CameraErrorInfo) => void;
}

export function useFaceLandmarker({
  autoStart = true,
  initialFacingMode = "user",
  detectionIntervalMs = 150,
  onError,
}: UseFaceLandmarkerOptions = {}) {
  // สถานะโมเดลและกล้อง
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(initialFacingMode);

  // สถานะ Error และการแจ้งเตือน
  const [errorInfo, setErrorInfo] = useState<CameraErrorInfo | null>(null);

  // ค่าการตรวจจับแบบเรียลไทม์
  const [facesCount, setFacesCount] = useState<number>(0);
  const [yaw, setYaw] = useState<number>(0);
  const [pitch, setPitch] = useState<number>(0);
  const [roll, setRoll] = useState<number>(0);
  const [faceSizeRatio, setFaceSizeRatio] = useState<number>(0);
  const [lightingScore, setLightingScore] = useState<number>(85);

  // Refs สำหรับการควบคุม WebRTC และโมเดล
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);

  // 1. หยุดกล้องและล้างสตรีม
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    registerActiveKioskMediaStream(null);
    setIsCameraActive(false);
  }, []);

  // 2. หยุดและคืนหน่วยความจำโมเดล
  const stopModel = useCallback(() => {
    cleanupFaceLandmarker();
    landmarkerRef.current = null;
    setIsModelReady(false);
  }, []);

  // 3. ทำความสะอาดทรัพยากรทั้งหมด (ทั้งกล้องและโมเดล)
  const cleanupAll = useCallback(() => {
    stopCamera();
    stopModel();
  }, [stopCamera, stopModel]);

  // 4. ขอสิทธิ์และเปิดกล้อง getUserMedia
  const startCamera = useCallback(
    async (targetFacing: "user" | "environment" = facingMode) => {
      stopCamera();
      setErrorInfo(null);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        const err = CAMERA_ERROR_CATALOG.not_found;
        setErrorInfo(err);
        onError?.(err);
        return;
      }

      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        try {
          // Fallback: ขอวิดีโอแบบไม่จำกัด constraint
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (secondErr) {
          const rawErr = secondErr instanceof Error ? secondErr : firstErr;
          const classified = classifyCameraStreamError(rawErr);
          setErrorInfo(classified);
          onError?.(classified);
          return;
        }
      }

      if (stream) {
        streamRef.current = stream;
        registerActiveKioskMediaStream(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play().catch(() => {});
            setIsCameraActive(true);
          };
        } else {
          setIsCameraActive(true);
        }
      }
    },
    [facingMode, stopCamera, onError]
  );

  // 5. โหลดโมเดล MediaPipe FaceLandmarker พร้อม GPU/CPU Fallback
  const loadModel = useCallback(async () => {
    setIsModelLoading(true);
    setErrorInfo(null);

    try {
      const landmarker = await initializeFaceLandmarker();
      if (landmarker) {
        landmarkerRef.current = landmarker;
        setIsModelReady(true);
        setIsModelLoading(false);
      } else {
        throw new Error("Cannot load FaceLandmarker from local WASM/Model");
      }
    } catch {
      setIsModelLoading(false);
      setIsModelReady(false);
      const loadErr: CameraErrorInfo = {
        category: "unknown",
        title: "โหลดโมเดลตรวจจับใบหน้าไม่สำเร็จ",
        description: "ระบบไม่สามารถเริ่มต้นไฟล์ประมวลผล FaceLandmarker บนเบราว์เซอร์ได้",
        suggestion: "กรุณารีเฟรชหน้าต่างเบราว์เซอร์ หรือติดต่อเจ้าหน้าที่ไอทีของคลินิก",
      };
      setErrorInfo(loadErr);
      onError?.(loadErr);
    }
  }, [onError]);

  // 6. สลับกล้องหน้า/กล้องหลัง
  const switchFacingMode = useCallback(() => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    void startCamera(next);
  }, [facingMode, startCamera]);

  // 7. สกัดเวกเตอร์ชีวมิติ 128 มิติ (Embedding Float32)
  const extractEmbedding = useCallback(
    (pose: LivenessPose, challengeNonce: string): number[] => {
      if (latestLandmarksRef.current && latestLandmarksRef.current.length >= 100) {
        return extractEmbeddingFromLandmarks(
          latestLandmarksRef.current,
          pose,
          challengeNonce
        );
      }
      return extract128dEmbeddingFromPose(pose, challengeNonce);
    },
    []
  );

  // 8. ตรวจสอบคุณภาพใบหน้า
  const getQualityReport = useCallback((): FaceQualityReport => {
    let warningMessage: string | undefined;
    let isAcceptable = true;

    if (facesCount === 0) {
      isAcceptable = false;
      warningMessage = "ไม่พบใบหน้าในกรอบสแกน";
    } else if (facesCount > 1) {
      isAcceptable = false;
      warningMessage = "มีมากกว่า 1 ใบหน้าในเฟรมกล้อง";
    } else if (lightingScore < 35) {
      isAcceptable = false;
      warningMessage = "แสงสว่างไม่เพียงพอ";
    } else if (faceSizeRatio < 0.18) {
      isAcceptable = false;
      warningMessage = "กรุณาขยับเข้าใกล้กล้องอีกเล็กน้อย";
    } else if (faceSizeRatio > 0.75) {
      isAcceptable = false;
      warningMessage = "กรุณาถอยห่างจากกล้องอีกเล็กน้อย";
    }

    return {
      lightingScore,
      faceSizeRatio,
      facesCount,
      isAcceptable,
      warningMessage,
    };
  }, [facesCount, lightingScore, faceSizeRatio]);

  // 9. Real-time Detection Loop
  useEffect(() => {
    if (!isCameraActive) return undefined;

    let isRunning = true;
    let tickTimer: NodeJS.Timeout | null = null;

    const detectFrame = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && !video.paused) {
        const result = detectFaceLandmarksFromVideo(video, performance.now());

        setFacesCount(result.facesCount);
        setYaw(result.yaw);
        setPitch(result.pitch);
        setRoll(result.roll);
        setFaceSizeRatio(result.faceSizeRatio);

        if (result.faceDetected && result.landmarks) {
          latestLandmarksRef.current = result.landmarks;

          if (result.facesCount > 1) {
            setErrorInfo(CAMERA_ERROR_CATALOG.multiple_faces);
          }
        }
      }

      tickTimer = setTimeout(detectFrame, detectionIntervalMs);
    };

    detectFrame();

    return () => {
      isRunning = false;
      if (tickTimer) clearTimeout(tickTimer);
    };
  }, [isCameraActive, detectionIntervalMs]);

  // 10. Lifecycle Init & Cleanup เมื่อ Unmount
  useEffect(() => {
    let isCancelled = false;

    if (autoStart) {
      const timer = setTimeout(() => {
        if (!isCancelled) {
          void loadModel();
          void startCamera(facingMode);
        }
      }, 0);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        cleanupAll();
      };
    }

    return () => {
      isCancelled = true;
      cleanupAll();
    };
  }, [autoStart, facingMode, loadModel, startCamera, cleanupAll]);

  return {
    // Refs
    videoRef,

    // สถานะ
    isModelLoading,
    isModelReady,
    isCameraActive,
    facingMode,
    errorInfo,

    // ค่าเมตริกใบหน้าแบบเรียลไทม์
    facesCount,
    yaw,
    pitch,
    roll,
    faceSizeRatio,
    lightingScore,

    // ฟังก์ชันสั่งการ
    startCamera,
    stopCamera,
    switchFacingMode,
    loadModel,
    cleanupAll,
    extractEmbedding,
    getQualityReport,
    checkPoseYawCompliance: (pose: LivenessPose) => checkPoseYawCompliance(pose, yaw),
    setLightingScore,
  };
}
