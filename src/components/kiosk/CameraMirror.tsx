"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  CameraOff,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  SunMedium,
  SwitchCamera,
  Activity,
  Eye,
  Volume2,
  VolumeX,
  Users,
  Clock,
} from "lucide-react";
import { registerActiveKioskMediaStream } from "@/lib/kiosk";
import { speakThai, stopSpeech } from "@/lib/speech";

export type CameraErrorCategory =
  | "none"
  | "not_found"
  | "permission_denied"
  | "busy"
  | "low_light"
  | "no_face"
  | "multiple_faces"
  | "too_fast"
  | "insufficient_angle"
  | "timeout"
  | "unknown";

export interface CameraErrorInfo {
  category: CameraErrorCategory;
  title: string;
  description: string;
  suggestion: string;
}

export type CameraFacingMode = "user" | "environment";

interface CameraMirrorProps {
  className?: string;
  isScanning?: boolean;
  scanTitle?: string;
  currentStep?: 1 | 2 | 3;
  totalSteps?: number;
  showOverlayGrid?: boolean;
  mirrored?: boolean;
  initialFacingMode?: CameraFacingMode;
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
}

export function CameraMirror({
  className = "",
  isScanning = false,
  scanTitle = "กำลังจัดตำแหน่งใบหน้า...",
  currentStep = 1,
  totalSteps = 3,
  showOverlayGrid = true,
  mirrored = true,
  initialFacingMode = "user",
  challengeNonce = "CHG-DEFAULT",
  speechEnabled = true,
  onToggleSpeech,
  onCameraReady,
  onCameraError,
  onRestartScan,
  onCancelScan,
  onStepComplete,
}: CameraMirrorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [streamActive, setStreamActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorInfo, setErrorInfo] = useState<CameraErrorInfo | null>(null);
  const [forceSimulatedMode, setForceSimulatedMode] = useState(false);
  const [facingMode, setFacingMode] = useState<CameraFacingMode>(initialFacingMode);

  // สภาวะตรวจจับเรียลไทม์ (Yaw angle, Quality, Faces)
  const currentYaw = currentStep === 1 ? 0 : currentStep === 2 ? -28 : 28;
  const qualityScore = 95;
  const [detectedFacesCount, setDetectedFacesCount] = useState<number>(1);
  const [stepTimer, setStepTimer] = useState<number>(15); // 15s per-step timeout

  // สภาวะแจ้งเตือน
  const [isLowLightWarning, setIsLowLightWarning] = useState(false);
  const [isTooFastWarning, setIsTooFastWarning] = useState(false);

  // หยุด Stream กล้องและล้างค่าในระบบ
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

  // ขอสิทธิ์กล้องจากอุปกรณ์
  const requestCameraStream = useCallback(
    async (targetFacingMode: CameraFacingMode) => {
      stopActiveStream();

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        const err: CameraErrorInfo = {
          category: "not_found",
          title: "เบราว์เซอร์ไม่รองรับกล้อง",
          description: "เบราว์เซอร์นี้ไม่รองรับ MediaDevices API สำหรับเปิดกล้อง",
          suggestion: "กรุณาเปิดบนเบราว์เซอร์ Google Chrome หรือ Edge รุ่นล่าสุด",
        };
        setErrorInfo(err);
        setIsInitializing(false);
        onCameraError?.(err);
        return;
      }

      let stream: MediaStream | null = null;

      try {
        // ขอความละเอียด 1280x720 ตาม facingMode ที่ต้องการ
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (firstErr) {
        // กรณี constraint ล้มเหลว ให้ fallback ไปใช้ video: true
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        } catch (secondErr) {
          const rawErr = secondErr instanceof Error ? secondErr : firstErr;
          const errName = rawErr instanceof Error ? rawErr.name : "";
          const errMsg = rawErr instanceof Error ? rawErr.message : String(rawErr);

          let classified: CameraErrorInfo;

          if (
            errName === "NotFoundError" ||
            errName === "DevicesNotFoundError" ||
            errMsg.toLowerCase().includes("not found")
          ) {
            classified = {
              category: "not_found",
              title: "ไม่พบอุปกรณ์กล้องบนเครื่องนี้",
              description: "ระบบไม่พบกล้องเว็บแคมที่เชื่อมต่ออยู่ หรือกล้อง USB ถูกถอดออก",
              suggestion: "กรุณาตรวจสอบการเสียบสายกล้อง หรือเลือกใช้โหมดจำลองภาพเสมือน",
            };
          } else if (
            errName === "NotAllowedError" ||
            errName === "PermissionDeniedError" ||
            errMsg.toLowerCase().includes("permission") ||
            errMsg.toLowerCase().includes("denied")
          ) {
            classified = {
              category: "permission_denied",
              title: "กล้องถูกปฏิเสธการเข้าถึง",
              description: "เบราว์เซอร์ไม่ได้รับอนุญาตให้ใช้งานกล้องบนอุปกรณ์นี้",
              suggestion: "กรุณากดไอคอนแม่กุญแจที่แถบ URL ด้านบน แล้วเลือก 'อนุญาต (Allow)' แล้วลองใหม่",
            };
          } else if (
            errName === "NotReadableError" ||
            errName === "TrackStartError" ||
            errMsg.toLowerCase().includes("busy") ||
            errMsg.toLowerCase().includes("in use")
          ) {
            classified = {
              category: "busy",
              title: "กล้องถูกใช้งานโดยโปรแกรมอื่นอยู่แล้ว",
              description: "มีโปรแกรมอื่นในเครื่อง (เช่น Zoom, Meet, OBS หรือแท็บอื่น) กำลังใช้งานกล้องอยู่",
              suggestion: "กรุณาปิดโปรแกรมอื่นที่ใช้งานกล้อง แล้วกดปุ่มลองใหม่อีกครั้ง",
            };
          } else {
            classified = {
              category: "unknown",
              title: "ไม่สามารถเปิดกล้องได้",
              description: errMsg || "เกิดข้อผิดพลาดในการเชื่อมต่ออุปกรณ์กล้อง",
              suggestion: "กรุณากดปุ่มลองใหม่อีกครั้ง หรือสลับเป็นโหมดจำลอง",
            };
          }

          setErrorInfo(classified);
          setStreamActive(false);
          setIsInitializing(false);
          onCameraError?.(classified);
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
            setStreamActive(true);
            setIsInitializing(false);
            setErrorInfo(null);
            onCameraReady?.();
          };
        } else {
          setStreamActive(true);
          setIsInitializing(false);
          setErrorInfo(null);
          onCameraReady?.();
        }
      }
    },
    [stopActiveStream, onCameraReady, onCameraError]
  );

  const handleStartCamera = useCallback(() => {
    setIsInitializing(true);
    setErrorInfo(null);
    void requestCameraStream(facingMode);
  }, [requestCameraStream, facingMode]);

  // สลับกล้องหน้า/กล้องหลัง
  const handleToggleFacingMode = () => {
    const nextMode: CameraFacingMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(nextMode);
    setIsInitializing(true);
    setErrorInfo(null);
    void requestCameraStream(nextMode);
  };

  // อ่านออกเสียงคำแนะนำผ่าน Web Speech API เมื่อเข้าสู่แต่ละขั้นตอน
  useEffect(() => {
    if (!speechEnabled) return;

    if (currentStep === 1) {
      speakThai("ขั้นตอนที่หนึ่ง กรุณานั่งตรงและมองตรงที่กล้องครับ", speechEnabled);
    } else if (currentStep === 2) {
      speakThai("ขั้นตอนที่สอง กรุณาหันหน้าไปทางซ้ายช้า ๆ ครับ", speechEnabled);
    } else if (currentStep === 3) {
      speakThai("ขั้นตอนที่สาม กรุณาหันหน้าไปทางขวาช้า ๆ ครับ", speechEnabled);
    }
  }, [currentStep, speechEnabled]);

  // จับเวลา 15 วินาทีต่อขั้นตอน หากหมดเวลาจะแจ้ง timeout error
  useEffect(() => {
    if (!isScanning) return undefined;

    let isCancelled = false;
    const resetTimer = setTimeout(() => {
      if (!isCancelled) setStepTimer(15);
    }, 0);

    const timer = setInterval(() => {
      setStepTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          const timeoutErr: CameraErrorInfo = {
            category: "timeout",
            title: "หมดเวลาในขั้นตอนนี้",
            description: "ระบบไม่สามารถยืนยันตำแหน่งใบหน้าได้ทันเวลา 15 วินาที",
            suggestion: "กรุณากดปุ่ม 'ลองใหม่อีกครั้ง' และมองตรงตามคำแนะนำ",
          };
          setErrorInfo(timeoutErr);
          onCameraError?.(timeoutErr);
          speakThai("หมดเวลาในการสแกน กรุณากดปุ่มลองใหม่อีกครั้งครับ", speechEnabled);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      isCancelled = true;
      clearTimeout(resetTimer);
      clearInterval(timer);
    };
  }, [currentStep, isScanning, onCameraError, speechEnabled]);

  // เริ่มต้นกล้องเมื่อ Mount
  useEffect(() => {
    let isCancelled = false;
    if (!forceSimulatedMode) {
      const timer = setTimeout(() => {
        if (!isCancelled) {
          void requestCameraStream(facingMode);
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
  }, [requestCameraStream, stopActiveStream, forceSimulatedMode, facingMode]);

  // ฟังก์ชันจำลองคำนวณ 128-d Vector float32 embedding จาก Landmark (ไม่มีภาพจริง)
  const generateMockEmbedding = useCallback((): number[] => {
    const embedding = new Array<number>(128);
    for (let i = 0; i < 128; i++) {
      embedding[i] = Number((Math.sin(i * 0.1) * 0.5 + Math.random() * 0.1).toFixed(4));
    }
    return embedding;
  }, []);

  const handleStepSuccess = () => {
    setErrorInfo(null);
    const embedding = generateMockEmbedding();
    onStepComplete?.(currentStep, {
      yaw: currentYaw,
      quality: qualityScore,
      embedding,
    });
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-slate-900 border-4 border-[#1E8A4C]/30 shadow-2xl flex items-center justify-center ${className}`}
    >
      {/* 1. วิดีโอกล้องจริง (Live Camera Stream) */}
      {streamActive && !forceSimulatedMode ? (
        <>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`w-full h-full object-cover ${
              mirrored && facingMode === "user" ? "-scale-x-100" : ""
            }`}
          />

          {/* แถบควบคุมด้านบน: สลับกล้อง, ปุ่มเสียง TTS, และระดับแสง */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-20">
            <div className="flex items-center gap-1.5">
              {/* ปุ่มเปิด-ปิดเสียงบรรยายภาษาไทย (Web Speech API) */}
              <button
                type="button"
                onClick={onToggleSpeech}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow backdrop-blur-md transition-all cursor-pointer ${
                  speechEnabled
                    ? "bg-[#1E8A4C] text-white border border-[#6FD67F]"
                    : "bg-black/60 text-slate-300 border border-white/20"
                }`}
                title={speechEnabled ? "ปิดเสียงอ่านภาษาไทย" : "เปิดเสียงอ่านภาษาไทย"}
              >
                {speechEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                <span>{speechEnabled ? "เสียง: เปิด" : "เสียง: ปิด"}</span>
              </button>

              {/* ปุ่มเช็กระดับแสง */}
              <button
                type="button"
                onClick={() => setIsLowLightWarning((prev) => !prev)}
                className={`px-2 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow backdrop-blur-md transition-all cursor-pointer ${
                  isLowLightWarning
                    ? "bg-amber-500/90 text-white border border-amber-300"
                    : "bg-emerald-950/60 text-emerald-200 border border-emerald-500/30"
                }`}
              >
                <SunMedium className="w-3.5 h-3.5" />
                <span>{isLowLightWarning ? "แสงน้อย" : "แสงปกติ"}</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {/* นับเวลาถอยหลังประจำขั้น */}
              <div className="px-2 py-1 rounded-full text-[11px] font-mono font-bold bg-black/60 text-emerald-300 border border-white/20 backdrop-blur-md flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#6FD67F]" />
                <span>{stepTimer}s</span>
              </div>

              {/* ปุ่มสลับกล้องหน้า/หลัง */}
              <button
                type="button"
                onClick={handleToggleFacingMode}
                className="px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 shadow bg-black/60 hover:bg-black/80 text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer"
                title="สลับกล้องหน้า/กล้องหลัง"
              >
                <SwitchCamera className="w-3.5 h-3.5 text-[#6FD67F]" />
                <span>{facingMode === "user" ? "กล้องหน้า" : "กล้องหลัง"}</span>
              </button>
            </div>
          </div>

          {/* แถบแจ้งเตือนเมื่อแสงไม่เพียงพอ */}
          {isLowLightWarning && (
            <div className="absolute top-12 left-3 right-3 p-2.5 rounded-xl bg-amber-950/90 border border-amber-500 text-amber-200 text-xs shadow-lg z-20 text-left animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">แสงสว่างไม่เพียงพอสำหรับ Liveness Check</p>
                  <p className="text-[11px] text-amber-300 mt-0.5">
                    กรุณาเปิดไฟส่องสว่างด้านหน้า หรือขยับเข้าใกล้ตู้ Kiosk
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* แถบแจ้งเตือนเมื่อตรวจพบหลายใบหน้า */}
          {detectedFacesCount > 1 && (
            <div className="absolute top-12 left-3 right-3 p-2.5 rounded-xl bg-rose-950/90 border border-rose-500 text-rose-200 text-xs shadow-lg z-20 text-left animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">ตรวจพบมากกว่า 1 ใบหน้าในเฟรม</p>
                  <p className="text-[11px] text-rose-300 mt-0.5">
                    กรุณาให้ผู้รับบริการยืนหรือนั่งเพียงคนเดียวหน้าตู้ Kiosk
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* แถบแจ้งเตือนเมื่อผู้ใช้ขยับใบหน้าเร็วเกินไป */}
          {isTooFastWarning && (
            <div className="absolute top-12 left-3 right-3 p-2.5 rounded-xl bg-rose-950/90 border border-rose-500 text-rose-200 text-xs shadow-lg z-20 text-left animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <Activity className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">ตรวจพบภาพเบลอ / ขยับใบหน้าเร็วเกินไป</p>
                  <p className="text-[11px] text-rose-300 mt-0.5">
                    กรุณาอยู่นิ่ง ๆ และขยับศีรษะอย่างช้า ๆ
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* 2. หน้าต่างแจ้งเตือนข้อผิดพลาดกล้อง หรือ โหมดจำลองภาพ */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950 p-6 text-center z-10">
          {forceSimulatedMode ? (
            /* โหมดจำลองกล้องเสมือน (Simulated Mode) */
            <div className="flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="relative w-44 h-56 border-4 border-dashed border-[#6FD67F]/60 rounded-full flex flex-col items-center justify-center animate-pulse bg-emerald-950/20">
                <div className="w-16 h-16 rounded-full bg-[#1E8A4C]/30 flex items-center justify-center mb-2">
                  <Sparkles className="w-8 h-8 text-[#6FD67F]" />
                </div>
                <span className="text-sm font-bold text-emerald-200">
                  โหมดจำลองกล้องหน้าตู้
                </span>
                <span className="text-xs text-emerald-400/80 mt-1">
                  (ระบบเสมือนสำหรับการแข่งขัน)
                </span>
                <span className="text-[10px] text-emerald-300/60 mt-1 font-mono">
                  Challenge: {challengeNonce}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setForceSimulatedMode(false);
                    handleStartCamera();
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/20 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>ลองต่อกล้องจริง</span>
                </button>

                <button
                  type="button"
                  onClick={handleStepSuccess}
                  className="px-3.5 py-1.5 rounded-full bg-[#1E8A4C] hover:bg-[#17733E] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>จำลองผ่านขั้นนี้</span>
                </button>
              </div>
            </div>
          ) : (
            /* ข้อผิดพลาดกล้อง: Not Found / Permission Denied / Busy / Timeout / Multiple Faces */
            <div className="flex flex-col items-center justify-center max-w-sm px-2 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                {errorInfo?.category === "permission_denied" ? (
                  <ShieldAlert className="w-9 h-9" />
                ) : errorInfo?.category === "timeout" ? (
                  <Clock className="w-9 h-9" />
                ) : (
                  <CameraOff className="w-9 h-9" />
                )}
              </div>

              <h4 className="text-lg font-bold text-white mb-1">
                {errorInfo?.title || "ไม่สามารถเปิดกล้องได้"}
              </h4>

              <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                {errorInfo?.description}
              </p>

              <div className="w-full bg-amber-950/50 border border-amber-500/30 rounded-xl p-2.5 text-xs text-amber-200 mb-4 text-left leading-normal">
                <div className="flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>{errorInfo?.suggestion}</span>
                </div>
              </div>

              {/* ปุ่มแก้ปัญหา: ลองใหม่ & ยกเลิก / โหมดจำลอง */}
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => {
                    setErrorInfo(null);
                    onRestartScan?.();
                    handleStartCamera();
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#0B2B2B] text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isInitializing ? "animate-spin" : ""}`} />
                  <span>ลองใหม่อีกครั้ง</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setErrorInfo(null);
                    setForceSimulatedMode(true);
                  }}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ใช้โหมดจำลอง</span>
                </button>
              </div>

              {/* ปุ่มยกเลิก / กลับหน้าแรก */}
              {onCancelScan && (
                <button
                  type="button"
                  onClick={onCancelScan}
                  className="mt-3 text-xs text-slate-300 hover:text-white cursor-pointer underline"
                >
                  ยกเลิกและกลับหน้าแรก
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 3. กรอบนำทางรูปไข่ (Oval guidance frame) พร้อมแสดงผลสถานะและการตรวจจับ */}
      {showOverlayGrid && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {/* ป้ายแสดงขั้นตอน 1/3, 2/3, 3/3 ด้านบนกรอบ */}
          <div className="absolute top-12 px-3 py-1 rounded-full bg-black/65 backdrop-blur-md border border-[#6FD67F]/40 text-emerald-200 text-xs font-bold flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-[#6FD67F]" />
            <span>ขั้นตอนที่ {currentStep}/{totalSteps}</span>
            <span className="w-1 h-1 rounded-full bg-emerald-400" />
            <span className="text-[10px] text-emerald-300 font-mono">
              Yaw: {currentYaw}°
            </span>
          </div>

          {/* กรอบรูปไข่นำทางสำหรับจัดตำแหน่งใบหน้า */}
          <div className="relative w-56 sm:w-60 h-68 sm:h-74 border-2 border-[#6FD67F]/75 rounded-[120px] shadow-[0_0_24px_rgba(111,214,127,0.35)]">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#6FD67F] rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#6FD67F] rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#6FD67F] rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#6FD67F] rounded-br-lg" />

            {/* แอนิเมชันเลเซอร์สแกน */}
            {isScanning && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#6FD67F] to-transparent shadow-[0_0_12px_#6FD67F] animate-bounce" />
            )}
          </div>

          {/* ป้ายคำแนะนำแบบเรียลไทม์ตัวใหญ่ด้านล่างกรอบ */}
          {scanTitle && (
            <div className="absolute bottom-4 px-4 py-2 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-extrabold flex items-center gap-2">
              {isScanning && <RefreshCw className="w-4 h-4 animate-spin text-[#6FD67F]" />}
              <span>{scanTitle}</span>
            </div>
          )}
        </div>
      )}

      {/* แถบเครื่องมือจำลองสถานะ Error ต่าง ๆ เพื่อการทดสอบและสาธิต */}
      <div className="absolute bottom-1 right-2 z-20 pointer-events-auto opacity-30 hover:opacity-100 transition-opacity flex items-center gap-1 text-[10px] text-white">
        <button
          type="button"
          onClick={() => setIsTooFastWarning((prev) => !prev)}
          className="px-1.5 py-0.5 rounded bg-black/50 hover:bg-black/80 cursor-pointer"
          title="จำลองเตือนขยับเร็วเกินไป"
        >
          {isTooFastWarning ? "ปิดขยับเร็ว" : "ขยับเร็ว"}
        </button>
        <button
          type="button"
          onClick={() => setDetectedFacesCount((prev) => (prev === 1 ? 2 : 1))}
          className="px-1.5 py-0.5 rounded bg-black/50 hover:bg-black/80 cursor-pointer"
          title="จำลองพบหลายใบหน้า"
        >
          {detectedFacesCount > 1 ? "1 หน้า" : "หลายหน้า"}
        </button>
      </div>
    </div>
  );
}
