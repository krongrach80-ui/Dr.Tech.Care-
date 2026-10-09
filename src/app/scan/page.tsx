"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { KioskShell } from "@/components/kiosk/KioskShell";
import { CameraMirror } from "@/components/kiosk/CameraMirror";
import { generateServerChallenge, ServerChallenge, BiometricVerificationPayload } from "@/lib/biometrics";

export default function StandaloneScanPage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<ServerChallenge>(() => generateServerChallenge());
  const [isSuccess, setIsSuccess] = useState(false);

  const handleStepComplete = (
    stepNum: 1 | 2 | 3,
    metric: { yaw: number; quality: number; embedding: number[] }
  ) => {
    console.log(`[Scan Page] Step ${stepNum} complete: yaw=${metric.yaw}, quality=${metric.quality}`);
  };

  const handleAllStepsComplete = (payload: BiometricVerificationPayload) => {
    console.log("[Scan Page] All 3 steps complete! Payload verified:", payload);
    setIsSuccess(true);
    setTimeout(() => {
      router.push("/home");
    }, 1800);
  };

  return (
    <KioskShell idleTimeoutSeconds={60} enableIdleGuard={true} showStaffTrigger={true}>
      <div className="flex-1 flex flex-col justify-between items-center w-full max-w-sm mx-auto h-full min-h-0 px-4 py-4 select-none">
        {/* Header */}
        <div className="w-full flex items-center justify-between pb-2 border-b border-[#0B2B2B]/10 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-[#0B2B2B]/15 text-[#0B2B2B] font-semibold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก</span>
          </button>
          <div className="flex items-center gap-1 text-xs font-bold text-[#1E8A4C]">
            <ShieldCheck className="w-4 h-4" />
            <span>สแกนใบหน้า</span>
          </div>
        </div>

        {/* Content */}
        <div className="w-full flex-1 flex flex-col items-center justify-center my-auto py-2">
          {isSuccess ? (
            <div className="w-full aspect-[3/4] max-h-[460px] rounded-3xl bg-emerald-950/30 border-4 border-[#1E8A4C] flex flex-col items-center justify-center text-center p-6 shadow-2xl animate-in zoom-in-95">
              <div className="w-20 h-20 rounded-full bg-[#1E8A4C] text-white flex items-center justify-center mb-4 shadow-lg animate-bounce">
                <CheckCircle2 className="w-12 h-12 stroke-[2.5]" />
              </div>
              <h2 className="text-2xl font-extrabold text-[#0B2B2B] mb-2">
                ยืนยันตัวตนสำเร็จ!
              </h2>
              <p className="text-sm font-medium text-[#1E8A4C]">
                กำลังนำท่านเข้าสู่ระบบผู้รับบริการ...
              </p>
            </div>
          ) : (
            <div className="w-full aspect-[3/4] max-h-[460px]">
              <CameraMirror
                className="w-full h-full"
                challenge={challenge}
                challengeNonce={challenge.nonce}
                onStepComplete={handleStepComplete}
                onAllStepsComplete={handleAllStepsComplete}
                onCancelScan={() => router.push("/")}
                onRestartScan={() => setChallenge(generateServerChallenge())}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-[11px] text-[#527070] pt-1 border-t border-[#0B2B2B]/10 w-full flex-shrink-0">
          ระบบสแกนใบหน้าทางการแพทย์ Dr.Tech.Care (PDPA Compliant)
        </div>
      </div>
    </KioskShell>
  );
}