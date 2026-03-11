/**
 * Server-side rate limiter for Gemini API calls.
 * Uses a sliding-window counter per minute.
 */

const MAX_RPM = parseInt(process.env.GEMINI_RPM_LIMIT || "15", 10);
const WINDOW_MS = 60_000;

const timestamps: number[] = [];

/** Returns `true` if the request is allowed, `false` if rate-limited. */
export function checkRateLimit(): boolean {
  const now = Date.now();

  // Purge timestamps older than 1 minute
  while (timestamps.length > 0 && timestamps[0] <= now - WINDOW_MS) {
    timestamps.shift();
  }

  if (timestamps.length >= MAX_RPM) return false;

  timestamps.push(now);
  return true;
}

/** How many requests remain in the current window. */
export function remainingRequests(): number {
  const now = Date.now();
  while (timestamps.length > 0 && timestamps[0] <= now - WINDOW_MS) {
    timestamps.shift();
  }
  return Math.max(0, MAX_RPM - timestamps.length);
}
