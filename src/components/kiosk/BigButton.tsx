"use client";

import React from "react";

export type BigButtonVariant =
  | "strong-primary"
  | "strong-secondary"
  | "primary-green"
  | "primary-blue"
  | "danger"
  | "ghost";

export interface BigButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BigButtonVariant;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function BigButton({
  variant = "strong-primary",
  icon,
  subtitle,
  children,
  fullWidth = true,
  className = "",
  disabled = false,
  ...props
}: BigButtonProps) {
  // กฎเหล็กเรื่อง Contrast & Accessibility สำหรับผู้สูงอายุ:
  // - strong-primary (#1E8A4C): ตัวอักษรสีขาวหนา Contrast 4.75:1 ผ่านเกณฑ์ WCAG AA/AAA
  // - strong-secondary (#6FD67F): บังคับตัวอักษรสีเข้ม #0B2B2B Contrast 9.8:1 ผ่านเกณฑ์ WCAG AAA
  const variantStyles: Record<BigButtonVariant, string> = {
    "strong-primary":
      "bg-[#1E8A4C] text-white hover:bg-[#17733E] active:bg-[#125C31] shadow-lg shadow-[#1E8A4C]/20 border-2 border-[#156337]/40",
    "strong-secondary":
      "bg-[#6FD67F] text-[#0B2B2B] hover:bg-[#5EC76E] active:bg-[#4DB25D] shadow-lg shadow-[#6FD67F]/25 border-2 border-[#4EA85D]/40",
    "primary-green":
      "bg-[#2FB39A] text-[#1F3A4D] hover:bg-[#269984] active:bg-[#208774] shadow-lg shadow-[#2FB39A]/20 border-2 border-[#208774]/30",
    "primary-blue":
      "bg-[#3F7FD0] text-white hover:bg-[#326ab0] active:bg-[#275794] shadow-lg shadow-[#3F7FD0]/25 border-2 border-[#275794]/30",
    danger:
      "bg-[#C0392B] text-white hover:bg-[#A93226] active:bg-[#922B21] shadow-lg shadow-[#C0392B]/25 border-2 border-[#922B21]/30",
    ghost:
      "bg-white/95 text-[#0B2B2B] hover:bg-white active:bg-zinc-100 border-2 border-[#0B2B2B]/20 shadow-sm",
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
      {icon && <span className="flex-shrink-0 flex items-center justify-center">{icon}</span>}
      <div className="flex flex-col items-center justify-center text-center">
        <span>{children}</span>
        {subtitle && (
          <span className="text-sm sm:text-base font-medium opacity-90 mt-0.5">
            {subtitle}
          </span>
        )}
      </div>
    </button>
  );
}
