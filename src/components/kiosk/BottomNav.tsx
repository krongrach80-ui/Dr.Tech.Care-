"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Calendar, TrendingUp, AlertTriangle, LogOut } from "lucide-react";
import { resetKioskState } from "@/lib/kiosk";

interface BottomNavProps {
  onLogoutClick?: () => void;
}

export function BottomNav({ onLogoutClick = () => resetKioskState() }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/home",
      label: "หน้าหลัก",
      icon: Home,
    },
    {
      href: "/today",
      label: "วันนี้",
      icon: Calendar,
    },
    {
      href: "/progress",
      label: "ความก้าวหน้า",
      icon: TrendingUp,
    },
    {
      href: "/report-symptom",
      label: "แจ้งอาการ",
      icon: AlertTriangle,
    },
  ];

  return (
    <nav
      aria-label="แถบเมนูนำทางหลัก"
      className="
        w-full bg-white/95 backdrop-blur-md
        border-t-2 border-[#1F3A4D]/10
        px-6 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.06)]
        flex items-center justify-around z-40
      "
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={`
              flex flex-col items-center justify-center
              min-w-[120px] min-h-[96px] px-4 py-2 rounded-2xl
              transition-all duration-150 active:scale-95
              ${
                isActive
                  ? "bg-[#2FB39A]/15 text-[#1F3A4D] font-bold border-2 border-[#2FB39A]"
                  : "text-[#536E80] hover:text-[#1F3A4D] hover:bg-zinc-100"
              }
            `}
          >
            <Icon
              className={`w-9 h-9 mb-1 ${isActive ? "text-[#2FB39A] stroke-[2.5]" : "stroke-[2]"}`}
            />
            <span className="text-xl tracking-tight leading-tight">{item.label}</span>
          </Link>
        );
      })}

      {/* ปุ่มออกจากระบบ */}
      <button
        type="button"
        onClick={onLogoutClick}
        className="
          flex flex-col items-center justify-center
          min-w-[120px] min-h-[96px] px-4 py-2 rounded-2xl
          text-[#C0392B] hover:bg-red-50 active:scale-95
          transition-all duration-150 cursor-pointer
        "
      >
        <LogOut className="w-9 h-9 mb-1 stroke-[2.5]" />
        <span className="text-xl font-bold tracking-tight leading-tight">ออกจากระบบ</span>
      </button>
    </nav>
  );
}
