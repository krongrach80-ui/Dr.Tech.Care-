"use client";

import React from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Stethoscope,
  Activity,
  FileText,
  Settings,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { useAdminStore } from "@/lib/stores/adminStore";
import { roleLabelThai } from "@/lib/rbac";

export default function AdminOverviewPage() {
  const { currentActor, users, patients, physios, exercises, activeSessions, auditLogs } =
    useAdminStore();

  const isDirector = currentActor.role === "director";
  const activeUsersCount = users.filter((u) => !u.deletedAt).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[#0B2B2B] via-[#103D3D] to-[#1E8A4C] rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-emerald-500/20">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-emerald-300 text-xs font-semibold mb-3 backdrop-blur-md">
            <span>บทบาทปัจจุบัน:</span>
            <span className="text-white font-bold">{roleLabelThai(currentActor.role)}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            ยินดีต้อนรับ, {currentActor.displayName}
          </h1>
          <p className="text-sm text-emerald-100/90 mt-2 max-w-xl">
            {isDirector
              ? "ศูนย์ควบคุมและบริหารจัดการระบบ Dr.Tech.Care เฟส 1 พร้อมการตรวจสอบความปลอดภัย 3 ชั้น และ Audit Hash Chain"
              : "ระบบเวชระเบียนและจัดการการฟื้นฟูกายภาพบำบัดสำหรับคนไข้ในความรับผิดชอบของคุณ"}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/patients"
            className="px-5 py-2.5 rounded-xl bg-white text-[#0B2B2B] hover:bg-emerald-50 text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>ดูรายชื่อคนไข้</span>
            <ArrowRight className="w-4 h-4 text-[#1E8A4C]" />
          </Link>
          {isDirector && (
            <Link
              href="/admin/audit"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-2 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-emerald-300" />
              <span>ประวัติความปลอดภัย</span>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">บัญชีผู้ใช้งานทั้งหมด</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{activeUsersCount}</p>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> รวมทุกบทบาทในระบบ
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#1E8A4C] flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">คนไข้ในระบบ</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{patients.length}</p>
            <span className="text-[11px] text-teal-600 font-medium flex items-center gap-1 mt-1">
              เวชระเบียนที่เปิดใช้งาน
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">นักกายภาพบำบัด</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{physios.length}</p>
            <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1 mt-1">
              มีใบอนุญาตประกอบวิชาชีพ
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <Stethoscope className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">ท่ากายภาพมาตรฐาน</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{exercises.length}</p>
            <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1 mt-1">
              พร้อมสื่อประกอบการฝึก
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Feature Navigation Cards */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
          เมนูการจัดการประจำเฟส 1
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-[#1E8A4C] hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#1E8A4C] transition-colors">
                1. จัดการผู้ใช้งาน (Users)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {isDirector
                  ? "เพิ่มบัญชีทุกบทบาท, แก้ไขชื่อ, รีเซ็ตรหัสผ่าน, ระงับ/เปิดบัญชี และลบบัญชีแบบ Soft Delete พร้อมการยืนยัน"
                  : "ดูบัญชีตนเองและคนไข้ในความรับผิดชอบ, เพิ่มบัญชีคนไข้ใหม่, แก้ไขชื่อและรีเซ็ตรหัสผ่าน"}
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1E8A4C]">
              <span>เข้าสู่หน้าต่าง</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/patients"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-[#1E8A4C] hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#1E8A4C] transition-colors">
                2. ข้อมูลคนไข้ (Patients)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                เวชระเบียนคลินิก, ข้อมูลประวัติการบาดเจ็บ, กำหนดนักกายภาพที่ดูแล, บันทึกโน้ตนักกายภาพ
                (physio_notes) และแท็บผลการรักษา
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1E8A4C]">
              <span>เข้าสู่หน้าต่าง</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/physios"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-[#1E8A4C] hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#1E8A4C] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#1E8A4C] transition-colors">
                3. ข้อมูลนักกายภาพ (Physiotherapists)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                ทำเนียบนักกายภาพบำบัด, เลขใบอนุญาตวิชาชีพ, ประวัติความเชี่ยวชาญ และรายชื่อคนไข้ที่รับผิดชอบดูแล
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1E8A4C]">
              <span>เข้าสู่หน้าต่าง</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          <Link
            href="/admin/exercises"
            className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-[#1E8A4C] hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm group-hover:text-[#1E8A4C] transition-colors">
                4. ท่ากายภาพ (Exercises)
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                คลังท่ากายภาพมาตรฐาน, ขั้นตอนการฝึกทีละข้อ, กล้ามเนื้อเป้าหมาย, อัปโหลดรูป/วิดีโอผ่าน Supabase
                Storage (exercise-media)
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-[#1E8A4C]">
              <span>เข้าสู่หน้าต่าง</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {isDirector && (
            <Link
              href="/admin/audit"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-purple-600 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                    5. ประวัติการใช้งาน & ความปลอดภัย (Audit)
                  </h3>
                  <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                    แอดมินใหญ่
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  แผงเซสชันที่กำลังใช้งานอยู่ (เตะออกจากระบบ), ไทม์ไลน์ Audit Hash Chain, จัดการแบนเครื่อง/IP
                  และตรวจสอบความสมบูรณ์ของสายโซ่
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-purple-700">
                <span>เข้าสู่หน้าต่าง</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )}

          {isDirector && (
            <Link
              href="/admin/settings"
              className="bg-white p-5 rounded-2xl border border-slate-200/80 hover:border-purple-600 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-sm group-hover:text-slate-900 transition-colors">
                    6. ตั้งค่าระบบ (Settings)
                  </h3>
                  <span className="text-[9px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded">
                    แอดมินใหญ่
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  ตั้งค่า AI สแกนใบหน้า, AI วิเคราะห์ท่า, ตู้ Kiosk (จับคู่/Timeout 30–60 วิ), ความปลอดภัย และนโยบาย
                  physio_scope
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>เข้าสู่หน้าต่าง</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* Online Sessions & Recent Activity Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              เซสชันที่กำลังใช้งาน (Active Sessions)
            </h3>
            <span className="text-xs font-bold text-[#1E8A4C]">{activeSessions.length} เครื่อง</span>
          </div>

          <div className="flex flex-col gap-2">
            {activeSessions.slice(0, 3).map((s) => (
              <div
                key={s.id}
                className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{s.displayName}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-full font-medium">
                      {roleLabelThai(s.role)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {s.device} • {s.ip}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400">{s.loginTime}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-700">
              สถานะความปลอดภัย Hash Chain
            </h3>
            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-[#1E8A4C] rounded-full">
              สายโซ่สมบูรณ์
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 text-xs text-[#0B2B2B] flex flex-col gap-2">
            <div className="flex items-center gap-2 font-bold text-[#1E8A4C]">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Cryptographic Audit Chain (SHA-256)</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              ทุกการดำเนินการ (เพิ่ม/แก้ไข/ลบ/แบน) ถูกผูกด้วย SHA-256 Hash Chain ไม่สามารถแก้ไขหรือลบย้อนหลังได้
              จำนวนบันทึกปัจจุบัน: {auditLogs.length} รายการ
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
