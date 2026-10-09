"use client";

import React from "react";
import {
  Volume2,
  VolumeX,
  SwitchCamera,
  Clock,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  SunMedium,
} from "lucide-react";
import {
  ServerChallenge,
  LivenessPose,
  BiometricVerificationPayload,
  CameraErrorInfo,
  getStepInstruction,
} from "@/lib/biometrics";
import { useFaceLivenessScanner } from "@/hooks/useFaceLivenessScanner";
import { FaceOvalGuide } from "./liveness/FaceOvalGuide";
import { CameraErrorDisplay } from "./liveness/CameraErrorDisplay";

export type { CameraErrorInfo, CameraErrorCategory } from "@/lib/biometrics";

export interface CameraMirrorProps {
  className?: string;
  isScanning?: boolean;
  scanTitle?: string;
  currentStep?: 1 | 2 | 3;
  totalSteps?: number;
  showOverlayGrid?: boolean;
  mirrored?: boolean;
  initialFacingMode?: "user" | "environment";
  challenge?: ServerChallenge;
  challengeNonce?: string;
  speechEnabled?: boolean;
  onToggleSpeech?: () => void;
  onCameraReady?: () => void;
  onCameraError?: (error: CameraErrorInfo) => void;
  onRestartScan?: () => void;
  onCancelScan?: () => void;
  onStepComplete?: (
    step: 1 | 2 | 3,
    metric: { yaw: number; quality: number; embedding: number[] }
  ) => void;
  onAllStepsComplete?: (payload: BiometricVerificationPayload) => void;
}

export function CameraMirror({
  className = "",
  isScanning = true,
  scanTitle,
  currentStep,
  totalSteps = 3,
  showOverlayGrid = true,
  mirrored = true,
  initialFacingMode = "user",
  challenge: propChallenge,
  challengeNonce = "CHG-DEFAULT",
  speechEnabled = true,
  onToggleSpeech,
  onCameraError,
  onRestartScan,
  onCancelScan,
  onStepComplete,
  onAllStepsComplete,
}: CameraMirrorProps) {
  const {
    status,
    challenge: hookChallenge,
    stepNumber: hookStepNumber,
    stepSecondsLeft,
    qualityMetrics,
    errorInfo,
    isSimulatedMode,
    isMuted,
    facingMode,
    videoRef,
    isModelReady,
    isModelLoading,
    startCamera,
    toggleFacingMode,
    toggleSpeech,
    restartScan,
    completeCurrentStep,
    setIsSimulatedMode,
    triggerSpecificError,
  } = useFaceLivenessScanner({
    challenge: propChallenge,
    speechEnabled,
    initialFacingMode,
    stepTimeoutSeconds: 15,
    onStepComplete: (stepNum, _pose, payload) => {
      onStepComplete?.(stepNum, {
        yaw: payload.capturedYaw,
        quality: payload.quality.sharpnessScore,
        embedding: payload.embedding,
      });
    },
    onAllStepsComplete: (payload) => {
      onAllStepsComplete?.(payload);
    },
    onError: (err) => {
      onCameraError?.(err);
    },
  });

  const activeStepNumber: 1 | 2 | 3 = currentStep ?? hookStepNumber;
  const activePose: LivenessPose = hookChallenge.sequence[activeStepNumber - 1] ?? "center";
  const currentYaw = activePose === "center" ? 0 : activePose === "left" ? -28 : 28;

  const displayTitle = scanTitle ?? getStepInstruction(activePose);

  const handleToggleLight = () => {
    if (qualityMetrics.lightingScore < 40) {
      triggerSpecificError("none");
    } else {
      triggerSpecificError("low_light");
    }
  };

  const handleToggleMultiFaces = () => {
    if (qualityMetrics.facesDetected > 1) {
      triggerSpecificError("none");
    } else {
      triggerSpecificError("multiple_faces");
    }
  };

  const isActuallyMuted = onToggleSpeech ? !speechEnabled : isMuted;
  const handleSpeechToggle = onToggleSpeech ?? toggleSpeech;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-slate-900 border-4 border-[#1E8A4C]/35 shadow-2xl flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* 1. วิดีโอกล้องสดจาก WebRTC */}
      {!isSimulatedMode && status !== "error" ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${
            mirrored && facingMode === "user" ? "-scale-x-100" : ""
          }`}
        />
      ) : isSimulatedMode && status !== "error" ? (
        /* โหมดจำลองในตู้ Kiosk */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-emerald-950/40 to-slate-950 p-6 text-center z-10 animate-in fade-in duration-300">
          <div className="relative w-44 h-56 border-4 border-dashed border-[#6FD67F]/60 rounded-[110px] flex flex-col items-center justify-center bg-emerald-950/25 animate-pulse mb-2">
            <div className="w-14 h-14 rounded-full bg-[#1E8A4C]/30 flex items-center justify-center mb-2">
              <Sparkles className="w-7 h-7 text-[#6FD67F]" />
            </div>
            <span className="text-sm font-extrabold text-emerald-200">
              โหมดจำลองกล้อง Kiosk
            </span>
            <span className="text-[11px] text-emerald-300/80 mt-1">
              (Challenge: {challengeNonce.slice(0, 10)})
            </span>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                setIsSimulatedMode(false);
                void startCamera();
              }}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/20 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>เปิดกล้องจริง</span>
            </button>

            <button
              type="button"
              onClick={completeCurrentStep}
              className="px-4 py-1.5 rounded-full bg-[#1E8A4C] hover:bg-[#17733E] text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#6FD67F]" />
              <span>ผ่านขั้นตอนนี้</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* สถานะโหลด AI Model ในพื้นหลัง (กล้องขึ้นแล้ว กำลังเตรียม AI) */}
      {isModelLoading && !isModelReady && status !== "error" && !isSimulatedMode && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-slate-900/85 text-emerald-300 border border-emerald-500/40 text-xs font-semibold backdrop-blur-md flex items-center gap-2 z-20 shadow-lg animate-pulse">
          <div className="w-2.5 h-2.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span>กำลังเตรียมระบบ AI...</span>
        </div>
      )}

      {/* 2. แถบควบคุมด้านบน: สลับกล้อง, ปุ่มเสียง TTS, และเวลานับถอยหลัง */}
      {status !== "error" && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-20">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleSpeechToggle}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow backdrop-blur-md transition-all cursor-pointer ${
                !isActuallyMuted
                  ? "bg-[#1E8A4C] text-white border border-[#6FD67F]"
                  : "bg-black/60 text-slate-300 border border-white/20"
              }`}
              title={!isActuallyMuted ? "ปิดเสียงพูดนำทาง" : "เปิดเสียงพูดนำทาง"}
            >
              {!isActuallyMuted ? (
                <Volume2 className="w-3.5 h-3.5 text-[#6FD67F]" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{!isActuallyMuted ? "เสียง: เปิด" : "เสียง: ปิด"}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleLight}
              className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow backdrop-blur-md transition-all cursor-pointer ${
                qualityMetrics.lightingScore < 40
                  ? "bg-amber-500/90 text-white border border-amber-300"
                  : "bg-emerald-950/60 text-emerald-200 border border-emerald-500/30"
              }`}
            >
              <SunMedium className="w-3.5 h-3.5" />
              <span>
                {qualityMetrics.lightingScore < 40 ? "แสงน้อย" : "แสงพอดี"}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="px-2 py-1 rounded-full text-[11px] font-mono font-bold bg-black/60 text-emerald-300 border border-white/20 backdrop-blur-md flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#6FD67F]" />
              <span>{stepSecondsLeft}s</span>
            </div>

            <button
              type="button"
              onClick={toggleFacingMode}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
              title="สลับกล้องหน้า/หลัง"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-[#6FD67F]" />
              <span>{facingMode === "user" ? "กล้องหน้า" : "กล้องหลัง"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. กรอบวงรีแนะนำตำแหน่งใบหน้า (Face Oval Guidance) */}
      {showOverlayGrid && status !== "error" && (
        <FaceOvalGuide
          currentStepNumber={activeStepNumber}
          totalSteps={totalSteps}
          currentPose={activePose}
          currentYaw={currentYaw}
          isScanning={isScanning && status === "scanning"}
          instructionText={displayTitle}
        />
      )}

      {/* 4. หน้าจอแสดง Error เมื่อเปิดกล้องไม่สำเร็จ */}
      {status === "error" && errorInfo && (
        <CameraErrorDisplay
          error={errorInfo}
          isRetrying={false}
          onRetry={() => {
            onRestartScan?.();
            restartScan();
          }}
          onCancel={() => {
            if (onCancelScan) {
              onCancelScan();
            } else {
              restartScan();
            }
          }}
          onSimulate={() => {
            setIsSimulatedMode(true);
            restartScan();
          }}
        />
      )}

      {/* 5. เครื่องมือจำลองสำหรับทดสอบ (Demo Tools) */}
      <div className="absolute bottom-1 right-2 z-20 pointer-events-auto opacity-20 hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-white">
        <button
          type="button"
          onClick={() => triggerSpecificError("too_fast")}
          className="px-1.5 py-0.5 rounded bg-black/60 hover:bg-black/90 cursor-pointer"
        >
          เร็วเกิน
        </button>
        <button
          type="button"
          onClick={handleToggleMultiFaces}
          className="px-1.5 py-0.5 rounded bg-black/60 hover:bg-black/90 cursor-pointer"
        >
          หลายหน้า
        </button>
        <button
          type="button"
          onClick={() => triggerSpecificError("insufficient_angle")}
          className="px-1.5 py-0.5 rounded bg-black/60 hover:bg-black/90 cursor-pointer"
        >
          มุมไม่พอ
        </button>
      </div>
    </div>
  );
}