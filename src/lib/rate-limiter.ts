/**
 * Server-side rate limiter for Gemini API calls.
 * Per-user sliding-window counter — each user gets their own quota.
 * With 100+ concurrent sales users, a global limiter would bottleneck everyone.
 */

const PER_USER_RPM = parseInt(process.env.GEMINI_RPM_LIMIT || "100", 10);
const GLOBAL_RPM = parseInt(process.env.GEMINI_GLOBAL_RPM_LIMIT || "1500", 10);
const WINDOW_MS = 60_000;

// Per-user sliding windows
const userWindows = new Map<string, number[]>();
// Global sliding window (safety net for total API usage)
const globalWindow: number[] = [];

// Cleanup stale user windows every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of userWindows) {
    while (timestamps.length > 0 && timestamps[0] <= now - WINDOW_MS) {
      timestamps.shift();
    }
    if (timestamps.length === 0) userWindows.delete(userId);
  }
}, 5 * 60_000);

function purgeWindow(timestamps: number[]): void {
  const now = Date.now();
  while (timestamps.length > 0 && timestamps[0] <= now - WINDOW_MS) {
    timestamps.shift();
  }
}

/** Returns `true` if the request is allowed, `false` if rate-limited. */
export function checkRateLimit(userId?: string): boolean {
  const now = Date.now();

  // Global check
  purgeWindow(globalWindow);
  if (globalWindow.length >= GLOBAL_RPM) return false;

  // Per-user check
  if (userId) {
    if (!userWindows.has(userId)) userWindows.set(userId, []);
    const userTs = userWindows.get(userId)!;
    purgeWindow(userTs);
    if (userTs.length >= PER_USER_RPM) return false;
    userTs.push(now);
  }

  globalWindow.push(now);
  return true;
}

/** How many requests remain for this user in the current window. */
export function remainingRequests(userId?: string): number {
  if (!userId) {
    purgeWindow(globalWindow);
    return Math.max(0, GLOBAL_RPM - globalWindow.length);
  }
  const userTs = userWindows.get(userId) || [];
  purgeWindow(userTs);
  return Math.max(0, PER_USER_RPM - userTs.length);
}
