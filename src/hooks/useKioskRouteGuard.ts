"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useKioskFlowStore, type PatientProfile, type TodayTrainingPlan } from "@/features/auth/kioskFlow";
import { resetKioskState } from "@/lib/kiosk";

export interface UseKioskRouteGuardResult {
  isAllowed: boolean;
  patient: PatientProfile | null;
  todayPlans: TodayTrainingPlan[];
}

const emptySubscribe = () => () => {};

/**
 * Route guard สำหรับหน้าคนไข้ (/home, /today, /done)
 * กฎเหล็ก: ห้ามข้ามขั้นด้วย URL! หากพบว่าข้ามมาโดยไม่ได้ผ่านการยืนยันตัวตน หรือสถานะไม่ตรง จะดีดกลับสู่หน้าแรกทันที
 * ทำงานหลัง client mount เพื่อป้องกัน hydration race condition
 */
export function useKioskRouteGuard(
  targetRoute: "/home" | "/today" | "/done"
): UseKioskRouteGuardResult {
  const router = useRouter();
  const store = useKioskFlowStore();

  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const isAllowed = isClient ? store.canAccessRoute(targetRoute) : false;

  useEffect(() => {
    if (!isClient) return;

    const allowed = useKioskFlowStore.getState().canAccessRoute(targetRoute);
    if (!allowed) {
      console.warn(
        `[KioskGuard] Unauthorized route access attempt to ${targetRoute}. Resetting to /`
      );
      resetKioskState({ redirectToHome: false });
      router.replace("/");
    }
  }, [isClient, targetRoute, router]);

  return {
    isAllowed,
    patient: store.patient,
    todayPlans: store.todayPlans,
  };
}
