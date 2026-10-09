/**
 * src/lib/stores/adminStore.ts
 * Dr.Tech.Care — State Management สำหรับระบบแอดมินและนักกายภาพ (Phase 1)
 * รองรับการทำงานแบบ Reactive สอดคล้องกับ RLS 3 ชั้น และการบันทึก Audit Log ทุก Mutation
 */

import { create } from "zustand";
import type { AppRole, PhysioScope } from "@/lib/rbac";
import { writeAudit, getLocalAuditLogs, type AuditLogRecord } from "@/lib/audit/writer";
import { guardDeleteUser, guardBanTarget, type AuthenticatedStaff } from "@/lib/auth/guard";

export interface UserAccount {
  id: string;
  username: string;
  displayName: string;
  role: AppRole;
  status: "active" | "suspended";
  mustChangePassword: boolean;
  lastLoginAt: string;
  responsiblePhysioId?: string | null;
  deletedAt: string | null;
}

export interface PatientRecord {
  id: string;
  hn: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: "male" | "female" | "other";
  phone: string;
  personalHistory: string;
  injuryDetails: string;
  responsiblePhysioId: string | null;
  startedAt: string;
}

export interface PhysioNoteRecord {
  id: string;
  patientId: string;
  authorId: string;
  authorName: string;
  content: string;
  painScore?: number | undefined;
  createdAt: string;
}

export interface PhysioProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  bio: string;
  licenseNo: string;
}

export interface ExerciseItem {
  id: string;
  name: string;
  summary: string;
  steps: string[];
  targetMuscles: string;
  recoveryPhase: string;
  sets: number;
  reps: number;
  difficulty: "easy" | "medium" | "hard";
  mediaUrl?: string | undefined;
  mediaType?: ("image" | "video") | undefined;
  createdBy: string;
  creatorName: string;
  createdAt: string;
}

export interface ActiveSessionItem {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  role: AppRole;
  device: string;
  ip: string;
  browser: string;
  loginTime: string;
}

export interface BanItem {
  id: string;
  kind: "device" | "ip";
  value: string;
  reason: string;
  durationHours: number | null; // null = ถาวร
  expiresAt: string | null;
  bannedBy: string;
  createdAt: string;
}

export interface SystemSettingsState {
  access_policy: { physio_scope: PhysioScope };
  face: { distance_threshold: number; ambiguity_margin: number; min_quality: number };
  pose: { model: string; min_visibility: number; target_fps: number };
  kiosk: { idle_timeout_s: number; idle_warning_s: number; post_session_logout_s: number };
  security: { face_fail: number; staff_fail: number; session_max_hours_staff: number };
}

const DEFAULT_SETTINGS: SystemSettingsState = {
  access_policy: { physio_scope: "all" },
  face: { distance_threshold: 0.5, ambiguity_margin: 0.08, min_quality: 0.6 },
  pose: { model: "lite", min_visibility: 0.6, target_fps: 24 },
  kiosk: { idle_timeout_s: 45, idle_warning_s: 10, post_session_logout_s: 20 },
  security: { face_fail: 5, staff_fail: 5, session_max_hours_staff: 8 },
};

interface AdminStoreState {
  // 1. Current Actor Session
  currentActor: AuthenticatedStaff;
  setActorRole: (role: "director" | "physio") => void;

  // 2. User Accounts
  users: UserAccount[];
  addUser: (input: { username: string; displayName: string; role: AppRole; initialPassword?: string }) => Promise<void>;
  updateUserDisplayName: (id: string, newName: string) => Promise<void>;
  resetUserPassword: (id: string) => Promise<string>;
  toggleUserStatus: (id: string) => Promise<void>;
  deleteUser: (id: string, confirmedUsername: string) => Promise<void>;

  // 3. Patients
  patients: PatientRecord[];
  updatePatient: (id: string, data: Partial<PatientRecord>) => Promise<void>;
  assignPhysioToPatient: (patientId: string, physioId: string | null) => Promise<void>;

  // 4. Physio Notes
  notes: PhysioNoteRecord[];
  addPhysioNote: (patientId: string, content: string, painScore?: number) => Promise<void>;

  // 5. Physios
  physios: PhysioProfile[];
  updatePhysioProfile: (id: string, data: Partial<PhysioProfile>) => Promise<void>;

  // 6. Exercises
  exercises: ExerciseItem[];
  addExercise: (data: Omit<ExerciseItem, "id" | "createdBy" | "creatorName" | "createdAt">) => Promise<void>;
  updateExercise: (id: string, data: Partial<ExerciseItem>) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;

  // 7. Active Sessions & Bans
  activeSessions: ActiveSessionItem[];
  kickSession: (sessionId: string) => Promise<void>;
  bans: BanItem[];
  addBan: (kind: "device" | "ip", value: string, reason: string, durationHours: number | null) => Promise<void>;
  unban: (banId: string) => Promise<void>;

  // 8. System Settings
  settings: SystemSettingsState;
  updateSettings: (key: keyof SystemSettingsState, value: unknown) => Promise<void>;
  resetSettings: () => Promise<void>;

  // 9. Audit Logs
  auditLogs: AuditLogRecord[];
  refreshAuditLogs: () => void;
}

const DIRECTOR_ACTOR: AuthenticatedStaff = {
  userId: "d0000000-0000-0000-0000-000000000001",
  username: "director.admin",
  role: "director",
  displayName: "นพ. ชัยรัตน์ พิทักษ์ธรรม (ผู้อำนวยการ)",
  deviceId: "KIOSK-ADMIN-01",
  ip: "192.168.1.100",
};

const PHYSIO_ACTOR: AuthenticatedStaff = {
  userId: "p0000000-0000-0000-0000-000000000001",
  username: "physio.somchai",
  role: "physio",
  displayName: "กภ. สมชาย รักษาดี (นักกายภาพ)",
  deviceId: "KIOSK-PHYSIO-01",
  ip: "192.168.1.102",
};

function getInitialActor(): AuthenticatedStaff {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("drtechcare_role");
    if (saved === "physio") return PHYSIO_ACTOR;
  }
  return DIRECTOR_ACTOR;
}

export const useAdminStore = create<AdminStoreState>((set, get) => ({
  // Default Actor: ผู้อำนวยการ (Director) หรือตามที่เลือกไว้ใน localStorage
  currentActor: getInitialActor(),

  setActorRole: (role) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("drtechcare_role", role);
    }
    if (role === "director") {
      set({ currentActor: DIRECTOR_ACTOR });
    } else {
      set({ currentActor: PHYSIO_ACTOR });
    }
  },

  users: [
    {
      id: "d0000000-0000-0000-0000-000000000001",
      username: "director.admin",
      displayName: "นพ. ชัยรัตน์ พิทักษ์ธรรม",
      role: "director",
      status: "active",
      mustChangePassword: false,
      lastLoginAt: "2026-10-10 08:30",
      deletedAt: null,
    },
    {
      id: "p0000000-0000-0000-0000-000000000001",
      username: "physio.somchai",
      displayName: "กภ. สมชาย รักษาดี",
      role: "physio",
      status: "active",
      mustChangePassword: false,
      lastLoginAt: "2026-10-10 09:15",
      deletedAt: null,
    },
    {
      id: "p0000000-0000-0000-0000-000000000002",
      username: "physio.ananya",
      displayName: "กภ. อนัญญา พิทักษ์กาย",
      role: "physio",
      status: "active",
      mustChangePassword: false,
      lastLoginAt: "2026-10-09 16:45",
      deletedAt: null,
    },
    {
      id: "u0000000-0000-0000-0000-000000000001",
      username: "patient.prasert",
      displayName: "นายประเสริฐ สุขใจ",
      role: "patient",
      status: "active",
      mustChangePassword: false,
      lastLoginAt: "2026-10-10 09:00",
      responsiblePhysioId: "p0000000-0000-0000-0000-000000000001",
      deletedAt: null,
    },
    {
      id: "u0000000-0000-0000-0000-000000000002",
      username: "patient.somporn",
      displayName: "นางสมพร ยิ้มแย้ม",
      role: "patient",
      status: "active",
      mustChangePassword: false,
      lastLoginAt: "2026-10-09 11:20",
      responsiblePhysioId: "p0000000-0000-0000-0000-000000000001",
      deletedAt: null,
    },
    {
      id: "u0000000-0000-0000-0000-000000000003",
      username: "patient.wichai",
      displayName: "นายวิชัย มั่นคง",
      role: "patient",
      status: "active",
      mustChangePassword: false,
      lastLoginAt: "2026-10-08 14:10",
      responsiblePhysioId: "p0000000-0000-0000-0000-000000000002",
      deletedAt: null,
    },
  ],

  addUser: async (input) => {
    const actor = get().currentActor;
    const newId = `u${Date.now()}`;
    const newUser: UserAccount = {
      id: newId,
      username: input.username,
      displayName: input.displayName,
      role: input.role,
      status: "active",
      mustChangePassword: true,
      lastLoginAt: "-",
      deletedAt: null,
    };

    set((state) => ({ users: [...state.users, newUser] }));

    await writeAudit({
      category: "data",
      action: "create_user",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "profiles",
      targetId: newId,
      changes: { username: input.username, role: input.role, displayName: input.displayName },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  updateUserDisplayName: async (id, newName) => {
    const actor = get().currentActor;
    const target = get().users.find((u) => u.id === id);
    if (!target) return;

    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, displayName: newName } : u)),
    }));

    await writeAudit({
      category: "data",
      action: "edit_user_name",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "profiles",
      targetId: id,
      changes: { before: { displayName: target.displayName }, after: { displayName: newName } },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  resetUserPassword: async (id) => {
    const actor = get().currentActor;
    const target = get().users.find((u) => u.id === id);
    if (!target) return "";

    const tempCode = `Temp#${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, mustChangePassword: true } : u)),
    }));

    await writeAudit({
      category: "security",
      action: "reset_password",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "profiles",
      targetId: id,
      metadata: { mustChangePassword: true },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();

    return tempCode;
  },

  toggleUserStatus: async (id) => {
    const actor = get().currentActor;
    const target = get().users.find((u) => u.id === id);
    if (!target) return;

    const nextStatus = target.status === "active" ? "suspended" : "active";

    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, status: nextStatus } : u)),
    }));

    await writeAudit({
      category: "security",
      action: nextStatus === "suspended" ? "suspend_user" : "activate_user",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "profiles",
      targetId: id,
      changes: { before: { status: target.status }, after: { status: nextStatus } },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  deleteUser: async (id, confirmedUsername) => {
    const actor = get().currentActor;
    const target = get().users.find((u) => u.id === id);
    if (!target) throw new Error("ไม่พบบัญชีผู้ใช้งานที่ต้องการลบ");

    if (confirmedUsername !== target.username) {
      throw new Error("ชื่อบัญชีที่พิมพ์ยืนยันไม่ตรงกัน");
    }

    const directorCount = get().users.filter((u) => u.role === "director" && !u.deletedAt).length;

    // ตรวจสอบผ่าน guard() ชั้นที่ 2
    guardDeleteUser(actor, target.id, target.role, directorCount, target.responsiblePhysioId ?? undefined);

    const now = new Date().toISOString();
    set((state) => ({
      users: state.users.map((u) => (u.id === id ? { ...u, deletedAt: now } : u)),
    }));

    await writeAudit({
      category: "data",
      action: "soft_delete_user",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "profiles",
      targetId: id,
      changes: { username: target.username, deletedAt: now },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  patients: [
    {
      id: "u0000000-0000-0000-0000-000000000001",
      hn: "69-00124",
      firstName: "ประเสริฐ",
      lastName: "สุขใจ",
      birthDate: "1954-05-12",
      gender: "male",
      phone: "081-234-5678",
      personalHistory: "ความดันโลหิตสูง ควบคุมได้ด้วยยา ไม่สูบบุหรี่",
      injuryDetails: "อาการข้อไหล่ติดข้างขวา ยกแขนได้ 80 องศา เจ็บปวดเมื่อเคลื่อนไหว",
      responsiblePhysioId: "p0000000-0000-0000-0000-000000000001",
      startedAt: "2026-09-01",
    },
    {
      id: "u0000000-0000-0000-0000-000000000002",
      hn: "69-00125",
      firstName: "สมพร",
      lastName: "ยิ้มแย้ม",
      birthDate: "1958-09-24",
      gender: "female",
      phone: "089-876-5432",
      personalHistory: "ข้อเข่าเสื่อมระยะที่ 2 เคยผ่าตัดข้อเท้าซ้ายเมื่อ 5 ปีก่อน",
      injuryDetails: "ฟื้นฟูกล้ามเนื้อสะโพกและข้อเข่าข้างขวาหลังหกล้ม",
      responsiblePhysioId: "p0000000-0000-0000-0000-000000000001",
      startedAt: "2026-09-15",
    },
    {
      id: "u0000000-0000-0000-0000-000000000003",
      hn: "69-00126",
      firstName: "วิชัย",
      lastName: "มั่นคง",
      birthDate: "1962-01-30",
      gender: "male",
      phone: "084-555-7890",
      personalHistory: "เบาหวานชนิดที่ 2",
      injuryDetails: "กล้ามเนื้อหลังส่วนล่างอักเสบเรื้อรังจากการยกของหนัก",
      responsiblePhysioId: "p0000000-0000-0000-0000-000000000002",
      startedAt: "2026-10-01",
    },
  ],

  updatePatient: async (id, data) => {
    const actor = get().currentActor;
    set((state) => ({
      patients: state.patients.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));

    await writeAudit({
      category: "data",
      action: "update_patient",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "patients",
      targetId: id,
      changes: { updated: data },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  assignPhysioToPatient: async (patientId, physioId) => {
    const actor = get().currentActor;
    set((state) => ({
      patients: state.patients.map((p) => (p.id === patientId ? { ...p, responsiblePhysioId: physioId } : p)),
      users: state.users.map((u) => (u.id === patientId ? { ...u, responsiblePhysioId: physioId } : u)),
    }));

    await writeAudit({
      category: "data",
      action: "assign_responsible_physio",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "patients",
      targetId: patientId,
      changes: { responsiblePhysioId: physioId },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  notes: [
    {
      id: "n1",
      patientId: "u0000000-0000-0000-0000-000000000001",
      authorId: "p0000000-0000-0000-0000-000000000001",
      authorName: "กภ. สมชาย รักษาดี",
      content: "คนไข้ยกแขนได้ดีขึ้น องศาเพิ่มขึ้นจาก 70 เป็น 85 องศา แนะนำให้ออกกำลังกายต่อเนื่องวันละ 2 เซต",
      painScore: 3,
      createdAt: "2026-10-08 10:15",
    },
  ],

  addPhysioNote: async (patientId, content, painScore) => {
    const actor = get().currentActor;
    const newNote: PhysioNoteRecord = {
      id: `note_${Date.now()}`,
      patientId,
      authorId: actor.userId,
      authorName: actor.displayName,
      content,
      painScore,
      createdAt: new Date().toLocaleString("th-TH"),
    };

    set((state) => ({ notes: [newNote, ...state.notes] }));

    await writeAudit({
      category: "data",
      action: "create_physio_note",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "physio_notes",
      targetId: newNote.id,
      changes: { patientId, painScore },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  physios: [
    {
      id: "p0000000-0000-0000-0000-000000000001",
      firstName: "สมชาย",
      lastName: "รักษาดี",
      phone: "081-111-2233",
      bio: "นักกายภาพบำบัดชำนาญการ เชี่ยวชาญระบบกล้ามเนื้อและข้อต่อในผู้สูงอายุ ประสบการณ์ 8 ปี",
      licenseNo: "กภ. 12456",
    },
    {
      id: "p0000000-0000-0000-0000-000000000002",
      firstName: "อนัญญา",
      lastName: "พิทักษ์กาย",
      phone: "089-444-5566",
      bio: "นักกายภาพบำบัดฟื้นฟูระบบประสาทและการทรงตัว ประสบการณ์ 5 ปี",
      licenseNo: "กภ. 13890",
    },
  ],

  updatePhysioProfile: async (id, data) => {
    const actor = get().currentActor;
    set((state) => ({
      physios: state.physios.map((p) => (p.id === id ? { ...p, ...data } : p)),
    }));

    await writeAudit({
      category: "data",
      action: "update_physio_profile",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "physiotherapists",
      targetId: id,
      changes: { updated: data },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  exercises: [
    {
      id: "ex-1",
      name: "ท่ายกแขนไปด้านหน้า (Shoulder Flexion)",
      summary: "ฝึกกำลังกล้ามเนื้อหัวไหล่และสะบักเพื่อเพิ่มองศาการเคลื่อนไหว",
      steps: [
        "ยืนตรงหรือนั่งหลังตรง แขนแนบลำตัว",
        "ยกแขนข้างที่ต้องการฝึกขึ้นตรงไปข้างหน้าจนถึงระดับหัวไหล่ (90 องศา)",
        "ค้างไว้ 2 วินาที แล้วค่อยๆ ลดแขนลงอย่างช้าๆ",
      ],
      targetMuscles: "Deltoid, Supraspinatus, Serratus Anterior",
      recoveryPhase: "ฟื้นฟูระยะกลาง (Subacute)",
      sets: 3,
      reps: 10,
      difficulty: "easy",
      mediaUrl: "/models/shoulder_flexion.png",
      mediaType: "image",
      createdBy: "d0000000-0000-0000-0000-000000000001",
      creatorName: "นพ. ชัยรัตน์ พิทักษ์ธรรม",
      createdAt: "2026-09-10",
    },
    {
      id: "ex-2",
      name: "ท่ากางแขนออกด้านข้าง (Shoulder Abduction)",
      summary: "เพิ่มความมั่นคงของข้อไหล่และกล้ามเนื้อยกแขนด้านข้าง",
      steps: [
        "ยืนตรง กางแขนออกด้านข้างลำตัวช้าๆ จนถึงระดับหัวไหล่",
        "ระวังอย่ายกไหล่ขึ้นเกร็งชิดหู",
        "ค้างไว้ 3 วินาที แล้วนำแขนลงสู่ท่าเริ่มต้น",
      ],
      targetMuscles: "Middle Deltoid, Supraspinatus",
      recoveryPhase: "ฟื้นฟูระยะเริ่มต้น (Early Active)",
      sets: 2,
      reps: 8,
      difficulty: "easy",
      mediaUrl: "/models/shoulder_abduction.png",
      mediaType: "image",
      createdBy: "p0000000-0000-0000-0000-000000000001",
      creatorName: "กภ. สมชาย รักษาดี",
      createdAt: "2026-09-12",
    },
    {
      id: "ex-3",
      name: "ท่าเหยียดเข่าตรง (Seated Knee Extension)",
      summary: "เสริมสร้างความแข็งแรงของกล้ามเนื้อต้นขาด้านหน้าและการทรงตัว",
      steps: [
        "นั่งบนเก้าอี้ที่มีพนักพิง หลังตรง เท้าวางราบกับพื้น",
        "เหยียดขาข้างที่ฝึกขึ้นตรงจนขนานกับพื้น กระดกปลายเท้าเข้าหาตัว",
        "เกร็งค้างไว้ 5 วินาที แล้วค่อยๆ วางเท้าลง",
      ],
      targetMuscles: "Quadriceps Femoris (Rectus Femoris, Vastus Medialis)",
      recoveryPhase: "เสริมสร้างกล้ามเนื้อขา (Strengthening)",
      sets: 3,
      reps: 12,
      difficulty: "medium",
      mediaUrl: "/models/knee_extension.png",
      mediaType: "image",
      createdBy: "d0000000-0000-0000-0000-000000000001",
      creatorName: "นพ. ชัยรัตน์ พิทักษ์ธรรม",
      createdAt: "2026-09-20",
    },
  ],

  addExercise: async (data) => {
    const actor = get().currentActor;
    const newEx: ExerciseItem = {
      ...data,
      id: `ex-${Date.now()}`,
      createdBy: actor.userId,
      creatorName: actor.displayName,
      createdAt: new Date().toISOString().split("T")[0] ?? "2026-10-10",
    };

    set((state) => ({ exercises: [...state.exercises, newEx] }));

    await writeAudit({
      category: "data",
      action: "create_exercise",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "exercises",
      targetId: newEx.id,
      changes: { name: newEx.name, difficulty: newEx.difficulty },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  updateExercise: async (id, data) => {
    const actor = get().currentActor;
    const target = get().exercises.find((e) => e.id === id);
    if (!target) return;

    if (actor.role === "physio" && target.createdBy !== actor.userId) {
      throw new Error("นักกายภาพสามารถแก้ไขได้เฉพาะท่าที่ตนเองสร้างเท่านั้น");
    }

    set((state) => ({
      exercises: state.exercises.map((e) => (e.id === id ? { ...e, ...data } : e)),
    }));

    await writeAudit({
      category: "data",
      action: "update_exercise",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "exercises",
      targetId: id,
      changes: { updated: data },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  deleteExercise: async (id) => {
    const actor = get().currentActor;
    const target = get().exercises.find((e) => e.id === id);
    if (!target) return;

    if (actor.role === "physio" && target.createdBy !== actor.userId) {
      throw new Error("นักกายภาพสามารถลบได้เฉพาะท่าที่ตนเองสร้างเท่านั้น");
    }

    set((state) => ({
      exercises: state.exercises.filter((e) => e.id !== id),
    }));

    await writeAudit({
      category: "data",
      action: "delete_exercise",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "exercises",
      targetId: id,
      changes: { name: target.name },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  activeSessions: [
    {
      id: "sess-1",
      userId: "d0000000-0000-0000-0000-000000000001",
      username: "director.admin",
      displayName: "นพ. ชัยรัตน์ พิทักษ์ธรรม",
      role: "director",
      device: "Windows Desktop (Admin Suite)",
      ip: "192.168.1.100",
      browser: "Chrome 130 / Win11",
      loginTime: "10 นาทีที่แล้ว",
    },
    {
      id: "sess-2",
      userId: "p0000000-0000-0000-0000-000000000001",
      username: "physio.somchai",
      displayName: "กภ. สมชาย รักษาดี",
      role: "physio",
      device: "iPad Pro Kiosk #2",
      ip: "192.168.1.102",
      browser: "Safari Mobile 18",
      loginTime: "25 นาทีที่แล้ว",
    },
    {
      id: "sess-3",
      userId: "u0000000-0000-0000-0000-000000000001",
      username: "patient.prasert",
      displayName: "นายประเสริฐ สุขใจ",
      role: "patient",
      device: "Kiosk #1 หน้าห้องกายภาพ",
      ip: "192.168.1.150",
      browser: "Edge Kiosk Mode",
      loginTime: "5 นาทีที่แล้ว",
    },
  ],

  kickSession: async (sessionId) => {
    const actor = get().currentActor;
    const target = get().activeSessions.find((s) => s.id === sessionId);
    if (!target) return;

    set((state) => ({
      activeSessions: state.activeSessions.filter((s) => s.id !== sessionId),
    }));

    await writeAudit({
      category: "security",
      action: "kick_session",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "active_sessions",
      targetId: sessionId,
      changes: { kickedUser: target.username, device: target.device, ip: target.ip },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  bans: [
    {
      id: "ban-1",
      kind: "ip",
      value: "203.0.113.88",
      reason: "พยายาม Brute-force รหัสผ่านเจ้าหน้าที่",
      durationHours: 24,
      expiresAt: "2026-10-11 08:00",
      bannedBy: "นพ. ชัยรัตน์ พิทักษ์ธรรม",
      createdAt: "2026-10-10 08:00",
    },
  ],

  addBan: async (kind, value, reason, durationHours) => {
    const actor = get().currentActor;
    // กฎกันพลาด 3 ชั้น
    guardBanTarget(actor, value, kind);

    const expiresAt = durationHours
      ? new Date(Date.now() + durationHours * 3600 * 1000).toLocaleString("th-TH")
      : null;

    const newBan: BanItem = {
      id: `ban-${Date.now()}`,
      kind,
      value,
      reason,
      durationHours,
      expiresAt,
      bannedBy: actor.displayName,
      createdAt: new Date().toLocaleString("th-TH"),
    };

    set((state) => ({ bans: [newBan, ...state.bans] }));

    await writeAudit({
      category: "security",
      action: kind === "device" ? "ban_device" : "ban_ip",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "bans",
      targetId: newBan.id,
      changes: { kind, value, reason, durationHours },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  unban: async (banId) => {
    const actor = get().currentActor;
    const target = get().bans.find((b) => b.id === banId);
    if (!target) return;

    set((state) => ({
      bans: state.bans.filter((b) => b.id !== banId),
    }));

    await writeAudit({
      category: "security",
      action: "unban_target",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "bans",
      targetId: banId,
      changes: { value: target.value, kind: target.kind },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  settings: DEFAULT_SETTINGS,

  updateSettings: async (key, value) => {
    const actor = get().currentActor;
    const beforeValue = get().settings[key];

    set((state) => ({
      settings: {
        ...state.settings,
        [key]: value,
      },
    }));

    await writeAudit({
      category: "system",
      action: "update_settings",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "system_settings",
      targetId: key,
      changes: { before: beforeValue, after: value },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  resetSettings: async () => {
    const actor = get().currentActor;
    set({ settings: DEFAULT_SETTINGS });

    await writeAudit({
      category: "system",
      action: "reset_settings_default",
      outcome: "success",
      actorId: actor.userId,
      actorRole: actor.role,
      actorLabel: actor.displayName,
      targetTable: "system_settings",
      targetId: "all",
      changes: { resetTo: "DEFAULT_SETTINGS" },
      ip: actor.ip,
      deviceId: actor.deviceId,
    });
    get().refreshAuditLogs();
  },

  auditLogs: getLocalAuditLogs(),

  refreshAuditLogs: () => {
    set({ auditLogs: getLocalAuditLogs() });
  },
}));
