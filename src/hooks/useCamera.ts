"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type CameraErrorCode =
  | "not_allowed"
  | "not_found"
  | "in_use"
  | "overconstrained"
  | "security_error"
  | "not_supported"
  | "unknown";

export interface CameraErrorDetails {
  code: CameraErrorCode;
  title: string;
  description: string;
  suggestion: string;
  errorCodeName?: string;
  originalError?: unknown;
}

export const CAMERA_ERRORS: Record<CameraErrorCode, CameraErrorDetails> = {
  not_allowed: {
    code: "not_allowed",
    title: "สิทธิ์เข้าถึงกล้องถูกปฏิเสธ (NotAllowedError)",
    description: "เบราว์เซอร์หรือผู้ใช้ปฏิเสธสิทธิ์การเปิดกล้อง",
    suggestion: "คลิกไอคอนรูปกุญแจข้างแถบ URL แล้วตั้งค่ากล้องเป็น 'อนุญาต' จากนั้นรีโหลดหน้านี้",
    errorCodeName: "NotAllowedError",
  },
  not_found: {
    code: "not_found",
    title: "ไม่พบอุปกรณ์กล้อง (NotFoundError)",
    description: "ระบบตรวจไม่พบกล้องเว็บแคมที่เชื่อมต่ออยู่กับเครื่อง",
    suggestion: "ตรวจสอบสาย USB หรือไดรเวอร์กล้องใน Device Manager แล้วลองใหม่อีกครั้ง",
    errorCodeName: "NotFoundError",
  },
  in_use: {
    code: "in_use",
    title: "กล้องกำลังถูกใช้งานอยู่ (NotReadableError)",
    description: "มีโปรแกรมอื่นกำลังเปิดใช้กล้องนี้อยู่ (เช่น Zoom, Teams, Line หรือแท็บอื่น)",
    suggestion: "กรุณาปิดโปรแกรมอื่นที่กำลังใช้กล้องอยู่ แล้วกดปุ่มลองใหม่อีกครั้ง",
    errorCodeName: "NotReadableError",
  },
  overconstrained: {
    code: "overconstrained",
    title: "การตั้งค่ากล้องไม่รองรับ (OverconstrainedError)",
    description: "กล้องไม่รองรับความละเอียดหรือคุณสมบัติที่ระบุ (เช่น 1280x720 หรือ facingMode)",
    suggestion: "ระบบจะสลับเป็นโหมดพื้นฐาน (video: true) อัตโนมัติ กรุณาลองใหม่อีกครั้ง",
    errorCodeName: "OverconstrainedError",
  },
  security_error: {
    code: "security_error",
    title: "บริบทความปลอดภัยไม่ถูกต้อง (SecurityError)",
    description: "WebRTC อนุญาตให้เปิดกล้องเฉพาะการเชื่อมต่อผ่าน HTTPS หรือ localhost เท่านั้น",
    suggestion: "กรุณาเข้าใช้งานผ่าน HTTPS หรือ localhost (การเปิดผ่าน http://192.168.x.x จะถูกบล็อก)",
    errorCodeName: "SecurityError",
  },
  not_supported: {
    code: "not_supported",
    title: "เบราว์เซอร์ไม่รองรับกล้อง",
    description: "เบราว์เซอร์ของคุณไม่รองรับ WebRTC getUserMedia API",
    suggestion: "กรุณาใช้งานผ่านเบราว์เซอร์ Chromium ล่าสุด เช่น Google Chrome หรือ Microsoft Edge",
    errorCodeName: "NotSupportedError",
  },
  unknown: {
    code: "unknown",
    title: "เกิดข้อผิดพลาดในการเปิดกล้อง",
    description: "ระบบตรวจพบข้อผิดพลาดที่ไม่สามารถระบุประเภทได้จากอุปกรณ์",
    suggestion: "กรุณากดลองใหม่อีกครั้ง หรือตรวจสอบสิทธิ์ในระบบปฏิบัติการ",
    errorCodeName: "UnknownError",
  },
};

export interface UseCameraOptions {
  autoStart?: boolean;
  facingMode?: "user" | "environment";
  idealWidth?: number;
  idealHeight?: number;
  onError?: (error: CameraErrorDetails) => void;
  onStreamReady?: (stream: MediaStream) => void;
}

export function useCamera({
  autoStart = true,
  facingMode = "user",
  idealWidth = 1280,
  idealHeight = 720,
  onError,
  onStreamReady,
}: UseCameraOptions = {}) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<CameraErrorDetails | null>(null);
  const [streamState, setStreamState] = useState<MediaStream | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rvfcIdRef = useRef<number | null>(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);
  const onErrorRef = useRef(onError);
  const onStreamReadyRef = useRef(onStreamReady);

  useEffect(() => {
    onErrorRef.current = onError;
    onStreamReadyRef.current = onStreamReady;
  });

  const stop = useCallback(() => {
    if (
      videoRef.current &&
      rvfcIdRef.current !== null &&
      "cancelVideoFrameCallback" in videoRef.current
    ) {
      const vid = videoRef.current as HTMLVideoElement & {
        cancelVideoFrameCallback: (id: number) => void;
      };
      try {
        vid.cancelVideoFrameCallback(rvfcIdRef.current);
      } catch {
        // no-op
      }
      rvfcIdRef.current = null;
    }

    if (streamRef.current) {
      const tracks = streamRef.current.getTracks();
      for (const track of tracks) {
        try {
          track.stop();
        } catch {
          // no-op
        }
      }
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
      videoRef.current.onplay = null;
    }

    setStreamState(null);
    setIsStreaming(false);
  }, []);

  const parseCameraError = useCallback((err: unknown): CameraErrorDetails => {
    const errName = err instanceof DOMException || err instanceof Error ? err.name : "";
    const errMsg = err instanceof Error ? err.message : String(err);

    console.error(`[useCamera Error] Name: "${errName}", Message: "${errMsg}"`, err);

    if (err instanceof DOMException || err instanceof Error) {
      switch (errName) {
        case "NotAllowedError":
        case "PermissionDeniedError":
          return { ...CAMERA_ERRORS.not_allowed, originalError: err };
        case "NotFoundError":
        case "DevicesNotFoundError":
          return { ...CAMERA_ERRORS.not_found, originalError: err };
        case "NotReadableError":
        case "TrackStartError":
          return { ...CAMERA_ERRORS.in_use, originalError: err };
        case "OverconstrainedError":
        case "ConstraintNotSatisfiedError":
          return { ...CAMERA_ERRORS.overconstrained, originalError: err };
        case "SecurityError":
          return { ...CAMERA_ERRORS.security_error, originalError: err };
        default:
          if (errMsg.toLowerCase().includes("security") || errMsg.toLowerCase().includes("https")) {
            return { ...CAMERA_ERRORS.security_error, originalError: err };
          }
          return { ...CAMERA_ERRORS.unknown, originalError: err };
      }
    }
    return { ...CAMERA_ERRORS.unknown, originalError: err };
  }, []);

  const start = useCallback(async () => {
    if (isStartingRef.current || !isMountedRef.current) return;
    isStartingRef.current = true;
    setError(null);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const err = CAMERA_ERRORS.not_supported;
      console.error("[useCamera Error] navigator.mediaDevices.getUserMedia is not supported");
      setError(err);
      onErrorRef.current?.(err);
      isStartingRef.current = false;
      return;
    }

    stop();

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
        },
        audio: false,
      });
    } catch (firstError) {
      console.warn("[useCamera] Ideal constraint failed, attempting fallback to video: true...", firstError);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (secondError) {
        const errorDetails = parseCameraError(secondError || firstError);
        if (isMountedRef.current) {
          setError(errorDetails);
          onErrorRef.current?.(errorDetails);
        }
        isStartingRef.current = false;
        return;
      }
    }

    if (!isMountedRef.current) {
      stream?.getTracks().forEach((t) => t.stop());
      isStartingRef.current = false;
      return;
    }

    if (stream) {
      streamRef.current = stream;
      setStreamState(stream);
      onStreamReadyRef.current?.(stream);

      if (videoRef.current) {
        const videoElement = videoRef.current;
        videoElement.srcObject = stream;
        videoElement.muted = true;
        videoElement.playsInline = true;
        videoElement.autoplay = true;

        const handlePlayback = () => {
          if (!isMountedRef.current) return;
          const playPromise = videoElement.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                if (isMountedRef.current) setIsStreaming(true);
              })
              .catch((playErr) => {
                // ข้าม AbortError ที่เกิดจากการสลับ component หรือ unmount ใน Strict Mode
                if (playErr instanceof DOMException && playErr.name === "AbortError") {
                  return;
                }
                console.error("[useCamera] video.play() error:", playErr);
                const playErrorDetails = parseCameraError(playErr);
                if (isMountedRef.current) {
                  setError(playErrorDetails);
                  onErrorRef.current?.(playErrorDetails);
                }
              });
          } else {
            setIsStreaming(true);
          }
        };

        if (videoElement.readyState >= 1) {
          handlePlayback();
        } else {
          videoElement.onloadedmetadata = () => {
            handlePlayback();
          };
        }
      } else {
        setIsStreaming(true);
      }
    }

    isStartingRef.current = false;
  }, [facingMode, idealWidth, idealHeight, parseCameraError, stop]);

  const restart = useCallback(async () => {
    stop();
    await start();
  }, [stop, start]);

  useEffect(() => {
    isMountedRef.current = true;
    let timer: NodeJS.Timeout | null = null;

    if (autoStart) {
      timer = setTimeout(() => {
        if (isMountedRef.current) void start();
      }, 50);
    }

    return () => {
      isMountedRef.current = false;
      if (timer) clearTimeout(timer);
      stop();
    };
  }, [autoStart, start, stop]);

  return {
    videoRef,
    isStreaming,
    error,
    stream: streamState,
    start,
    stop,
    restart,
  };
}