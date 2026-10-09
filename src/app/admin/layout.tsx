"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  UserCheck,
  Stethoscope,
  Activity,
  FileText,
  Settings,
  Shield,
  LogOut,
  LayoutDashboard,
  UserCog,
} from "lucide-react";
import { useAdminStore } from "@/lib/stores/adminStore";
import { roleLabelThai, getAccessibleAdminMenus, type AdminMenuKey } from "@/lib/rbac";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { currentActor, setActorRole } = useAdminStore();

  const accessibleMenus = getAccessibleAdminMenus(currentActor.role);

  const menuConfig: Record<
    AdminMenuKey,
    { label: string; href: string; icon: React.ReactNode }
  > = {
    overview: {
      label: "ภาพรวมระบบ",
      href: "/admin/overview",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    users: {
      label: "จัดการผู้ใช้งาน",
      href: "/admin/users",
      icon: <Users className="w-5 h-5" />,
    },
    patients: {
      label: "ข้อมูลคนไข้",
      href: "/admin/patients",
      icon: <UserCheck className="w-5 h-5" />,
    },
    physios: {
      label: "ข้อมูลนักกายภาพ",
      href: "/admin/physios",
      icon: <Stethoscope className="w-5 h-5" />,
    },
    exercises: {
      label: "ท่ากายภาพ",
      href: "/admin/exercises",
      icon: <Activity className="w-5 h-5" />,
    },
    schedule: {
      label: "ตารางฝึกกายภาพ",
      href: "/admin/schedule",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    symptoms: {
      label: "แจ้งอาการผิดปกติ",
      href: "/admin/symptoms",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    audit: {
      label: "ประวัติการใช้งาน & ความปลอดภัย",
      href: "/admin/audit",
      icon: <FileText className="w-5 h-5" />,
    },
    settings: {
      label: "ตั้งค่าระบบ",
      href: "/admin/settings",
      icon: <Settings className="w-5 h-5" />,
    },
  };

  // กรองเฉพาะเมนูที่กำหนดใน Phase 1
  const phase1MenuKeys: AdminMenuKey[] = [
    "overview",
    "users",
    "patients",
    "physios",
    "exercises",
    "audit",
    "settings",
  ];

  const visibleMenus = phase1MenuKeys.filter((key) => accessibleMenus.includes(key));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-[#0B2B2B] text-white flex flex-col justify-between shrink-0 shadow-xl border-r border-[#1E8A4C]/20">
        <div>
          {/* Logo & Brand Header */}
          <div className="p-6 border-b border-slate-700/60 flex items-center justify-between">
            <Link href="/admin/overview" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1E8A4C] to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-900/40">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg tracking-tight text-white leading-tight">
                  Dr.Tech.Care
                </h1>
                <p className="text-[11px] text-emerald-300 font-medium">
                  ระบบบริหารคลินิกกายภาพบำบัด
                </p>
              </div>
            </Link>
          </div>

          {/* Current Actor Info & Role Switcher */}
          <div className="p-4 mx-3 my-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">
                ผู้ใช้งานปัจจุบัน
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  currentActor.role === "director"
                    ? "bg-purple-900/60 text-purple-200 border border-purple-500/40"
                    : "bg-emerald-900/60 text-emerald-200 border border-emerald-500/40"
                }`}
              >
                {roleLabelThai(currentActor.role)}
              </span>
            </div>
            <p className="text-xs font-bold text-white truncate">{currentActor.displayName}</p>
            <p className="text-[11px] text-slate-400">@{currentActor.username}</p>

            {/* Quick Role Switcher for Matrix Testing */}
            <div className="mt-3 pt-3 border-t border-white/10 flex flex-col gap-1.5">
              <span className="text-[10px] text-slate-400 font-semibold">
                สลับบทบาททดสอบสิทธิ์ (Testing):
              </span>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  type="button"
                  id="btn-switch-director"
                  onClick={() => setActorRole("director")}
                  className={`px-2 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    currentActor.role === "director"
                      ? "bg-purple-600 text-white shadow-md shadow-purple-900/50"
                      : "bg-white/10 text-slate-300 hover:bg-white/20"
                  }`}
                >
                  แอดมินใหญ่
                </button>
                <button
                  type="button"
                  id="btn-switch-physio"
                  onClick={() => setActorRole("physio")}
                  className={`px-2 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    currentActor.role === "physio"
                      ? "bg-[#1E8A4C] text-white shadow-md shadow-emerald-900/50"
                      : "bg-white/10 text-slate-300 hover:bg-white/20"
                  }`}
                >
                  นักกายภาพ
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 flex flex-col gap-1">
            {visibleMenus.map((key) => {
              const item = menuConfig[key];
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={key}
                  href={item.href}
                  id={`nav-${key}`}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#1E8A4C] text-white shadow-md shadow-emerald-950/40"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className={isActive ? "text-white" : "text-emerald-400"}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-700/60 flex flex-col gap-2">
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>เวอร์ชันระบบ</span>
            <span className="font-mono text-emerald-300">v1.0 (เฟส 1)</span>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-200 text-xs font-semibold transition-all border border-white/5 hover:border-rose-500/30"
          >
            <LogOut className="w-4 h-4" />
            <span>กลับสู่หน้าหลักตู้ Kiosk</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <UserCog className="w-5 h-5 text-[#1E8A4C]" />
            <span className="text-xs text-slate-500 font-medium">เข้าใช้งานในฐานะ:</span>
            <span className="text-xs font-bold text-slate-800">
              {currentActor.displayName} ({roleLabelThai(currentActor.role)})
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-[#1E8A4C] border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-[#1E8A4C] animate-pulse" />
              ระบบออนไลน์
            </span>
          </div>
        </header>

        <div className="p-6 max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
