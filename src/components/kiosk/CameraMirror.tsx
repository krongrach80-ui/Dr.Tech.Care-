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
} from "lucide-react";

export type CameraErrorCategory =
  | "none"
  | "not_found"
  | "permission_denied"
  | "busy"
  | "low_light"
  | "unknown";

export interface CameraErrorInfo {
  category: CameraErrorCategory;
  title: string;
  description: string;
  suggestion: string;
}

interface CameraMirrorProps {
  className?: string;
  isScanning?: boolean;
  scanTitle?: string;
  showOverlayGrid?: boolean;
  mirrored?: boolean;
  onCameraReady?: () => void;
  onCameraError?: (error: CameraErrorInfo) => void;
}

export function CameraMirror({
  className = "",
  isScanning = false,
  scanTitle = "กำลังจัดตำแหน่งใบหน้า...",
  showOverlayGrid = true,
  mirrored = true,
  onCameraReady,
  onCameraError,
}: CameraMirrorProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorInfo, setErrorInfo] = useState<CameraErrorInfo | null>(null);
  const [forceSimulatedMode, setForceSimulatedMode] = useState(false);
  const [isLowLightWarning, setIsLowLightWarning] = useState(false);

  const stopActiveStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const requestCameraStream = useCallback(async () => {
    stopActiveStream();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const err: CameraErrorInfo = {
        category: "not_found",
        title: "เบราว์เซอร์ไม่รองรับกล้อง",
        description: "เบราว์เซอร์นี้ไม่รองรับ MediaDevices API",
        suggestion: "กรุณาเปิดบนเบราว์เซอร์สมัยใหม่ เช่น Google Chrome",
      };
      setErrorInfo(err);
      setIsInitializing(false);
      onCameraError?.(err);
      return;
    }

    let stream: MediaStream | null = null;

    // ขั้นที่ 1: ลองเปิดกล้องด้วยความละเอียด 1280x720 มุมกล้องหน้า
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (firstErr) {
      // ขั้นที่ 2: ถ้าล้มเหลว (เช่น overconstrained หรือไม่รองรับ 720p) ลองโหมด video พื้นฐาน
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (secondErr) {
        // จำแนกประเภท Error ให้ชัดเจนและให้คำแนะนำภาษาไทย
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
            suggestion: "กรุณาเสียบสายกล้อง หรือใช้โหมดจำลองภาพเพื่อทดสอบระบบ",
          };
        } else if (
          errName === "NotAllowedError" ||
          errName === "PermissionDeniedError" ||
          errMsg.toLowerCase().includes("permission") ||
          errMsg.toLowerCase().includes("denied")
        ) {
          classified = {
            category: "permission_denied",
            title: "กล้องถูกบล็อกการเข้าถึง",
            description: "เบราว์เซอร์ยังไม่ได้รับอนุญาตให้เข้าถึงกล้อง",
            suggestion: "กรุณากดไอคอนรูปกล้องหรือแม่กุญแจที่แถบ URL ด้านบน แล้วเลือก 'อนุญาต (Allow)'",
          };
        } else if (
          errName === "NotReadableError" ||
          errName === "TrackStartError" ||
          errMsg.toLowerCase().includes("busy") ||
          errMsg.toLowerCase().includes("in use")
        ) {
          classified = {
            category: "busy",
            title: "กล้องกำลังถูกใช้งานโดยโปรแกรมอื่น",
            description: "กล้องเว็บแคมถูกโปรแกรมอื่น (เช่น Zoom, Meet, OBS หรือแท็บอื่น) ใช้งานอยู่",
            suggestion: "กรุณาปิดโปรแกรมที่กำลังใช้กล้อง แล้วกดปุ่มลองใหม่อีกครั้ง",
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
  }, [stopActiveStream, onCameraReady, onCameraError]);

  const handleStartCamera = useCallback(() => {
    setIsInitializing(true);
    setErrorInfo(null);
    void requestCameraStream();
  }, [requestCameraStream]);

  useEffect(() => {
    let isCancelled = false;
    if (!forceSimulatedMode) {
      // ใช้ asynchronous scheduling เพื่อหลีกเลี่ยง synchronous setState ภายใน effect body
      const timer = setTimeout(() => {
        if (!isCancelled) {
          void requestCameraStream();
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
  }, [requestCameraStream, stopActiveStream, forceSimulatedMode]);

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
            className={`w-full h-full object-cover ${mirrored ? "-scale-x-100" : ""}`}
          />

          {/* แถบแจ้งเตือนระดับแสงสว่าง (Low-Light Guidance Indicator) */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto z-20">
            <button
              type="button"
              onClick={() => setIsLowLightWarning((prev) => !prev)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow backdrop-blur-md transition-all cursor-pointer ${
                isLowLightWarning
                  ? "bg-amber-500/90 text-white border border-amber-300"
                  : "bg-emerald-900/60 text-emerald-200 border border-emerald-500/30"
              }`}
            >
              <SunMedium className="w-3.5 h-3.5" />
              <span>{isLowLightWarning ? "แสงสว่างน้อย (คลิกดูคำแนะนำ)" : "ระดับแสงสว่าง: ปกติ"}</span>
            </button>
          </div>

          {/* แถบแจ้งเตือนเมื่อแสงไม่เพียงพอ */}
          {isLowLightWarning && (
            <div className="absolute top-12 left-3 right-3 p-2.5 rounded-xl bg-amber-950/90 border border-amber-500 text-amber-200 text-xs shadow-lg z-20 text-left animate-in fade-in duration-200">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">แสงสว่างไม่เพียงพอสำหรับ Liveness Check</p>
                  <p className="text-[11px] text-amber-300 mt-0.5">
                    กรุณาเปิดไฟส่องสว่างด้านหน้า หรือขยับเข้าใกล้ตู้ Kiosk เพื่อให้ระบบวิเคราะห์ใบหน้าได้แม่นยำ
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* 2. หน้าต่างแจ้งเตือนข้อผิดพลาดกล้อง หรือ โหมดจำลองภาพ */
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-950 p-6 text-center z-10">
          {/* กรณีเลือกโหมดจำลอง (Simulated Mode) */}
          {forceSimulatedMode ? (
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
              </div>

              <button
                type="button"
                onClick={() => {
                  setForceSimulatedMode(false);
                  handleStartCamera();
                }}
                className="mt-4 px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-white/20 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ลองเชื่อมต่อกล้องจริงอีกครั้ง</span>
              </button>
            </div>
          ) : (
            /* กรณีเกิดข้อผิดพลาดกล้อง (เช่น Requested device not found) */
            <div className="flex flex-col items-center justify-center max-w-sm px-2 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3">
                {errorInfo?.category === "permission_denied" ? (
                  <ShieldAlert className="w-9 h-9" />
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

              {/* ปุ่มแก้ปัญหา: ลองใหม่ & สลับเป็นโหมดจำลอง */}
              <div className="flex items-center gap-2.5 w-full">
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-100 text-[#0B2B2B] text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isInitializing ? "animate-spin" : ""}`} />
                  <span>ลองใหม่อีกครั้ง</span>
                </button>

                <button
                  type="button"
                  onClick={() => setForceSimulatedMode(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-[#1E8A4C] hover:bg-[#17733E] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>ใช้โหมดจำลอง</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. กรอบ Biometric Scanning Overlay */}
      {showOverlayGrid && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {/* กรอบวงรีจัดตำแหน่งใบหน้า */}
          <div className="relative w-60 sm:w-64 h-72 sm:h-80 border-2 border-[#6FD67F]/60 rounded-[120px] shadow-[0_0_20px_rgba(111,214,127,0.3)]">
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#6FD67F] rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#6FD67F] rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#6FD67F] rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#6FD67F] rounded-br-lg" />

            {/* แอนิเมชันเลเซอร์สแกน */}
            {isScanning && (
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#6FD67F] to-transparent shadow-[0_0_12px_#6FD67F] animate-bounce" />
            )}
          </div>

          {/* ป้ายคำแนะนำด้านล่างกรอบ */}
          {scanTitle && (
            <div className="absolute bottom-4 px-4 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs sm:text-sm font-bold flex items-center gap-2">
              {isScanning && <RefreshCw className="w-4 h-4 animate-spin text-[#6FD67F]" />}
              <span>{scanTitle}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
