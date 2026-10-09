import { format, toDate } from "date-fns";
import { th } from "date-fns/locale";

const THAI_LEADING_VOWELS = new Set(["เ", "แ", "โ", "ใ", "ไ"]);

/**
 * ปิดบังนามสกุลเพื่อความเป็นส่วนตัวตาม PDPA (เช่น "ธนากร", "วงศ์สกุล" -> "ธนากร ว****")
 * ใช้ Intl.Segmenter เพื่อจัดการ grapheme cluster ภาษาไทยอย่างถูกต้อง ไม่ให้สระหรือวรรณยุกต์ขาดวิ่น
 */
export function maskName(firstName: string, lastName?: string): string {
  let cleanFirst = firstName.trim();
  let cleanLast = (lastName ?? "").trim();

  if (!cleanLast && cleanFirst.includes(" ")) {
    const parts = cleanFirst.split(/\s+/);
    cleanFirst = parts[0] ?? "";
    cleanLast = parts.slice(1).join(" ");
  }

  if (!cleanLast) {
    return cleanFirst;
  }

  const segmenter = new Intl.Segmenter("th", { granularity: "grapheme" });
  const segments = Array.from(segmenter.segment(cleanLast), (s) => s.segment);

  if (segments.length === 0) {
    return cleanFirst;
  }

  const firstSeg = segments[0] ?? "";

  // กรณีขึ้นต้นด้วยสระนำหน้า เช่น "เ", "แ", "โ", "ใ", "ไ" ให้รวมพยัญชนะตัวถัดไปด้วย (เช่น "เก")
  let visiblePart = firstSeg;
  if (THAI_LEADING_VOWELS.has(firstSeg) && segments.length > 1) {
    visiblePart = firstSeg + (segments[1] ?? "");
  }

  return `${cleanFirst} ${visiblePart}****`;
}

/**
 * จัดรูปแบบวันที่เป็นภาษาไทยพร้อมปี พ.ศ. (ปี ค.ศ. + 543)
 * เช่น "10 ตุลาคม 2569" หรือ "10 ต.ค. 2569"
 */
export function formatThaiDate(
  dateInput: Date | string | number,
  options?: {
    formatStyle?: "full" | "medium" | "short";
    includeTime?: boolean;
  }
): string {
  const date = typeof dateInput === "string" || typeof dateInput === "number"
    ? toDate(dateInput)
    : dateInput;

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const christianYear = date.getFullYear();
  const buddhistYear = christianYear + 543;

  const style = options?.formatStyle ?? "medium";
  const includeTime = options?.includeTime ?? false;

  let pattern = "d MMMM";
  if (style === "short") {
    pattern = "d/M";
  } else if (style === "medium") {
    pattern = "d MMM";
  }

  const formattedDateWithoutYear = format(date, pattern, { locale: th });
  let result = `${formattedDateWithoutYear} ${buddhistYear}`;

  if (includeTime) {
    const formattedTime = format(date, "HH:mm น.", { locale: th });
    result += ` เวลา ${formattedTime}`;
  }

  return result;
}

/**
 * คำนวณอายุจากวันเกิด
 */
export function calculateAge(birthDate: Date | string): number {
  const birth = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  if (Number.isNaN(birth.getTime())) return 0;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return Math.max(0, age);
}
