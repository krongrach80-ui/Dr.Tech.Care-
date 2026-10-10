/**
 * src/features/auth/kioskFlow.ts
 * Dr.Tech.Care — Zustand State Machine สำหรับตู้ Kiosk (Master Prompt หัวข้อ 4 และ 9)
 * - State machine เดียว ห้ามข้ามขั้นด้วย URL (route guard ตรวจ state)
 * - รองรับ Transition Rules เข้มงวด
 * - เชื่อมต่อกับ resetKioskState()
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { resetKioskState } from "@/lib/kiosk";

export type KioskFlowStep =
  | "idle" // หน้าแรก (/)
  | "login_consent" // ความยินยอม PDPA
  | "login_face_scan" // สแกนใบหน้า + Liveness
  | "login_confirm" // ยืนยันตัวตน ("ใช่บัญชีนี้หรือไม่?")
  | "home" // หน้าหลักคนไข้ (/home)
  | "today" // ตารางประจำวันและสัปดาห์ (/today)
  | "exercising" // กำลังทำภารกิจฝึกกายภาพ
  | "done" // สรุปผลการฝึกประจำวัน (/done)
  | "register_consent" // สมัครใหม่: ยินยอม PDPA
  | "register_face_scan" // สมัครใหม่: สแกนใบหน้า
  | "register_form" // สมัครใหม่: กรอกข้อมูล
  | "register_success"; // สมัครใหม่: สำเร็จ

export type PlanStatus = "done" | "ready" | "pending" | "missed";

export interface TodayTrainingPlan {
  id: string;
  time: string; // เช่น "09:00"
  endTime: string; // เช่น "10:00"
  title: string;
  category: "physio" | "brain" | "joint";
  target: string;
  status: PlanStatus;
  repsTarget: number;
  repsAchieved: number;
  setsTarget: number;
  holdSeconds: number;
  instructions: string[];
  imageUrl?: string;
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

export const DEFAULT_PATIENT: PatientProfile = {
  hn: "69-00124",
  firstName: "ประเสริฐ",
  lastName: "รักษ์ดี",
  gender: "male",
  age: 72,
  physioName: "กภ. ปิยะ สมบูรณ์",
  clinicBranch: "คลินิกกายภาพบำบัดฟื้นฟูข้อต่อและกล้ามเนื้อ",
};

export const INITIAL_TODAY_PLANS: TodayTrainingPlan[] = [
  {
    id: "plan-1",
    time: "09:00",
    endTime: "10:00",
    title: "กายภาพบำบัด: ยกแขนบริหารไหล่",
    category: "physio",
    target: "ยกแขนตรง 90° ค้าง 2 วินาที (5 ครั้ง)",
    status: "ready",
    repsTarget: 5,
    repsAchieved: 0,
    setsTarget: 3,
    holdSeconds: 2,
    instructions: [
      "นั่งหลังตรง เท้าแนบพื้นอย่างมั่นคง",
      "ยกแขนทั้งสองข้างขึ้นมาข้างหน้าจนถึงระดับไหล่ (90 องศา)",
      "ค้างไว้ 2 วินาที แล้วค่อย ๆ ผ่อนลงสู่ท่าเดิม",
    ],
  },
  {
    id: "plan-2",
    time: "10:30",
    endTime: "11:30",
    title: "ฝึกสมอง: ทายภาพผลไม้เพื่อสุขภาพ",
    category: "brain",
    target: "ตอบคำถามภาพ 1 ข้อ กระตุ้นความจำ",
    status: "pending",
    repsTarget: 1,
    repsAchieved: 0,
    setsTarget: 1,
    holdSeconds: 0,
    instructions: [
      "มองภาพผลไม้ที่ปรากฏบนหน้าจอ",
      "เลือกคำตอบที่ถูกต้องเพื่อกระตุ้นเซลล์ประสาทและการจดจำ",
    ],
  },
  {
    id: "plan-3",
    time: "14:00",
    endTime: "15:00",
    title: "กายภาพบำบัด: เหยียดแขนระดับอก",
    category: "physio",
    target: "เหยียดแขนไปข้างหน้ารักษาระดับ (5 ครั้ง)",
    status: "pending",
    repsTarget: 5,
    repsAchieved: 0,
    setsTarget: 2,
    holdSeconds: 3,
    instructions: [
      "เหยียดแขนทั้งสองข้างตรงไปข้างหน้า",
      "กางนิ้วออกเล็กน้อย รักษาความตึงของกล้ามเนื้อแขน",
      "ดึงกลับมาชิดอกอย่างช้า ๆ",
    ],
  },
  {
    id: "plan-4",
    time: "16:00",
    endTime: "17:00",
    title: "บริหารข้อศอกและมือ",
    category: "joint",
    target: "งอและเหยียดข้อศอกเบา ๆ (5 ครั้ง)",
    status: "pending",
    repsTarget: 5,
    repsAchieved: 0,
    setsTarget: 2,
    holdSeconds: 2,
    instructions: [
      "วางข้อศอกแนบลำตัว",
      "งอข้อศอกขึ้นแตะไหล่ แล้วเหยียดลงช้า ๆ",
    ],
  },
];

// กฎการเปลี่ยนสถานะที่ถูกต้อง (Valid Transition Rules)
const VALID_TRANSITIONS: Record<KioskFlowStep, KioskFlowStep[]> = {
  idle: ["idle", "login_consent", "register_consent"],
  login_consent: ["idle", "login_face_scan"],
  login_face_scan: ["idle", "login_confirm"],
  login_confirm: ["idle", "login_face_scan", "home"],
  home: ["idle", "today", "exercising", "done"],
  today: ["idle", "home", "exercising", "done"],
  exercising: ["idle", "home", "today", "done"],
  done: ["idle", "home"],
  register_consent: ["idle", "register_face_scan"],
  register_face_scan: ["idle", "register_form"],
  register_form: ["idle", "register_success"],
  register_success: ["idle", "home"],
};

export interface KioskFlowState {
  currentStep: KioskFlowStep;
  isAuthenticated: boolean;
  patient: PatientProfile | null;
  todayPlans: TodayTrainingPlan[];
  selectedPlanId: string | null;
  idleTimeoutSeconds: number; // 30–60s
  postSessionLogoutSeconds: number; // default 15s
  allowAnytimeToday: boolean;

  // Actions
  transitionTo: (nextStep: KioskFlowStep) => boolean;
  canAccessRoute: (pathname: string) => boolean;
  authenticatePatient: (profile: PatientProfile, plans?: TodayTrainingPlan[]) => void;
  setSelectedPlanId: (planId: string | null) => void;
  updatePlanStatus: (planId: string, status: PlanStatus) => void;
  setAllowAnytimeToday: (allow: boolean) => void;
  reset: (redirectToHome?: boolean) => void;
}

export const useKioskFlowStore = create<KioskFlowState>()(
  persist(
    (set, get) => ({
      currentStep: "idle",
      isAuthenticated: false,
      patient: null,
      todayPlans: INITIAL_TODAY_PLANS,
      selectedPlanId: "plan-1",
      idleTimeoutSeconds: 45,
      postSessionLogoutSeconds: 15,
      allowAnytimeToday: false,

      transitionTo: (nextStep: KioskFlowStep): boolean => {
        const { currentStep } = get();

        // ตรวจสอบว่า transition นี้ได้รับอนุญาตตาม Transition Matrix หรือไม่
        const allowedNext = VALID_TRANSITIONS[currentStep];
        if (!allowedNext || !allowedNext.includes(nextStep)) {
          console.warn(
            `[KioskFlow] Invalid transition attempted from '${currentStep}' to '${nextStep}'`
          );
          return false;
        }

        set({ currentStep: nextStep });
        return true;
      },

      canAccessRoute: (pathname: string): boolean => {
        let { isAuthenticated, currentStep } = get();

        // Fallback: หาก in-memory ยังไม่ได้ rehydrate ให้ตรวจ sessionStorage โดยตรง
        if (!isAuthenticated && typeof window !== "undefined") {
          try {
            const raw = sessionStorage.getItem("dtc_kiosk_flow_storage");
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.state?.isAuthenticated) {
                isAuthenticated = true;
                currentStep = parsed.state.currentStep ?? currentStep;
                // Re-sync memory ทันที
                set({
                  isAuthenticated: true,
                  currentStep,
                  patient: parsed.state.patient ?? get().patient,
                  todayPlans: parsed.state.todayPlans ?? get().todayPlans,
                });
              }
            }
          } catch {
            // no-op
          }
        }

        // หน้าสาธารณะเข้าได้เสมอ
        if (pathname === "/" || pathname === "/setup" || pathname === "/dev/mediapipe-check") {
          return true;
        }

        // หน้าบุคลากรมี Guard ของตนเอง
        if (pathname.startsWith("/staff") || pathname.startsWith("/admin")) {
          return true;
        }

        // หน้าคนไข้ (/home, /today, /done): ต้องผ่านการล็อกอิน (isAuthenticated)
        if (!isAuthenticated) {
          return false;
        }

        if (pathname === "/home") {
          return (
            currentStep === "home" ||
            currentStep === "today" ||
            currentStep === "exercising" ||
            currentStep === "done"
          );
        }

        if (pathname === "/today") {
          return (
            currentStep === "home" ||
            currentStep === "today" ||
            currentStep === "exercising" ||
            currentStep === "done"
          );
        }

        if (pathname === "/done") {
          return (
            currentStep === "today" ||
            currentStep === "exercising" ||
            currentStep === "done" ||
            currentStep === "home"
          );
        }

        return false;
      },

      authenticatePatient: (profile: PatientProfile, plans?: TodayTrainingPlan[]) => {
        set({
          isAuthenticated: true,
          patient: profile,
          currentStep: "home",
          todayPlans: plans && plans.length > 0 ? plans : INITIAL_TODAY_PLANS,
          selectedPlanId: plans?.[0]?.id ?? "plan-1",
        });
      },

      setSelectedPlanId: (planId: string | null) => {
        set({ selectedPlanId: planId });
      },

      updatePlanStatus: (planId: string, status: PlanStatus) => {
        set((state) => ({
          todayPlans: state.todayPlans.map((plan) =>
            plan.id === planId ? { ...plan, status } : plan
          ),
        }));
      },

      setAllowAnytimeToday: (allow: boolean) => {
        set({ allowAnytimeToday: allow });
      },

      reset: (redirectToHome = true) => {
        set({
          currentStep: "idle",
          isAuthenticated: false,
          patient: null,
          todayPlans: INITIAL_TODAY_PLANS,
          selectedPlanId: null,
        });

        // สเปกข้อ 9: เรียก resetKioskState() เพื่อปิดฮาร์ดแวร์และล้างหน่วยความจำ
        resetKioskState({ redirectToHome });
      },
    }),
    {
      name: "dtc_kiosk_flow_storage",
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        currentStep: state.currentStep,
        isAuthenticated: state.isAuthenticated,
        patient: state.patient,
        todayPlans: state.todayPlans,
        selectedPlanId: state.selectedPlanId,
        idleTimeoutSeconds: state.idleTimeoutSeconds,
        postSessionLogoutSeconds: state.postSessionLogoutSeconds,
        allowAnytimeToday: state.allowAnytimeToday,
      }),
    }
  )
);
