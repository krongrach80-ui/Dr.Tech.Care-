/**
 * Web Speech API Voice Guidance Helper for Thai Kiosk System
 * รองรับการอ่านออกเสียงคำแนะนำภาษาไทยสำหรับผู้สูงอายุ
 */

export function stopSpeech(): void {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // no-op
    }
  }
}

export function speakThai(text: string, enabled = true): void {
  if (!enabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  try {
    // ยกเลิกข้อความก่อนหน้าเพื่อไม่ให้เสียงทับซ้อนกัน
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "th-TH";
    utterance.rate = 0.92; // ความเร็วพอเหมาะ ชัดถ้อยชัดคำสำหรับผู้สูงอายุ
    utterance.pitch = 1.0;

    // ค้นหาเสียงภาษาไทยถ้ามีในระบบ
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find((v) => v.lang === "th-TH" || v.lang.startsWith("th"));
    if (thaiVoice) {
      utterance.voice = thaiVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech synthesis notice:", err);
  }
}
