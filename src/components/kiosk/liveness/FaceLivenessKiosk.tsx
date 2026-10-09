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
import { FaceOvalGuide } from "./FaceOvalGuide";
import { CameraErrorDisplay } from "./CameraErrorDisplay";

interface FaceLivenessKioskProps {
  className?: string;
  challenge?: ServerChallenge;
  speechEnabled?: boolean;
  onStepComplete?: (
    stepNumber: 1 | 2 | 3,
    pose: LivenessPose,
    payload: BiometricVerificationPayload
  ) => void;
  onAllStepsComplete?: (payload: BiometricVerificationPayload) => void;
  onCancel?: () => void;
  onError?: (error: CameraErrorInfo) => void;
}

export function FaceLivenessKiosk({
  className = "",
  challenge,
  speechEnabled = true,
  onStepComplete,
  onAllStepsComplete,
  onCancel,
  onError,
}: FaceLivenessKioskProps) {
  const {
    status,
    challenge: activeChallenge,
    stepNumber,
    currentPose,
    stepSecondsLeft,
    qualityMetrics,
    errorInfo,
    isSimulatedMode,
    isMuted,
    facingMode,
    videoRef,
    startCamera,
    toggleFacingMode,
    toggleSpeech,
    restartScan,
    completeCurrentStep,
    setIsSimulatedMode,
    triggerSpecificError,
    setQualityMetrics,
  } = useFaceLivenessScanner({
    challenge,
    speechEnabled,
    onStepComplete,
    onAllStepsComplete,
    onError,
  });

  // มุม Yaw คำนวณตามท่าปัจจุบัน
  const currentYaw =
    currentPose === "center" ? 0 : currentPose === "left" ? -28 : 28;

  // ข้อความคำแนะนำหน้าจอตัวใหญ่
  const instructionText = getStepInstruction(currentPose);

  // สลับการจำลองแสงน้อย
  const handleToggleLowLightSimulation = () => {
    if (qualityMetrics.lightingScore < 40) {
      setQualityMetrics((prev) => ({ ...prev, lightingScore: 85 }));
      triggerSpecificError("none");
    } else {
      setQualityMetrics((prev) => ({ ...prev, lightingScore: 25 }));
      triggerSpecificError("low_light");
    }
  };

  // สลับการจำลองตรวจพบหลายใบหน้า
  const handleToggleMultipleFacesSimulation = () => {
    if (qualityMetrics.facesDetected > 1) {
      setQualityMetrics((prev) => ({ ...prev, facesDetected: 1 }));
      triggerSpecificError("none");
    } else {
      setQualityMetrics((prev) => ({ ...prev, facesDetected: 2 }));
      triggerSpecificError("multiple_faces");
    }
  };

  return (
    <div
      className={`relative w-full h-full rounded-3xl overflow-hidden bg-slate-900 border-4 border-[#1E8A4C]/40 shadow-2xl flex flex-col items-center justify-center select-none ${className}`}
    >
      {/* 1. วิดีโอกล้องจริง หรือ หน้าจอจำลองภาพเสมือน */}
      {!isSimulatedMode && status !== "error" ? (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`w-full h-full object-cover ${
            facingMode === "user" ? "-scale-x-100" : ""
          }`}
        />
      ) : isSimulatedMode && status !== "error" ? (
        /* โหมดจำลองกล้องเสมือน (Simulated Mode) สำหรับ Kiosk Showcase */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-emerald-950/40 to-slate-950 p-6 text-center">
          <div className="relative w-48 h-64 border-4 border-dashed border-[#6FD67F]/70 rounded-[120px] flex flex-col items-center justify-center bg-emerald-950/30 animate-pulse mb-3">
            <div className="w-16 h-16 rounded-full bg-[#1E8A4C]/40 flex items-center justify-center mb-2">
              <Sparkles className="w-8 h-8 text-[#6FD67F]" />
            </div>
            <span className="text-sm font-extrabold text-emerald-200">
              โหมดจำลองกล้อง Kiosk
            </span>
            <span className="text-xs text-emerald-300/80 mt-1">
              (Challenge: {activeChallenge.nonce.slice(0, 14)}...)
            </span>
          </div>

          <p className="text-xs text-emerald-200/90 font-medium max-w-xs mb-3">
            ระบบจำลองการตรวจจับใบหน้าแบบ Real-time พร้อมเข้ารหัส 128-d Vector
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSimulatedMode(false);
                void startCamera();
              }}
              className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/20 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>ลองต่อกล้องจริง</span>
            </button>

            <button
              type="button"
              onClick={completeCurrentStep}
              className="px-4 py-2 rounded-full bg-[#1E8A4C] hover:bg-[#17733E] text-white text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-[#6FD67F]" />
              <span>จำลองผ่านขั้นตอนนี้</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* 2. แถบควบคุมด้านบนสุด: สลับกล้อง, ปุ่มเสียง TTS, และนาฬิกาถอยหลัง 15s */}
      {status !== "error" && (
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-20">
          <div className="flex items-center gap-1.5">
            {/* ปุ่มเปิด-ปิดเสียงบรรยายภาษาไทย (Web Speech API) */}
            <button
              type="button"
              onClick={toggleSpeech}
              className={`px-3 py-1.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 shadow-md backdrop-blur-md transition-all cursor-pointer ${
                !isMuted
                  ? "bg-[#1E8A4C] text-white border border-[#6FD67F]"
                  : "bg-black/60 text-slate-300 border border-white/20"
              }`}
              title={!isMuted ? "ปิดเสียงอ่านภาษาไทย" : "เปิดเสียงอ่านภาษาไทย"}
            >
              {!isMuted ? (
                <Volume2 className="w-4 h-4 text-[#6FD67F]" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
              <span>{!isMuted ? "เสียง: เปิด" : "เสียง: ปิด"}</span>
            </button>

            {/* ปุ่มตรวจสอบระดับแสงสว่าง */}
            <button
              type="button"
              onClick={handleToggleLowLightSimulation}
              className={`px-2.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow backdrop-blur-md transition-all cursor-pointer ${
                qualityMetrics.lightingScore < 40
                  ? "bg-amber-500/90 text-white border border-amber-300"
                  : "bg-emerald-950/60 text-emerald-200 border border-emerald-500/30"
              }`}
            >
              <SunMedium className="w-3.5 h-3.5" />
              <span>
                {qualityMetrics.lightingScore < 40 ? "แสงน้อย" : "แสงปกติ"}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {/* ตัวนับเวลาถอยหลัง 15 วินาที */}
            <div className="px-3 py-1.5 rounded-full text-xs font-mono font-extrabold bg-black/65 text-emerald-300 border border-white/20 backdrop-blur-md flex items-center gap-1.5 shadow">
              <Clock className="w-3.5 h-3.5 text-[#6FD67F]" />
              <span>{stepSecondsLeft}s</span>
            </div>

            {/* ปุ่มสลับกล้องหน้า/กล้องหลัง */}
            <button
              type="button"
              onClick={toggleFacingMode}
              className="px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow bg-black/65 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
              title="สลับกล้องหน้า/กล้องหลัง"
            >
              <SwitchCamera className="w-3.5 h-3.5 text-[#6FD67F]" />
              <span>{facingMode === "user" ? "กล้องหน้า" : "กล้องหลัง"}</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. กรอบนำทางรูปไข่ (Oval guidance frame) และคำแนะนำ */}
      {status !== "error" && (
        <FaceOvalGuide
          currentStepNumber={stepNumber}
          totalSteps={3}
          currentPose={currentPose}
          currentYaw={currentYaw}
          isScanning={status === "scanning"}
          instructionText={instructionText}
        />
      )}

      {/* 4. หน้าต่าง Error Catalog 10 สถานะแบบครบถ้วน */}
      {status === "error" && errorInfo && (
        <CameraErrorDisplay
          error={errorInfo}
          isRetrying={false}
          onRetry={restartScan}
          onCancel={onCancel ?? restartScan}
          onSimulate={() => {
            setIsSimulatedMode(true);
            restartScan();
          }}
        />
      )}

      {/* 5. แถบเครื่องมือจำลองสถานะ Error สำหรับการทดสอบ (Demo Tools) */}
      <div className="absolute bottom-1 right-2 z-20 pointer-events-auto opacity-20 hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-white">
        <button
          type="button"
          onClick={() => triggerSpecificError("too_fast")}
          className="px-1.5 py-0.5 rounded bg-black/60 hover:bg-black/90 cursor-pointer"
        >
          ขยับเร็ว
        </button>
        <button
          type="button"
          onClick={handleToggleMultipleFacesSimulation}
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
        <button
          type="button"
          onClick={() => triggerSpecificError("network_error")}
          className="px-1.5 py-0.5 rounded bg-black/60 hover:bg-black/90 cursor-pointer"
        >
          เน็ตหลุด
        </button>
      </div>
    </div>
  );
}
