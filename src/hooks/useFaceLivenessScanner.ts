"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  LivenessPose,
  ServerChallenge,
  FaceQualityMetrics,
  BiometricVerificationPayload,
  CameraErrorInfo,
  CameraErrorCategory,
  generateServerChallenge,
  classifyCameraStreamError,
  extract128dEmbeddingFromPose,
  getStepVoicePrompt,
  verifyBiometricSubmission,
  CAMERA_ERROR_CATALOG,
} from "@/lib/biometrics";
import { registerActiveKioskMediaStream } from "@/lib/kiosk";
import { speakThai, stopSpeech } from "@/lib/speech";

export type ScannerStatus =
  | "idle"
  | "initializing"
  | "ready"
  | "scanning"
  | "verifying"
  | "success"
  | "error";

export interface UseFaceLivenessScannerOptions {
  challenge?: ServerChallenge | undefined;
  speechEnabled?: boolean | undefined;
  initialFacingMode?: ("user" | "environment") | undefined;
  stepTimeoutSeconds?: number | undefined;
  onStepComplete?:
    | ((stepNumber: 1 | 2 | 3, pose: LivenessPose, payload: BiometricVerificationPayload) => void)
    | undefined;
  onAllStepsComplete?: ((payload: BiometricVerificationPayload) => void) | undefined;
  onError?: ((error: CameraErrorInfo) => void) | undefined;
}

export function useFaceLivenessScanner({
  challenge: externalChallenge,
  speechEnabled = true,
  initialFacingMode = "user",
  stepTimeoutSeconds = 15,
  onStepComplete,
  onAllStepsComplete,
  onError,
}: UseFaceLivenessScannerOptions = {}) {
  const [challenge, setChallenge] = useState<ServerChallenge>(() =>
    externalChallenge ?? generateServerChallenge()
  );

  const [currentStepIndex, setCurrentStepIndex] = useState<0 | 1 | 2>(0);
  const [status, setStatus] = useState<ScannerStatus>("idle");
  const [errorInfo, setErrorInfo] = useState<CameraErrorInfo | null>(null);
  const [isSimulatedMode, setIsSimulatedMode] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">(initialFacingMode);

  // คุณภาพใบหน้าแบบเรียลไทม์
  const [qualityMetrics, setQualityMetrics] = useState<FaceQualityMetrics>({
    faceSizeRatio: 0.42,
    lightingScore: 85,
    sharpnessScore: 90,
    yawAngle: 0,
    pitchAngle: 0,
    rollAngle: 0,
    isAcceptable: true,
    facesDetected: 1,
  });

  // ตัวนับเวลาถอยหลังประจำแต่ละขั้นตอน (ค่าเริ่มต้น 15s)
  const [stepSecondsLeft, setStepSecondsLeft] = useState<number>(stepTimeoutSeconds);

  // สถานะเสียงพูด
  const [isMuted, setIsMuted] = useState(!speechEnabled);

  // Refs สำหรับการควบคุม WebRTC และ Lifecycle
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ท่าปัจจุบันตาม sequence จาก Server Challenge
  const currentPose: LivenessPose = challenge.sequence[currentStepIndex];
  const stepNumber: 1 | 2 | 3 = (currentStepIndex + 1) as 1 | 2 | 3;

  // หยุด Stream กล้องและล้างค่าทรัพยากร
  const stopActiveStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    registerActiveKioskMediaStream(null);
    stopSpeech();
  }, []);

  // ขอสิทธิ์และเปิดกล้องจากอุปกรณ์ด้วย getUserMedia (facingMode: 'user') พร้อม 2-stage fallback
  const startCamera = useCallback(
    async (targetFacing: "user" | "environment" = facingMode) => {
      stopActiveStream();
      setStatus("initializing");
      setErrorInfo(null);

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        const err = CAMERA_ERROR_CATALOG.not_found;
        setErrorInfo(err);
        setStatus("error");
        onError?.(err);
        return;
      }

      let stream: MediaStream | null = null;

      try {
        // ขั้นที่ 1: ขอความละเอียด 1280x720 พร้อม facingMode ที่ระบุ
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        // ขั้นที่ 2: หาก constraint ไม่รองรับ ให้ fallback เป็น video: true
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (secondErr) {
          const rawErr = secondErr instanceof Error ? secondErr : firstErr;
          const classified = classifyCameraStreamError(rawErr);
          setErrorInfo(classified);
          setStatus("error");
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
            setStatus("scanning");
          };
        } else {
          setStatus("scanning");
        }
      }
    },
    [facingMode, stopActiveStream, onError]
  );

  // สลับกล้องหน้า/หลัง
  const toggleFacingMode = useCallback(() => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    void startCamera(nextMode);
  }, [facingMode, startCamera]);

  // สลับเปิด/ปิดเสียงบรรยายภาษาไทย
  const toggleSpeech = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) stopSpeech();
      return next;
    });
  }, []);

  // กำหนดให้เกิด Error เฉพาะกิจเพื่อการทดสอบ / สาธิตการทำงาน
  const triggerSpecificError = useCallback(
    (category: CameraErrorCategory) => {
      if (category === "none") {
        setErrorInfo(null);
        setStatus("scanning");
        return;
      }
      const err = CAMERA_ERROR_CATALOG[category];
      setErrorInfo(err);
      setStatus("error");
      onError?.(err);
      speakThai(err.description, !isMuted);
    },
    [isMuted, onError]
  );

  // เริ่มต้นรอบการสแกนใหม่ทั้งหมด (Reset State)
  const restartScan = useCallback(() => {
    stopSpeech();
    setErrorInfo(null);
    setCurrentStepIndex(0);
    setStepSecondsLeft(stepTimeoutSeconds);
    const newChallenge = generateServerChallenge();
    setChallenge(newChallenge);

    if (isSimulatedMode) {
      setStatus("scanning");
    } else {
      void startCamera(facingMode);
    }
  }, [facingMode, isSimulatedMode, startCamera, stepTimeoutSeconds]);

  // ยืนยันผ่านขั้นตอนปัจจุบันและคำนวณเวกเตอร์ชีวมิติ
  const completeCurrentStep = useCallback(() => {
    setErrorInfo(null);
    const embedding = extract128dEmbeddingFromPose(currentPose, challenge.nonce);

    // จำลองมุม Yaw ที่ถูกต้องตามท่านั้น ๆ
    const capturedYaw = currentPose === "center" ? 0 : currentPose === "left" ? -28 : 28;

    const payload: BiometricVerificationPayload = {
      challengeNonce: challenge.nonce,
      embedding,
      quality: {
        ...qualityMetrics,
        yawAngle: capturedYaw,
      },
      capturedYaw,
      poseSequence: challenge.sequence,
      verifiedAt: Date.now(),
    };

    onStepComplete?.(stepNumber, currentPose, payload);

    if (currentStepIndex < 2) {
      // เลื่อนไปขั้นตอนถัดไป (1 -> 2 หรือ 2 -> 3)
      setCurrentStepIndex((prev) => ((prev + 1) as 0 | 1 | 2));
      setStepSecondsLeft(stepTimeoutSeconds);
    } else {
      // สแกนครบทั้ง 3 ขั้นตอน -> ทำการตรวจสอบ Payload กับ Server Challenge
      setStatus("verifying");
      const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
      const verification = verifyBiometricSubmission(payload, challenge, isOnline);

      if (!verification.success && verification.errorCategory && verification.errorCategory !== "none") {
        const err = CAMERA_ERROR_CATALOG[verification.errorCategory];
        setErrorInfo(err);
        setStatus("error");
        onError?.(err);
        speakThai(err.description, !isMuted);
      } else {
        setStatus("success");
        onAllStepsComplete?.(payload);
        speakThai("ยืนยันตัวตนสำเร็จ กำลังเข้าสู่หน้าหลักครับ", !isMuted);
      }
    }
  }, [
    currentPose,
    challenge,
    qualityMetrics,
    stepNumber,
    currentStepIndex,
    stepTimeoutSeconds,
    onStepComplete,
    onError,
    onAllStepsComplete,
    isMuted,
  ]);

  // เสียงพูดนำทางตามแต่ละขั้นตอน
  useEffect(() => {
    if (status === "scanning" && !isMuted) {
      const voiceText = getStepVoicePrompt(stepNumber, currentPose);
      speakThai(voiceText, true);
    }
  }, [currentStepIndex, status, isMuted, stepNumber, currentPose]);

  // นับเวลาถอยหลัง 15 วินาทีในแต่ละขั้นตอน
  useEffect(() => {
    if (status !== "scanning") return undefined;

    const timer = setInterval(() => {
      setStepSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const timeoutErr = CAMERA_ERROR_CATALOG.timeout;
          setErrorInfo(timeoutErr);
          setStatus("error");
          onError?.(timeoutErr);
          speakThai("หมดเวลาในการสแกน กรุณากดปุ่มลองใหม่อีกครั้งครับ", !isMuted);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStepIndex, status, onError, isMuted]);

  // เริ่มกล้องอัตโนมัติเมื่อ Mount (ใช้ setTimeout 0 เพื่อไม่ให้เกิด cascading synchronous setState ใน render effect)
  useEffect(() => {
    let isCancelled = false;
    if (!isSimulatedMode) {
      const timer = setTimeout(() => {
        if (!isCancelled) {
          void startCamera(facingMode);
        }
      }, 0);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        stopActiveStream();
      };
    }
    return () => {
      isCancelled = true;
      stopActiveStream();
    };
  }, [facingMode, isSimulatedMode, startCamera, stopActiveStream]);

  return {
    // State
    status,
    challenge,
    currentStepIndex,
    stepNumber,
    totalSteps: 3 as const,
    currentPose,
    stepSecondsLeft,
    qualityMetrics,
    errorInfo,
    isSimulatedMode,
    isMuted,
    facingMode,
    videoRef,

    // Actions
    startCamera,
    stopActiveStream,
    toggleFacingMode,
    toggleSpeech,
    restartScan,
    completeCurrentStep,
    setIsSimulatedMode,
    triggerSpecificError,
    setQualityMetrics,
  };
}
