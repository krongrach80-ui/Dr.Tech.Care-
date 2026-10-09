"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type CameraErrorCode =
  | "not_allowed"
  | "not_found"
  | "in_use"
  | "overconstrained"
  | "not_supported"
  | "unknown";

export interface CameraErrorDetails {
  code: CameraErrorCode;
  title: string;
  description: string;
  suggestion: string;
  originalError?: unknown;
}

export const CAMERA_ERRORS: Record<CameraErrorCode, CameraErrorDetails> = {
  not_allowed: {
    code: "not_allowed",
    title: "ไม่ได้รับอนุญาตให้ใช้กล้อง",
    description: "เบราว์เซอร์หรือระบบปฏิบัติการปฏิเสธการเข้าถึงกล้องสำหรับระบบสแกนใบหน้า",
    suggestion: "กรุณากดอนุญาตการเข้าถึงกล้องที่ไอคอนรูปกล้องบนแถบที่อยู่ของเบราว์เซอร์ แล้วลองใหม่อีกครั้ง",
  },
  not_found: {
    code: "not_found",
    title: "ไม่พบอุปกรณ์กล้อง",
    description: "ระบบไม่สามารถตรวจพบกล้องวิดีโอบนตู้ Kiosk นี้ได้",
    suggestion: "กรุณาตรวจสอบสายเชื่อมต่อ USB ของกล้อง หรือติดต่อเจ้าหน้าที่เทคนิคของคลินิก",
  },
  in_use: {
    code: "in_use",
    title: "กล้องกำลังถูกใช้งานอยู่",
    description: "ไม่สามารถเปิดกล้องได้เนื่องจากมีแอปพลิเคชันอื่นกำลังใช้งานกล้องอยู่",
    suggestion: "กรุณาปิดโปรแกรมอื่นที่เปิดกล้องค้างไว้ แล้วกดปุ่มลองใหม่อีกครั้ง",
  },
  overconstrained: {
    code: "overconstrained",
    title: "กล้องไม่รองรับความละเอียดที่กำหนด",
    description: "อุปกรณ์กล้องไม่สามารถทำงานที่ความละเอียด 1280x720 ได้",
    suggestion: "ระบบจะปรับลดความละเอียดลงอัตโนมัติ กรุณากดลองใหม่อีกครั้ง",
  },
  not_supported: {
    code: "not_supported",
    title: "เบราว์เซอร์ไม่รองรับกล้องวิดีโอ",
    description: "สภาพแวดล้อมปัจจุบันไม่รองรับ WebRTC getUserMedia API",
    suggestion: "กรุณาเปิดระบบด้วยเบราว์เซอร์ Chromium ล่าสุด หรือติดต่อผู้ดูแลระบบ",
  },
  unknown: {
    code: "unknown",
    title: "เกิดข้อผิดพลาดในการเปิดกล้อง",
    description: "ไม่สามารถเชื่อมต่อสัญญาณภาพจากกล้องได้",
    suggestion: "กรุณากดปุ่มลองใหม่อีกครั้ง หรือรีสตาร์ตระบบตู้ Kiosk",
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

  /**
   * หยุดการทำงานของกล้องและคืนทรัพยากรทั้งหมด
   * - หยุดทุก MediaStreamTrack
   * - ยกเลิก requestVideoFrameCallback
   * - ล้าง event listeners และ srcObject
   */
  const stop = useCallback(() => {
    // 1. ยกเลิก requestVideoFrameCallback หากมีค้างอยู่
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

    // 2. หยุดทุก Track บน MediaStream
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

    // 3. ปลดการผูกสตรีมกับ element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.onloadedmetadata = null;
      videoRef.current.onerror = null;
      videoRef.current.onplay = null;
    }

    setStreamState(null);
    setIsStreaming(false);
  }, []);

  /**
   * จำแนก Error จาก getUserMedia เป็นข้อความภาษาไทย
   */
  const parseCameraError = useCallback((err: unknown): CameraErrorDetails => {
    if (err instanceof DOMException) {
      switch (err.name) {
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
        default:
          return { ...CAMERA_ERRORS.unknown, originalError: err };
      }
    }
    return { ...CAMERA_ERRORS.unknown, originalError: err };
  }, []);

  /**
   * เปิดกล้องด้วย getUserMedia พร้อม fallback constraint
   */
  const start = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setError(null);

    // ตรวจสอบความพร้อมของ Browser API
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      const err = CAMERA_ERRORS.not_supported;
      setError(err);
      onError?.(err);
      isStartingRef.current = false;
      return;
    }

    stop();

    let stream: MediaStream | null = null;

    try {
      // 1. พยายามขอเปิดกล้องด้วยขนาดที่ระบุ
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
        },
        audio: false,
      });
    } catch (firstError) {
      try {
        // 2. Fallback: ขอวิดีโอแบบไม่จำกัด constraint ป้องกัน OverconstrainedError
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (secondError) {
        const errorDetails = parseCameraError(secondError || firstError);
        setError(errorDetails);
        onError?.(errorDetails);
        isStartingRef.current = false;
        return;
      }
    }

    if (stream) {
      streamRef.current = stream;
      setStreamState(stream);
      onStreamReady?.(stream);

      if (videoRef.current) {
        const videoElement = videoRef.current;
        videoElement.srcObject = stream;

        videoElement.onloadedmetadata = () => {
          videoElement
            .play()
            .then(() => {
              setIsStreaming(true);
            })
            .catch((playErr) => {
              const playErrorDetails = parseCameraError(playErr);
              setError(playErrorDetails);
              onError?.(playErrorDetails);
            });
        };
      } else {
        setIsStreaming(true);
      }
    }

    isStartingRef.current = false;
  }, [facingMode, idealWidth, idealHeight, onError, onStreamReady, parseCameraError, stop]);

  /**
   * รีสตาร์ตกล้องใหม่
   */
  const restart = useCallback(async () => {
    stop();
    await start();
  }, [stop, start]);

  /**
   * Lifecycle Cleanup เมื่อ Unmount หรือ Logout
   */
  useEffect(() => {
    let isCancelled = false;
    if (autoStart) {
      const timer = setTimeout(() => {
        if (!isCancelled) void start();
      }, 0);

      return () => {
        isCancelled = true;
        clearTimeout(timer);
        stop();
      };
    }

    return () => {
      isCancelled = true;
      stop();
    };
  }, [autoStart, start, stop]);

  return {
    videoRef,
    isStreaming,
    error,
    start,
    stop,
    restart,
    stream: streamState,
  };
}
