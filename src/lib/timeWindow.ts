/**
 * src/lib/timeWindow.ts
 * Dr.Tech.Care — ตรรกะตรวจสอบช่วงเวลาการฝึกกายภาพบำบัด
 * กฎ: เริ่มทำได้ในช่วง [เริ่ม − 30 นาที, สิ้นสุด + 60 นาที] (ตั้งค่าได้) หรือ โหมด allow_anytime_today
 */

export interface TimeWindowOptions {
  windowBeforeMinutes?: number; // เริ่มก่อนเวลาได้กี่นาที (ค่าเริ่มต้น 30 นาที)
  windowAfterMinutes?: number;  // ทำเลยเวลาสิ้นสุดได้กี่นาที (ค่าเริ่มต้น 60 นาที)
  allowAnytimeToday?: boolean;  // โหมดอนุญาตให้ทำได้ตลอดทั้งวัน
}

export interface TimeWindowResult {
  isOpen: boolean;
  status: "ready" | "pending" | "missed";
  reasonTh: string;
  earliestAllowedTime: string;
  latestAllowedTime: string;
}

/**
 * แปลง "HH:mm" เป็นจำนวนนาทีนับจาก 00:00
 */
export function timeStringToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(":");
  const hours = parseInt(parts[0] ?? "0", 10);
  const minutes = parseInt(parts[1] ?? "0", 10);
  return hours * 60 + minutes;
}

/**
 * แปลงจำนวนนาทีเป็น "HH:mm"
 */
export function minutesToTimeString(totalMinutes: number): string {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, totalMinutes));
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * ตรวจสอบว่าช่วงเวลาปัจจุบันอยู่ในช่วงที่อนุญาตให้เริ่มทำกายภาพหรือไม่
 * @param startTime "HH:mm" เช่น "09:00"
 * @param endTime "HH:mm" เช่น "10:00"
 * @param currentTime "HH:mm" หรือ Date ปัจจุบัน
 * @param options การตั้งค่าช่วงเวลา
 */
export function isExerciseTimeWindowOpen(
  startTime: string,
  endTime: string,
  currentTime: string | Date = new Date(),
  options: TimeWindowOptions = {}
): TimeWindowResult {
  const {
    windowBeforeMinutes = 30,
    windowAfterMinutes = 60,
    allowAnytimeToday = false,
  } = options;

  let currentMin: number;
  if (typeof currentTime === "string") {
    currentMin = timeStringToMinutes(currentTime);
  } else {
    currentMin = currentTime.getHours() * 60 + currentTime.getMinutes();
  }

  const startMin = timeStringToMinutes(startTime);
  const endMin = timeStringToMinutes(endTime);

  const earliestMin = Math.max(0, startMin - windowBeforeMinutes);
  const latestMin = Math.min(23 * 60 + 59, endMin + windowAfterMinutes);

  const earliestAllowedTime = minutesToTimeString(earliestMin);
  const latestAllowedTime = minutesToTimeString(latestMin);

  // กรณีเปิดโหมดอนุญาตตลอดทั้งวัน
  if (allowAnytimeToday) {
    return {
      isOpen: true,
      status: "ready",
      reasonTh: "เปิดให้เริ่มฝึกได้ตลอดวัน (โหมดพิเศษ)",
      earliestAllowedTime: "00:00",
      latestAllowedTime: "23:59",
    };
  }

  if (currentMin < earliestMin) {
    return {
      isOpen: false,
      status: "pending",
      reasonTh: `ยังไม่ถึงเวลา (เริ่มได้ตั้งแต่ ${earliestAllowedTime} น.)`,
      earliestAllowedTime,
      latestAllowedTime,
    };
  }

  if (currentMin > latestMin) {
    return {
      isOpen: false,
      status: "missed",
      reasonTh: `เลยกำหนดเวลาแล้ว (สิ้นสุดสิทธิ์ ${latestAllowedTime} น.)`,
      earliestAllowedTime,
      latestAllowedTime,
    };
  }

  return {
    isOpen: true,
    status: "ready",
    reasonTh: "อยู่ในช่วงเวลาที่พร้อมเริ่มทำกายภาพ",
    earliestAllowedTime,
    latestAllowedTime,
  };
}
