"use client";

import React from "react";

export type BigButtonVariant = "primary-green" | "primary-blue" | "danger" | "ghost";

export interface BigButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BigButtonVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function BigButton({
  variant = "primary-green",
  icon,
  children,
  fullWidth = true,
  className = "",
  disabled = false,
  ...props
}: BigButtonProps) {
  // กฎเหล็กเรื่อง Contrast:
  // - primary-green (#2FB39A): บังคับใช้ตัวอักษรสีเข้ม #1F3A4D (~4.5:1) ห้ามใช้สีขาว
  // - primary-blue (#3F7FD0): ตัวอักษรสีขาวหนา >= 24px (~4.1:1 ผ่านเกณฑ์ตัวใหญ่)
  const variantStyles: Record<BigButtonVariant, string> = {
    "primary-green":
      "bg-[#2FB39A] text-[#1F3A4D] hover:bg-[#269984] active:bg-[#208774] shadow-lg shadow-[#2FB39A]/20 border-2 border-[#208774]/30",
    "primary-blue":
      "bg-[#3F7FD0] text-white hover:bg-[#326ab0] active:bg-[#275794] shadow-lg shadow-[#3F7FD0]/25 border-2 border-[#275794]/30",
    danger:
      "bg-[#C0392B] text-white hover:bg-[#A93226] active:bg-[#922B21] shadow-lg shadow-[#C0392B]/25 border-2 border-[#922B21]/30",
    ghost:
      "bg-white/90 text-[#1F3A4D] hover:bg-white active:bg-zinc-100 border-3 border-[#1F3A4D]/40 shadow-md",
  };

  return (
    <button
      type="button"
      disabled={disabled}
      className={`
        min-h-[96px] min-w-[96px] px-8 py-5
        rounded-[24px] text-[32px] font-bold leading-tight
        flex items-center justify-center gap-4
        transition-all duration-150 transform active:scale-[0.98]
        cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
        ${fullWidth ? "w-full" : ""}
        ${variantStyles[variant]}
        ${className}
      `}
      {...props}
    >
      {icon && <span className="flex-shrink-0 flex items-center">{icon}</span>}
      <span className="truncate">{children}</span>
    </button>
  );
}
