import type { EnhancedDuplicateWarning } from "./types";

// Legacy interface for backward compatibility
export interface DuplicateWarning {
  fileName: string;
  fileSize: number;
  slots: string[];
}

// ── SHA-256 file hash ──

async function hashFile(file: File): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return "";
  }
}

// ── Layer A: Exact hash-based duplicates ──

async function detectExactDuplicates(
  fileStore: Map<string, File[]>
): Promise<EnhancedDuplicateWarning[]> {
  const hashMap = new Map<string, { fileName: string; fileSize: number; slots: string[] }>();
  const warnings: EnhancedDuplicateWarning[] = [];

  for (const [slotId, files] of fileStore) {
    for (const file of files) {
      const hash = await hashFile(file);
      if (!hash) continue;

      const existing = hashMap.get(hash);
      if (existing) {
        if (!existing.slots.includes(slotId)) {
          existing.slots.push(slotId);
        }
      } else {
        hashMap.set(hash, { fileName: file.name, fileSize: file.size, slots: [slotId] });
      }
    }
  }

  for (const entry of hashMap.values()) {
    if (entry.slots.length > 1) {
      warnings.push({
        type: "exact",
        fileName: entry.fileName,
        fileSize: entry.fileSize,
        slots: entry.slots,
        detail: `Identical file content (SHA-256 match)`,
      });
    }
  }

  return warnings;
}

// ── Layer B: Identity-based duplicates (same passport/TL/EID number) ──

export function detectIdentityDuplicates(
  extractedIds: Map<string, { type: string; id: string; slotId: string }>
): EnhancedDuplicateWarning[] {
  const idMap = new Map<string, { fileName: string; slots: string[]; type: string }>();
  const warnings: EnhancedDuplicateWarning[] = [];

  for (const [fileName, data] of extractedIds) {
    const key = `${data.type}::${data.id}`;
    const existing = idMap.get(key);
    if (existing) {
      if (!existing.slots.includes(data.slotId)) {
        existing.slots.push(data.slotId);
      }
    } else {
      idMap.set(key, { fileName, slots: [data.slotId], type: data.type });
    }
  }

  for (const [key, entry] of idMap) {
    if (entry.slots.length > 1) {
      const idValue = key.split("::")[1];
      warnings.push({
        type: "identity-match",
        fileName: entry.fileName,
        slots: entry.slots,
        detail: `Same ${entry.type} number "${idValue}" found in multiple slots`,
      });
    }
  }

  return warnings;
}

// ── Layer C: Name + size duplicates (legacy) ──

export function detectDuplicates(
  fileStore: Map<string, File[]>
): DuplicateWarning[] {
  const seen = new Map<string, { fileName: string; fileSize: number; slots: string[] }>();

  for (const [slotId, files] of fileStore) {
    for (const file of files) {
      const key = `${file.name}::${file.size}`;
      const existing = seen.get(key);
      if (existing) {
        if (!existing.slots.includes(slotId)) {
          existing.slots.push(slotId);
        }
      } else {
        seen.set(key, { fileName: file.name, fileSize: file.size, slots: [slotId] });
      }
    }
  }

  return Array.from(seen.values()).filter((entry) => entry.slots.length > 1);
}

// ── Combined enhanced detection ──

export async function detectEnhancedDuplicates(
  fileStore: Map<string, File[]>,
  extractedIds?: Map<string, { type: string; id: string; slotId: string }>
): Promise<EnhancedDuplicateWarning[]> {
  const warnings: EnhancedDuplicateWarning[] = [];

  // Layer A: Hash-based
  const hashDupes = await detectExactDuplicates(fileStore);
  warnings.push(...hashDupes);

  // Layer B: Identity-based (if available)
  if (extractedIds && extractedIds.size > 0) {
    const idDupes = detectIdentityDuplicates(extractedIds);
    warnings.push(...idDupes);
  }

  // Layer C: Name+size (only add if not already caught by hash)
  const nameDupes = detectDuplicates(fileStore);
  for (const nd of nameDupes) {
    const alreadyCaught = warnings.some(
      (w) => w.fileName === nd.fileName && w.type === "exact"
    );
    if (!alreadyCaught) {
      warnings.push({
        type: "near-duplicate",
        fileName: nd.fileName,
        fileSize: nd.fileSize,
        slots: nd.slots,
        detail: `Same filename and size in multiple slots`,
      });
    }
  }

  return warnings;
}
