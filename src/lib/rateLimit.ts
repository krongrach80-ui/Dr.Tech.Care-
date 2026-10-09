/**
 * Rate Limiter & Lockout Guard สำหรับ Login (Client & In-Memory Safe)
 * ป้องกัน Brute-force & Credential Stuffing
 */

interface RateLimitRecord {
  count: number;
  lockedUntil: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 นาที

const attemptMap = new Map<string, RateLimitRecord>();

export function checkLoginRateLimit(key: string): {
  isAllowed: boolean;
  remainingAttempts: number;
  lockedUntil?: number;
} {
  const now = Date.now();
  const record = attemptMap.get(key);

  if (!record) {
    return { isAllowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  if (record.lockedUntil > now) {
    return {
      isAllowed: false,
      remainingAttempts: 0,
      lockedUntil: record.lockedUntil,
    };
  }

  // หากพ้นช่วงล็อคแล้ว ให้รีเซ็ต
  if (record.lockedUntil > 0 && record.lockedUntil <= now) {
    attemptMap.delete(key);
    return { isAllowed: true, remainingAttempts: MAX_FAILED_ATTEMPTS };
  }

  const remaining = Math.max(0, MAX_FAILED_ATTEMPTS - record.count);
  return {
    isAllowed: remaining > 0,
    remainingAttempts: remaining,
  };
}

export function recordFailedLoginAttempt(key: string): {
  isLocked: boolean;
  lockedUntil?: number;
} {
  const now = Date.now();
  const record = attemptMap.get(key) ?? { count: 0, lockedUntil: 0 };
  record.count += 1;

  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    attemptMap.set(key, record);
    return { isLocked: true, lockedUntil: record.lockedUntil };
  }

  attemptMap.set(key, record);
  return { isLocked: false };
}

export function resetLoginAttempts(key: string): void {
  attemptMap.delete(key);
}

export const resetLoginRateLimit = resetLoginAttempts;
