"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Shield, Stethoscope, ArrowLeft, LogIn } from "lucide-react";
import { BigButton } from "@/components/kiosk/BigButton";

export default function StaffLoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<"director" | "physio">("director");
  const [username, setUsername] = useState("director.admin");
  const [password, setPassword] = useState("Director1234!");
  const [error, setError] = useState<string | null>(null);

  const handleQuickDirector = () => {
    setRole("director");
    setUsername("director.admin");
    setPassword("Director1234!");
    setError(null);
  };

  const handleQuickPhysio = () => {
    setRole("physio");
    setUsername("physio.somchai");
    setPassword("Physio1234!");
    setError(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    // Store active staff role in session storage for demo
    if (typeof window !== "undefined") {
      sessionStorage.setItem("staff_role", role);
      sessionStorage.setItem("staff_username", username);
    }
    router.push("/staff/overview");
  };

  return (
    <div className="min-h-screen bg-slate-900 text-[#1F3A4D] flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-[linear-gradient(180deg,#E8F8F1_0%,#FFFFFF_50%,#E4F0FC_100%)] rounded-3xl p-8 sm:p-10 shadow-2xl border-4 border-slate-700 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F3A4D]/10 pb-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-base font-bold text-[#536E80] hover:text-[#1F3A4D] cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>กลับหน้าหลัก Kiosk</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
            <Lock className="w-3.5 h-3.5" />
            <span>พอร์ทัลบุคลากร</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <div className="w-18 h-18 rounded-2xl bg-[#2FB39A] text-[#1F3A4D] flex items-center justify-center mx-auto mb-3 shadow-md">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-[#1F3A4D]">
            เข้าสู่ระบบบุคลากร (Staff Portal)
          </h1>
          <p className="text-base text-[#536E80] mt-1">
            Dr.Tech.Care — ระบบบริหารจัดการคลินิกกายภาพบำบัด
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 bg-slate-200/60 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={handleQuickDirector}
            className={`py-3 px-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === "director"
                ? "bg-white text-[#1F3A4D] shadow-md border-2 border-[#2FB39A]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Shield className="w-5 h-5 text-[#2FB39A]" />
            <span>ผู้อำนวยการ (9 เมนู)</span>
          </button>

          <button
            type="button"
            onClick={handleQuickPhysio}
            className={`py-3 px-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
              role === "physio"
                ? "bg-white text-[#1F3A4D] shadow-md border-2 border-[#3F7FD0]"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Stethoscope className="w-5 h-5 text-[#3F7FD0]" />
            <span>นักกายภาพ (7 เมนู)</span>
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-bold text-[#1F3A4D]">ชื่อผู้ใช้งาน (Username)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-3.5 mt-1 rounded-xl border-2 border-slate-300 bg-white font-medium text-lg outline-none focus:border-[#2FB39A]"
              placeholder="กรอกชื่อผู้ใช้..."
            />
          </div>

          <div>
            <label className="text-sm font-bold text-[#1F3A4D]">รหัสผ่าน (Password)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3.5 mt-1 rounded-xl border-2 border-slate-300 bg-white font-medium text-lg outline-none focus:border-[#2FB39A]"
              placeholder="กรอกรหัสผ่าน..."
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-300 text-rose-700 text-sm font-bold">
              {error}
            </div>
          )}

          <div className="mt-2">
            <BigButton
              type="submit"
              variant={role === "director" ? "primary-green" : "primary-blue"}
              icon={<LogIn className="w-6 h-6" />}
              onClick={handleLogin}
            >
              เข้าสู่ระบบ {role === "director" ? "ผู้อำนวยการ" : "นักกายภาพบำบัด"}
            </BigButton>
          </div>
        </form>

        {/* Quick Test Demo Section */}
        <div className="border-t border-slate-200 pt-4 flex flex-col gap-2 text-center text-xs text-[#536E80]">
          <span className="font-bold">โหมดทดสอบด่วน:</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleQuickDirector}
              className="p-2 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 font-bold hover:bg-teal-100 cursor-pointer"
            >
              ใส่บัญชี ผอ. (director.admin)
            </button>
            <button
              type="button"
              onClick={handleQuickPhysio}
              className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 font-bold hover:bg-blue-100 cursor-pointer"
            >
              ใส่บัญชี นักกายภาพ (physio.somchai)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
