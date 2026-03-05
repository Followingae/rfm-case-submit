import type { CaseException } from "@/lib/types";

// ── Constants ──
const STORAGE_KEY = "rfm_exceptions";

// ── In-memory cache keyed by caseId ──
const cache: Map<string, CaseException[]> = new Map();

// ── Hydrate cache from localStorage on module load ──
function hydrate(): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed: Record<string, CaseException[]> = JSON.parse(raw);

    for (const [caseId, exceptions] of Object.entries(parsed)) {
      cache.set(
        caseId,
        exceptions.map((e) => ({
          ...e,
          createdAt: new Date(e.createdAt),
        })),
      );
    }
  } catch {
    // Corrupted data – start fresh
    cache.clear();
  }
}

// ── Persist cache to localStorage ──
function persist(): void {
  try {
    const obj: Record<string, CaseException[]> = {};
    for (const [caseId, exceptions] of cache.entries()) {
      obj[caseId] = exceptions.map((e) => ({
        ...e,
        createdAt: e.createdAt, // Date.toJSON() produces ISO string
      }));
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // localStorage full or unavailable – silent fail for Phase 1
  }
}

// ── Public API ──

export function addException(
  exception: Omit<CaseException, "id" | "createdAt">,
): CaseException {
  const newException: CaseException = {
    ...exception,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  const list = cache.get(exception.caseId) ?? [];
  list.push(newException);
  cache.set(exception.caseId, list);

  persist();
  return newException;
}

export function getExceptions(caseId: string): CaseException[] {
  return cache.get(caseId) ?? [];
}

export function getExceptionsForItem(
  caseId: string,
  itemId: string,
): CaseException[] {
  return getExceptions(caseId).filter((e) => e.itemId === itemId);
}

export function removeException(exceptionId: string): void {
  for (const [caseId, exceptions] of cache.entries()) {
    const idx = exceptions.findIndex((e) => e.id === exceptionId);
    if (idx !== -1) {
      exceptions.splice(idx, 1);
      if (exceptions.length === 0) {
        cache.delete(caseId);
      }
      persist();
      return;
    }
  }
}

export function clearExceptions(caseId: string): void {
  cache.delete(caseId);
  persist();
}

// ── Run hydration on module load ──
hydrate();
