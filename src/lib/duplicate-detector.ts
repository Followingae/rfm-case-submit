export interface DuplicateWarning {
  fileName: string;
  fileSize: number;
  slots: string[];
}

export function detectDuplicates(
  fileStore: Map<string, File[]>
): DuplicateWarning[] {
  // Map of "name::size" → list of slot IDs
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
