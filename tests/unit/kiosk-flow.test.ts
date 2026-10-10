import { describe, it, expect, beforeEach } from "vitest";
import { useKioskFlowStore, DEFAULT_PATIENT } from "@/features/auth/kioskFlow";

describe("Kiosk Flow State Machine (Phase 5)", () => {
  beforeEach(() => {
    // Reset state before each test
    useKioskFlowStore.setState({
      currentStep: "idle",
      isAuthenticated: false,
      patient: null,
    });
  });

  describe("Transition Rules Validation", () => {
    it("อนุญาตการเปลี่ยนสถานะตามลำดับที่ถูกต้อง: idle -> login_consent -> login_face_scan -> login_confirm -> home", () => {
      const store = useKioskFlowStore.getState();

      expect(store.currentStep).toBe("idle");

      // 1. idle -> login_consent
      expect(store.transitionTo("login_consent")).toBe(true);
      expect(useKioskFlowStore.getState().currentStep).toBe("login_consent");

      // 2. login_consent -> login_face_scan
      expect(store.transitionTo("login_face_scan")).toBe(true);
      expect(useKioskFlowStore.getState().currentStep).toBe("login_face_scan");

      // 3. login_face_scan -> login_confirm
      expect(store.transitionTo("login_confirm")).toBe(true);
      expect(useKioskFlowStore.getState().currentStep).toBe("login_confirm");

      // 4. login_confirm -> home
      expect(store.transitionTo("home")).toBe(true);
      expect(useKioskFlowStore.getState().currentStep).toBe("home");
    });

    it("ปฏิเสธการข้ามขั้น (Invalid Transitions)", () => {
      const store = useKioskFlowStore.getState();

      // จาก idle จะข้ามไป home ทันทีไม่ได้
      expect(store.transitionTo("home")).toBe(false);
      expect(useKioskFlowStore.getState().currentStep).toBe("idle");

      // จาก idle จะข้ามไป today ทันทีไม่ได้
      expect(store.transitionTo("today")).toBe(false);
      expect(useKioskFlowStore.getState().currentStep).toBe("idle");

      // จาก idle จะข้ามไป done ทันทีไม่ได้
      expect(store.transitionTo("done")).toBe(false);
      expect(useKioskFlowStore.getState().currentStep).toBe("idle");
    });

    it("อนุญาตให้ย้อนกลับไป idle ได้เสมอจากทุกขั้นตอน", () => {
      const store = useKioskFlowStore.getState();

      store.transitionTo("login_consent");
      expect(store.transitionTo("idle")).toBe(true);
      expect(useKioskFlowStore.getState().currentStep).toBe("idle");
    });
  });

  describe("Route Access Control (canAccessRoute)", () => {
    it("หน้าแรก / และ /setup เข้าถึงได้เสมอแม้ไม่ได้ยืนยันตัวตน", () => {
      const store = useKioskFlowStore.getState();
      expect(store.canAccessRoute("/")).toBe(true);
      expect(store.canAccessRoute("/setup")).toBe(true);
    });

    it("หน้า /home, /today, /done ปฏิเสธการเข้าถึงทันทีหากยังไม่ได้ Login", () => {
      const store = useKioskFlowStore.getState();
      expect(store.isAuthenticated).toBe(false);

      expect(store.canAccessRoute("/home")).toBe(false);
      expect(store.canAccessRoute("/today")).toBe(false);
      expect(store.canAccessRoute("/done")).toBe(false);
    });

    it("เมื่อ Login สำเร็จ สามารถเข้าถึง /home และ /today ได้ตามขั้นตอน", () => {
      const store = useKioskFlowStore.getState();
      store.authenticatePatient(DEFAULT_PATIENT);

      expect(useKioskFlowStore.getState().isAuthenticated).toBe(true);
      expect(useKioskFlowStore.getState().currentStep).toBe("home");

      expect(store.canAccessRoute("/home")).toBe(true);
      expect(store.canAccessRoute("/today")).toBe(true);
    });

    it("เมื่อย้ายไปขั้นตอน today สามารถเข้าถึง /today และ /home ได้", () => {
      const store = useKioskFlowStore.getState();
      store.authenticatePatient(DEFAULT_PATIENT);
      store.transitionTo("today");

      expect(useKioskFlowStore.getState().currentStep).toBe("today");
      expect(store.canAccessRoute("/today")).toBe(true);
      expect(store.canAccessRoute("/home")).toBe(true);
    });
  });

  describe("Authentication & Reset", () => {
    it("authenticatePatient ตั้งค่าผู้ป่วยและสิทธิ์พร้อมแผนการฝึก", () => {
      const store = useKioskFlowStore.getState();
      store.authenticatePatient(DEFAULT_PATIENT);

      const state = useKioskFlowStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.patient?.hn).toBe("69-00124");
      expect(state.patient?.firstName).toBe("ประเสริฐ");
      expect(state.todayPlans.length).toBeGreaterThan(0);
    });

    it("reset ล้างข้อมูลและรีเซ็ตสู่ idle", () => {
      const store = useKioskFlowStore.getState();
      store.authenticatePatient(DEFAULT_PATIENT);
      store.reset(false);

      const state = useKioskFlowStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.patient).toBeNull();
      expect(state.currentStep).toBe("idle");
    });
  });
});
