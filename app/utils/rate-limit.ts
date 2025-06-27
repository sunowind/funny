export interface Attempts {
  [ip: string]: { count: number; last: number };
}

/**
 * 判断是否应限流
 */
export function shouldRateLimit(
  attempts: Attempts,
  ip: string,
  now: number,
  maxAttempts: number,
  windowMs: number
): boolean {
  if (!attempts[ip]) attempts[ip] = { count: 0, last: now };
  if (now - attempts[ip].last > windowMs) {
    attempts[ip] = { count: 0, last: now };
  }
  attempts[ip].count++;
  attempts[ip].last = now;
  return attempts[ip].count > maxAttempts;
} 