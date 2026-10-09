import { create } from "zustand";
import { resetKioskState } from "./kiosk";

export type PlanStatus = "done" | "ready" | "pending" | "missed";

export interface TodayTrainingPlan {
  id: string;
  time: string;
  title: string;
  target: string;
  status: PlanStatus;
  repsTarget: number;
  repsAchieved: number;
}

export interface PatientProfile {
  hn: string;
  firstName: string;
  lastName: string;
  gender: "male" | "female" | "other";
  age: number;
  physioName: string;
  clinicBranch: string;
}

export type LivenessPose = "center" | "left" | "right";

export interface BiometricScanResult {
  nonce: string;
  embedding: number[]; // 128-dimensional Float32 vector embedding only
  qualityScore: number;
  yawAngle: number;
  pitchAngle: number;
  rollAngle: number;
  isLive: boolean;
  timestamp: number;
}

interface KioskState {
  // 1. Patient Session State
  isAuthenticated: boolean;
  patient: PatientProfile | null;
  todayPlans: TodayTrainingPlan[];
  idleTimeoutSeconds: number;

  // 2. Face & Liveness Scan State
  challengeNonce: string;
  currentLivenessPose: LivenessPose;
  speechEnabled: boolean;
  lastScanResult: BiometricScanResult | null;

  // 3. Actions
  setPatient: (patient: PatientProfile) => void;
  setAuthenticated: (status: boolean) => void;
  setSpeechEnabled: (enabled: boolean) => void;
  setLivenessPose: (pose: LivenessPose) => void;
  updatePlanStatus: (planId: string, status: PlanStatus) => void;
  generateNewChallenge: () => string;
  logoutAndReset: (redirectToHome?: boolean) => void;
}

const DEFAULT_PATIENT: PatientProfile = {
  hn: "69-00124",
  firstName: "ประเสริฐ",
  lastName: "รักษ์ดี",
  gender: "male",
  age: 72,
  physioName: "กภ. ปิยะ สมบูรณ์",
  clinicBranch: "คลินิกกายภาพบำบัดฟื้นฟูข้อต่อและกล้ามเนื้อ",
};

const DEFAULT_PLANS: TodayTrainingPlan[] = [
  {
    id: "plan-1",
    time: "09:00",
    title: "กายภาพบำบัด: ยกแขนบริหารไหล่",
    target: "ยกแขนตรง 90° ค้าง 2 วินาที (5 ครั้ง)",
    status: "ready",
    repsTarget: 5,
    repsAchieved: 0,
  },
  {
    id: "plan-2",
    time: "10:30",
    title: "ฝึกสมอง: ทายภาพผลไม้เพื่อสุขภาพ",
    target: "ตอบคำถามภาพ 1 ข้อ กระตุ้นความจำ",
    status: "pending",
    repsTarget: 1,
    repsAchieved: 0,
  },
  {
    id: "plan-3",
    time: "14:00",
    title: "กายภาพบำบัด: เหยียดแขนระดับอก",
    target: "เหยียดแขนไปข้างหน้ารักษาระดับ (5 ครั้ง)",
    status: "pending",
    repsTarget: 5,
    repsAchieved: 0,
  },
  {
    id: "plan-4",
    time: "16:00",
    title: "บริหารข้อศอกและมือ",
    target: "งอและเหยียดข้อศอกเบา ๆ (5 ครั้ง)",
    status: "pending",
    repsTarget: 5,
    repsAchieved: 0,
  },
];

export const useKioskStore = create<KioskState>((set) => ({
  isAuthenticated: true,
  patient: DEFAULT_PATIENT,
  todayPlans: DEFAULT_PLANS,
  idleTimeoutSeconds: 45,

  challengeNonce: "CHG-" + Math.random().toString(36).substring(2, 9).toUpperCase(),
  currentLivenessPose: "center",
  speechEnabled: true,
  lastScanResult: null,

  setPatient: (patient) => set({ patient, isAuthenticated: true }),
  setAuthenticated: (status) => set({ isAuthenticated: status }),
  setSpeechEnabled: (enabled) => set({ speechEnabled: enabled }),
  setLivenessPose: (pose) => set({ currentLivenessPose: pose }),

  updatePlanStatus: (planId, status) => {
    set((state) => ({
      todayPlans: state.todayPlans.map((plan) =>
        plan.id === planId ? { ...plan, status } : plan
      ),
    }));
  },

  generateNewChallenge: () => {
    const nonce = "CHG-" + Math.random().toString(36).substring(2, 9).toUpperCase() + "-" + Date.now();
    set({ challengeNonce: nonce });
    return nonce;
  },

  logoutAndReset: (redirectToHome = true) => {
    // 1. ล้าง state ใน Zustand
    set({
      isAuthenticated: false,
      lastScanResult: null,
      currentLivenessPose: "center",
    });

    // 2. เรียกฟังก์ชันระบบรวม: ปิดกล้อง, ปิดเสียง TTS, ล้าง sessionStorage, redirect กลับหน้าแรก
    resetKioskState({ redirectToHome });
  },
}));
