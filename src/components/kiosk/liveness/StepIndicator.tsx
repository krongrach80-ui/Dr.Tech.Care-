"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { LivenessPose, LivenessSequence } from "@/lib/biometrics";

interface StepIndicatorProps {
  currentStepIndex: 0 | 1 | 2;
  sequence: LivenessSequence;
}

const POSE_LABELS: Record<LivenessPose, string> = {
  center: "มองตรง",
  left: "หันซ้าย",
  right: "หันขวา",
};

export function StepIndicator({ currentStepIndex, sequence }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2 w-full my-2">
      {sequence.map((pose, idx) => {
        const isCompleted = idx < currentStepIndex;
        const isActive = idx === currentStepIndex;
        const stepNum = idx + 1;

        return (
          <div
            key={`${pose}-${idx}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all shadow-sm ${
              isActive
                ? "bg-[#1E8A4C] text-white ring-2 ring-[#6FD67F] shadow-[#1E8A4C]/30 scale-105"
                : isCompleted
                ? "bg-emerald-100 text-[#1E8A4C] border border-[#1E8A4C]/30"
                : "bg-slate-200/80 text-[#536E80] border border-slate-300/40"
            }`}
          >
            <span>
              {stepNum}. {POSE_LABELS[pose]}
            </span>
            {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-[#1E8A4C] ml-0.5" />}
          </div>
        );
      })}
    </div>
  );
}
