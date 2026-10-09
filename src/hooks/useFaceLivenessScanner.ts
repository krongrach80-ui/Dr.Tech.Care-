"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
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
  checkPoseYawCompliance,
  getStepVoicePrompt,
  verifyBiometricSubmission,
  CAMERA_ERROR_CATALOG,
} from "@/lib/biometrics";
import {
  initializeFaceLandmarker,
  cleanupFaceLandmarker,
  detectFaceLandmarksFromVideo,
  extractEmbeddingFromLandmarks,
} from "@/lib/mediapipe";
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

  // แยกสถานะความพร้อมของโมเดล AI ออกจากการเปิดกล้อง
  const [isModelReady, setIsModelReady] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);

  // ตัวชี้วัดคุณภาพใบหน้า
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

  const [stepSecondsLeft, setStepSecondsLeft] = useState<number>(stepTimeoutSeconds);
  const [isMuted, setIsMuted] = useState(!speechEnabled);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const compliantFramesCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const currentPose: LivenessPose = challenge.sequence[currentStepIndex];
  const stepNumber: 1 | 2 | 3 = (currentStepIndex + 1) as 1 | 2 | 3;

  const stopActiveStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // no-op
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    registerActiveKioskMediaStream(null);
    stopSpeech();
    cleanupFaceLandmarker();
  }, []);

  // เริ่มโหลดโมเดล MediaPipe แบบ Asynchronous แยกจากการเปิดกล้อง
  const loadAIModel = useCallback(async () => {
    setIsModelLoading(true);
    try {
      const landmarker = await initializeFaceLandmarker();
      if (landmarker && isMountedRef.current) {
        setIsModelReady(true);
      }
    } catch (err) {
      console.warn("[FaceScanner] AI Model init warning:", err);
    } finally {
      if (isMountedRef.current) {
        setIsModelLoading(false);
      }
    }
  }, []);

  const startCamera = useCallback(
    async (targetFacing: "user" | "environment" = facingMode) => {
      if (!isMountedRef.current) return;
      stopActiveStream();
      setStatus("initializing");
      setErrorInfo(null);

      // เริ่มโหลด AI คู่ขนาน (ไม่รอ AI เพื่อให้ภาพจากกล้องขึ้นทันที)
      void loadAIModel();

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        const err = CAMERA_ERROR_CATALOG.not_found;
        console.error("[FaceScanner] navigator.mediaDevices.getUserMedia is not supported");
        if (isMountedRef.current) {
          setErrorInfo(err);
          setStatus("error");
          onError?.(err);
        }
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
        console.warn("[FaceScanner] Ideal constraint failed, falling back to video: true", firstErr);
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (secondErr) {
          const rawErr = secondErr instanceof Error ? secondErr : firstErr;
          console.error("[FaceScanner Error] getUserMedia failed:", rawErr);
          const classified = classifyCameraStreamError(rawErr);
          if (isMountedRef.current) {
            setErrorInfo(classified);
            setStatus("error");
            onError?.(classified);
          }
          return;
        }
      }

      if (!isMountedRef.current) {
        stream?.getTracks().forEach((track) => track.stop());
        return;
      }

      if (stream) {
        streamRef.current = stream;
        registerActiveKioskMediaStream(stream);

        if (videoRef.current) {
          const video = videoRef.current;
          video.srcObject = stream;
          video.muted = true;
          video.playsInline = true;
          video.autoplay = true;

          const playVideo = () => {
            if (!isMountedRef.current) return;
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  if (isMountedRef.current) {
                    console.log("[FaceScanner] Video feed streaming active");
                    setStatus("scanning");
                  }
                })
                .catch((playErr) => {
                  console.error("[FaceScanner] video.play() error:", playErr);
                  if (isMountedRef.current) {
                    setStatus("scanning");
                  }
                });
            } else {
              setStatus("scanning");
            }
          };

          if (video.readyState >= 1) {
            playVideo();
          } else {
            video.onloadedmetadata = () => {
              playVideo();
            };
          }
        } else {
          setStatus("scanning");
        }
      }
    },
    [facingMode, stopActiveStream, loadAIModel, onError]
  );

  const toggleFacingMode = useCallback(() => {
    const nextMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    void startCamera(nextMode);
  }, [facingMode, startCamera]);

  const toggleSpeech = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next) stopSpeech();
      return next;
    });
  }, []);

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

  const restartScan = useCallback(() => {
    stopSpeech();
    setErrorInfo(null);
    setCurrentStepIndex(0);
    setStepSecondsLeft(stepTimeoutSeconds);
    compliantFramesCountRef.current = 0;
    const newChallenge = generateServerChallenge();
    setChallenge(newChallenge);

    if (isSimulatedMode) {
      setStatus("scanning");
    } else {
      void startCamera(facingMode);
    }
  }, [facingMode, isSimulatedMode, startCamera, stepTimeoutSeconds]);

  const completeCurrentStep = useCallback(() => {
    setErrorInfo(null);
    compliantFramesCountRef.current = 0;

    let embedding: number[];
    if (latestLandmarksRef.current && latestLandmarksRef.current.length >= 100) {
      embedding = extractEmbeddingFromLandmarks(
        latestLandmarksRef.current,
        currentPose,
        challenge.nonce
      );
    } else {
      embedding = extract128dEmbeddingFromPose(currentPose, challenge.nonce);
    }

    const capturedYaw =
      qualityMetrics.yawAngle !== 0
        ? qualityMetrics.yawAngle
        : currentPose === "center"
        ? 0
        : currentPose === "left"
        ? -28
        : 28;

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
      setCurrentStepIndex((prev) => (prev + 1) as 0 | 1 | 2);
      setStepSecondsLeft(stepTimeoutSeconds);
    } else {
      setStatus("verifying");
      stopSpeech();

      const verification = verifyBiometricSubmission(payload, challenge, true);
      if (!verification.success) {
        const err = (verification.errorCategory && verification.errorCategory !== "none")
          ? CAMERA_ERROR_CATALOG[verification.errorCategory]
          : CAMERA_ERROR_CATALOG.unknown;
        setErrorInfo(err);
        setStatus("error");
        onError?.(err);
        return;
      }

      setStatus("success");
      onAllStepsComplete?.(payload);
    }
  }, [
    currentPose,
    challenge,
    qualityMetrics,
    stepNumber,
    currentStepIndex,
    stepTimeoutSeconds,
    onStepComplete,
    onAllStepsComplete,
    onError,
  ]);

  // MediaPipe FaceLandmarker Detection Loop
  useEffect(() => {
    if (status !== "scanning" || isSimulatedMode) return undefined;

    let isRunning = true;
    let detectionTimer: NodeJS.Timeout | null = null;

    const runDetectionTick = () => {
      if (!isRunning) return;

      const video = videoRef.current;
      if (video && video.readyState >= 2 && !video.paused) {
        const result = detectFaceLandmarksFromVideo(video, performance.now());

        if (result.faceDetected && result.landmarks) {
          latestLandmarksRef.current = result.landmarks;

          if (result.facesCount > 1) {
            triggerSpecificError("multiple_faces");
            return;
          }

          setQualityMetrics((prev) => ({
            ...prev,
            facesDetected: result.facesCount,
            yawAngle: result.yaw,
            pitchAngle: result.pitch,
            rollAngle: result.roll,
            faceSizeRatio: result.faceSizeRatio,
            isAcceptable: result.faceSizeRatio >= 0.18 && result.faceSizeRatio <= 0.75,
          }));

          const compliance = checkPoseYawCompliance(currentPose, result.yaw);

          if (compliance.isCompliant) {
            compliantFramesCountRef.current += 1;
            if (compliantFramesCountRef.current >= 4) {
              compliantFramesCountRef.current = 0;
              completeCurrentStep();
              return;
            }
          } else {
            compliantFramesCountRef.current = Math.max(0, compliantFramesCountRef.current - 1);
          }
        }
      }

      detectionTimer = setTimeout(runDetectionTick, 150);
    };

    runDetectionTick();

    return () => {
      isRunning = false;
      if (detectionTimer) clearTimeout(detectionTimer);
    };
  }, [status, isSimulatedMode, currentPose, triggerSpecificError, completeCurrentStep]);

  // เสียงนำทาง Web Speech API
  useEffect(() => {
    if (status === "scanning" && !isMuted) {
      const voiceText = getStepVoicePrompt(stepNumber, currentPose);
      speakThai(voiceText, true);
    }
  }, [currentStepIndex, status, isMuted, stepNumber, currentPose]);

  // นับถอยหลังในแต่ละขั้นตอน
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
          speakThai("หมดเวลาในการทำขั้นตอน กรุณากดปุ่มลองใหม่อีกครั้งนะคะ", !isMuted);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentStepIndex, status, onError, isMuted]);

  // จัดการ Lifecycle และป้องกัน React Strict Mode unmount/remount
  useEffect(() => {
    isMountedRef.current = true;
    let timer: NodeJS.Timeout | null = null;

    if (!isSimulatedMode) {
      timer = setTimeout(() => {
        if (isMountedRef.current) {
          void startCamera(facingMode);
        }
      }, 50);
    }

    return () => {
      isMountedRef.current = false;
      if (timer) clearTimeout(timer);
      stopActiveStream();
    };
  }, [facingMode, isSimulatedMode, startCamera, stopActiveStream]);

  return {
    status,
    challenge,
    currentStepIndex,
    stepNumber,
    totalSteps: 3 as const,
    currentPose,
    qualityMetrics,
    stepSecondsLeft,
    isMuted,
    errorInfo,
    isSimulatedMode,
    facingMode,
    videoRef,
    isModelReady,
    isModelLoading,
    setIsSimulatedMode,
    startCamera,
    stopActiveStream,
    toggleFacingMode,
    toggleSpeech,
    restartScan,
    completeCurrentStep,
    triggerSpecificError,
    setQualityMetrics,
  };
}