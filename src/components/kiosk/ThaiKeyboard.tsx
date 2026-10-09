"use client";

import React, { useState } from "react";
import { Delete, Globe, ArrowUp, Check } from "lucide-react";

export type KeyboardMode = "th-normal" | "th-shift" | "en-lower" | "en-upper" | "numbers";

interface ThaiKeyboardProps {
  onChar: (char: string) => void;
  onBackspace: () => void;
  onSpace: () => void;
  onClose?: () => void;
  className?: string;
}

export function ThaiKeyboard({
  onChar,
  onBackspace,
  onSpace,
  onClose,
  className = "",
}: ThaiKeyboardProps) {
  const [mode, setMode] = useState<KeyboardMode>("th-normal");

  // Thai Normal layout (Kedmanee base)
  const thNormalRows = [
    ["_","ภ","ถ","ุ","ึ","ค","ต","จ","ข","ช"],
    ["ๆ","ไ","ำ","พ","ะ","ั","ี","ร","น","ย","บ","ล"],
    ["ฟ","ห","ก","ด","เ","้","่า","ส","ว","ง"],
    ["ผ","ป","แ","อ","ิ","ื","ท","ม","ใ","ฝ"],
  ];

  // Thai Shift layout (Kedmanee shifted)
  const thShiftRows = [
    ["%","๑","๒","๓","๔","ู","฿","๕","๖","๗","๘","๙"],
    ["๐","\"","ฎ","ฑ","ธ","ํ","๊","ณ","ฯ","ญ","ฐ",","],
    ["ฤ","ฆ","ฏ","โ","ฌ","็","๋","ษ","ศ","ซ"],
    ["(","?)","ฉ","ฮ","ฺ","์","ฒ","ฬ","ฦ"],
  ];

  // English Lowercase
  const enLowerRows = [
    ["1","2","3","4","5","6","7","8","9","0"],
    ["q","w","e","r","t","y","u","i","o","p"],
    ["a","s","d","f","g","h","j","k","l"],
    ["z","x","c","v","b","n","m"],
  ];

  // English Uppercase
  const enUpperRows = [
    ["!","@","#","$","%","^","&","*","(",")"],
    ["Q","W","E","R","T","Y","U","I","O","P"],
    ["A","S","D","F","G","H","J","K","L"],
    ["Z","X","C","V","B","N","M"],
  ];

  const getRows = () => {
    switch (mode) {
      case "th-normal":
        return thNormalRows;
      case "th-shift":
        return thShiftRows;
      case "en-lower":
        return enLowerRows;
      case "en-upper":
        return enUpperRows;
      default:
        return thNormalRows;
    }
  };

  const toggleShift = () => {
    if (mode === "th-normal") setMode("th-shift");
    else if (mode === "th-shift") setMode("th-normal");
    else if (mode === "en-lower") setMode("en-upper");
    else if (mode === "en-upper") setMode("en-lower");
  };

  const toggleLanguage = () => {
    if (mode.startsWith("th")) {
      setMode("en-lower");
    } else {
      setMode("th-normal");
    }
  };

  const rows = getRows();
  const isShiftActive = mode === "th-shift" || mode === "en-upper";
  const isThai = mode.startsWith("th");

  return (
    <div
      className={`w-full max-w-4xl mx-auto p-4 bg-white/95 backdrop-blur-md rounded-[32px] border-2 border-[#1F3A4D]/15 shadow-2xl flex flex-col gap-3 select-none ${className}`}
    >
      {/* Keyboard Grid */}
      {rows.map((row, rIdx) => (
        <div key={rIdx} className="flex justify-center items-center gap-2">
          {row.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => onChar(k)}
              className="
                min-h-[72px] min-w-[64px] px-3 py-2 rounded-xl
                bg-white hover:bg-zinc-100 active:bg-zinc-200
                text-2xl font-bold text-[#1F3A4D]
                border border-[#1F3A4D]/20 shadow-sm
                transition-transform active:scale-95 cursor-pointer
                flex items-center justify-center flex-1 max-w-[80px]
              "
            >
              {k}
            </button>
          ))}
        </div>
      ))}

      {/* Control Row: Shift, Lang, Space, Backspace, Close */}
      <div className="flex justify-center items-center gap-3 mt-1">
        {/* Shift Button */}
        <button
          type="button"
          onClick={toggleShift}
          className={`
            min-h-[76px] px-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-1.5
            border shadow-sm cursor-pointer active:scale-95 transition-all
            ${
              isShiftActive
                ? "bg-[#3F7FD0] text-white border-[#3F7FD0]"
                : "bg-zinc-100 text-[#1F3A4D] border-[#1F3A4D]/20"
            }
          `}
        >
          <ArrowUp className="w-6 h-6 stroke-[2.5]" />
          <span>ยกแคร่</span>
        </button>

        {/* Toggle Language */}
        <button
          type="button"
          onClick={toggleLanguage}
          className="
            min-h-[76px] px-5 rounded-2xl
            bg-zinc-100 hover:bg-zinc-200 text-[#1F3A4D]
            font-bold text-lg flex items-center justify-center gap-1.5
            border border-[#1F3A4D]/20 shadow-sm cursor-pointer active:scale-95
          "
        >
          <Globe className="w-6 h-6" />
          <span>{isThai ? "ไทย → EN" : "EN → ไทย"}</span>
        </button>

        {/* Spacebar */}
        <button
          type="button"
          onClick={onSpace}
          className="
            min-h-[76px] px-12 rounded-2xl flex-1
            bg-white hover:bg-zinc-100 active:bg-zinc-200
            text-xl font-bold text-[#1F3A4D]
            border border-[#1F3A4D]/20 shadow-sm
            cursor-pointer active:scale-95 transition-all
            flex items-center justify-center
          "
        >
          เว้นวรรค (Space)
        </button>

        {/* Backspace */}
        <button
          type="button"
          onClick={onBackspace}
          aria-label="ลบตัวอักษร"
          className="
            min-h-[76px] px-6 rounded-2xl
            bg-amber-100 hover:bg-amber-200 text-[#C77700]
            font-bold text-lg flex items-center justify-center gap-2
            border border-[#C77700]/30 shadow-sm cursor-pointer active:scale-95
          "
        >
          <Delete className="w-7 h-7 stroke-[2.5]" />
          <span>ลบ</span>
        </button>

        {/* Done / Close Button if provided */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="
              min-h-[76px] px-8 rounded-2xl
              bg-[#2FB39A] hover:bg-[#269984] text-[#1F3A4D]
              font-bold text-xl flex items-center justify-center gap-2
              border border-[#208774]/30 shadow-md cursor-pointer active:scale-95
            "
          >
            <Check className="w-7 h-7 stroke-[3]" />
            <span>เสร็จสิ้น</span>
          </button>
        )}
      </div>
    </div>
  );
}
