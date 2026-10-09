"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Shield,
  Stethoscope,
  Users,
  Calendar,
  Activity,
  FileText,
  Settings,
  Bell,
  LogOut,
} from "lucide-react";
import { getAccessibleAdminMenus, type AppRole, type AdminMenuKey } from "@/lib/rbac";

export default function StaffOverviewPage() {
  const router = useRouter();

  const [role, setRole] = useState<AppRole>(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("staff_role") as AppRole | null;
      if (saved === "director" || saved === "physio") return saved;
    }
    return "director";
  });

  const [username, setUsername] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("staff_username") ?? "director.admin";
    }
    return "director.admin";
  });

  const visibleMenus: AdminMenuKey[] = getAccessibleAdminMenus(role);

  const menuIcons: Record<AdminMenuKey, React.ReactNode> = {
    overview: <Activity className="w-6 h-6 text-[#2FB39A]" />,
    users: <Users className="w-6 h-6 text-[#3F7FD0]" />,
    patients: <Users className="w-6 h-6 text-teal-600" />,
    physios: <Stethoscope className="w-6 h-6 text-blue-600" />,
    exercises: <Activity className="w-6 h-6 text-emerald-500" />,
    schedule: <Calendar className="w-6 h-6 text-amber-500" />,
    symptoms: <Bell className="w-6 h-6 text-rose-500" />,
    audit: <FileText className="w-6 h-6 text-purple-600" />,
    settings: <Settings className="w-6 h-6 text-slate-600" />,
  };

  const menuTitles: Record<AdminMenuKey, string> = {
    overview: "ภาพรวมระบบ (Overview)",
    users: "จัดการผู้ใช้งาน (Users)",
    patients: "จัดการรายชื่อผู้ป่วย (Patients)",
    physios: "จัดการนักกายภาพบำบัด (Physios)",
    exercises: "คลังท่ากายภาพบำบัด (Exercises)",
    schedule: "ตารางกายภาพประจำวัน (Schedule)",
    symptoms: "รายงานอาการผิดปกติ (Symptoms)",
    audit: "บันทึกความปลอดภัย (Audit Logs)",
    settings: "ตั้งค่าระบบ (System Settings)",
  };

  return (
    <div className="min-h-screen bg-slate-900 text-[#1F3A4D] flex flex-col items-center p-6">
      <div className="w-full max-w-5xl bg-[linear-gradient(180deg,#E8F8F1_0%,#FFFFFF_50%,#E4F0FC_100%)] rounded-3xl p-8 sm:p-10 shadow-2xl border-4 border-slate-700 flex flex-col gap-8">
        {/* Top Navbar */}
        <div className="flex items-center justify-between border-b border-[#1F3A4D]/10 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#2FB39A] text-[#1F3A4D] flex items-center justify-center shadow-md">
              {role === "director" ? <Shield className="w-8 h-8" /> : <Stethoscope className="w-8 h-8" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-[#1F3A4D]">
                  {role === "director" ? "นพ. วิทยา ผู้บริหารโรงพยาบาล" : "กภ. สมชาย ใจดี"}
                </h1>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                  role === "director" ? "bg-teal-100 text-teal-800" : "bg-blue-100 text-blue-800"
                }`}>
                  {role === "director" ? "ผู้อำนวยการ (Director)" : "นักกายภาพบำบัด (Physio)"}
                </span>
              </div>
              <p className="text-sm text-[#536E80]">บัญชี: {username} • เข้าสู่ระบบผ่าน Staff Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const nextRole: AppRole = role === "director" ? "physio" : "director";
                setRole(nextRole);
                setUsername(nextRole === "director" ? "director.admin" : "physio.somchai");
                if (typeof window !== "undefined") {
                  sessionStorage.setItem("staff_role", nextRole);
                }
              }}
              className="px-4 py-2 rounded-xl bg-white/90 hover:bg-white text-xs font-bold border border-slate-300 text-slate-700 shadow-sm cursor-pointer"
            >
              สลับเป็น: {role === "director" ? "นักกายภาพ" : "ผู้อำนวยการ"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/")}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold flex items-center gap-2 shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>กลับสู่หน้า Kiosk</span>
            </button>
          </div>
        </div>

        {/* Realtime Sync Badge */}
        <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-teal-900 text-base">
              ระบบหลังบ้านเชื่อมโยงกับหน้าตู้ Kiosk แบบ Real-time ผ่าน Supabase
            </span>
          </div>
          <span className="text-xs font-bold text-teal-700 bg-teal-100 px-3 py-1 rounded-full">
            Database Synced 100%
          </span>
        </div>

        {/* Role Menu Matrix */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black text-[#1F3A4D]">
              เมนูการทำงานที่ได้รับอนุญาต ({visibleMenus.length} เมนู)
            </h2>
            <span className="text-sm text-[#536E80] font-semibold">
              {role === "director"
                ? "ผอ. มีสิทธิ์สูงสุด 9 เมนู (รวม Audit Logs & Settings)"
                : "นักกายภาพบำบัด มีสิทธิ์ 7 เมนู (ไม่เห็น Audit & Settings)"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleMenus.map((menuKey: AdminMenuKey) => (
              <div
                key={menuKey}
                className="p-5 rounded-2xl bg-white border-2 border-slate-200/80 shadow-md hover:border-[#2FB39A] hover:shadow-lg transition-all flex items-center gap-4 cursor-pointer"
              >
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  {menuIcons[menuKey]}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[#1F3A4D]">
                    {menuTitles[menuKey]}
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">/admin/{menuKey}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-4 flex items-center justify-between text-xs text-[#536E80]">
          <span>Dr.Tech.Care Hospital Management System</span>
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-teal-700 font-bold hover:underline cursor-pointer"
          >
            ← กลับไปที่ตู้ Kiosk 1080×1920
          </button>
        </div>
      </div>
    </div>
  );
}
