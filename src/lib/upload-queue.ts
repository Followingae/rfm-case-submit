"use client";

import { useCallback, useRef, useState } from "react";
import { v4 as uuid } from "uuid";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type QueueStatus =
  | "queued"
  | "uploading"
  | "rendering"
  | "analyzing"
  | "processing"
  | "complete"
  | "error";

export interface QueuedUpload {
  id: string;
  itemId: string; // checklist slot ID
  file: File;
  status: QueueStatus;
  message: string;
  error?: string;
  abortController: AbortController;
  addedAt: number;
}

export interface UploadQueueOptions {
  maxConcurrent?: number; // default 3
  maxApiCallsPerMinute?: number; // default 14 (leaves buffer under 15)
  onStatusChange?: (itemId: string, status: QueueStatus, message: string) => void;
  onComplete?: (itemId: string, file: File) => void;
  onError?: (itemId: string, file: File, error: string) => void;
}

export interface UploadQueueControls {
  enqueue: (itemId: string, files: File[]) => void;
  cancel: (itemId: string) => void;
  cancelAll: () => void;
  getStatus: (itemId: string) => QueuedUpload | undefined;
  updateStatus: (queueId: string, status: QueueStatus, message: string) => void;
  activeCount: number;
  queuedCount: number;
  isProcessing: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUploadQueue(
  options: UploadQueueOptions = {},
): UploadQueueControls {
  const {
    maxConcurrent = 3,
    maxApiCallsPerMinute = 14,
    onStatusChange,
    onComplete,
    onError,
  } = options;

  // Queue storage — kept in a ref so mutations don't trigger renders on their
  // own. We use `forceUpdate` selectively when external consumers need to
  // observe a change.
  const queueRef = useRef<QueuedUpload[]>([]);
  const activeRef = useRef<Set<string>>(new Set());
  const apiCallTimestamps = useRef<number[]>([]);
  const processingRef = useRef(false);

  // Trigger a re-render so derived values (activeCount, etc.) are fresh.
  const [, forceUpdate] = useState(0);

  // -----------------------------------------------------------------------
  // Rate-limit helpers (sliding window)
  // -----------------------------------------------------------------------

  const canMakeApiCall = useCallback((): boolean => {
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    apiCallTimestamps.current = apiCallTimestamps.current.filter(
      (t) => t > oneMinuteAgo,
    );
    return apiCallTimestamps.current.length < maxApiCallsPerMinute;
  }, [maxApiCallsPerMinute]);

  const recordApiCall = useCallback((): void => {
    apiCallTimestamps.current.push(Date.now());
  }, []);

  // -----------------------------------------------------------------------
  // Core scheduler — picks the next queued item and promotes it to active
  // -----------------------------------------------------------------------

  const processNext = useCallback((): void => {
    if (activeRef.current.size >= maxConcurrent) return;

    const next = queueRef.current.find(
      (q) => q.status === "queued" && !activeRef.current.has(q.id),
    );

    if (!next) {
      processingRef.current = false;
      return;
    }

    // Respect the per-minute rate limit before kicking off API-dependent work.
    if (!canMakeApiCall()) {
      setTimeout(() => processNext(), 2_000);
      return;
    }

    activeRef.current.add(next.id);
    next.status = "uploading";
    next.message = "Uploading...";
    onStatusChange?.(next.itemId, "uploading", "Uploading...");
    recordApiCall();
    forceUpdate((n) => n + 1);

    // Actual file processing (upload, AI analysis, etc.) is driven by the
    // consumer reacting to the onStatusChange callback. This hook only
    // manages ordering, concurrency, and status bookkeeping.
  }, [maxConcurrent, canMakeApiCall, recordApiCall, onStatusChange]);

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  const enqueue = useCallback(
    (itemId: string, files: File[]): void => {
      for (const file of files) {
        const entry: QueuedUpload = {
          id: uuid(),
          itemId,
          file,
          status: "queued",
          message: "Waiting...",
          abortController: new AbortController(),
          addedAt: Date.now(),
        };
        queueRef.current.push(entry);
        onStatusChange?.(itemId, "queued", "Waiting...");
      }

      processingRef.current = true;
      forceUpdate((n) => n + 1);
      processNext();
    },
    [onStatusChange, processNext],
  );

  const updateStatus = useCallback(
    (queueId: string, status: QueueStatus, message: string): void => {
      const entry = queueRef.current.find((q) => q.id === queueId);
      if (!entry) return;

      entry.status = status;
      entry.message = message;
      onStatusChange?.(entry.itemId, status, message);

      if (status === "complete" || status === "error") {
        activeRef.current.delete(queueId);

        if (status === "complete") {
          onComplete?.(entry.itemId, entry.file);
        }
        if (status === "error") {
          entry.error = message;
          onError?.(entry.itemId, entry.file, message);
        }

        // Kick the scheduler so the next queued item can start.
        setTimeout(() => processNext(), 50);
      }

      forceUpdate((n) => n + 1);
    },
    [onStatusChange, onComplete, onError, processNext],
  );

  const cancel = useCallback(
    (itemId: string): void => {
      const entries = queueRef.current.filter((q) => q.itemId === itemId);
      for (const entry of entries) {
        entry.abortController.abort();
        entry.status = "error";
        entry.message = "Cancelled";
        activeRef.current.delete(entry.id);
      }

      queueRef.current = queueRef.current.filter(
        (q) => q.itemId !== itemId,
      );
      forceUpdate((n) => n + 1);
      processNext();
    },
    [processNext],
  );

  const cancelAll = useCallback((): void => {
    for (const entry of queueRef.current) {
      entry.abortController.abort();
    }
    queueRef.current = [];
    activeRef.current.clear();
    processingRef.current = false;
    forceUpdate((n) => n + 1);
  }, []);

  const getStatus = useCallback(
    (itemId: string): QueuedUpload | undefined => {
      return queueRef.current.find((q) => q.itemId === itemId);
    },
    [],
  );

  // -----------------------------------------------------------------------
  // Derived state exposed to consumers
  // -----------------------------------------------------------------------

  return {
    enqueue,
    cancel,
    cancelAll,
    getStatus,
    updateStatus,
    activeCount: activeRef.current.size,
    queuedCount: queueRef.current.filter((q) => q.status === "queued").length,
    isProcessing: processingRef.current,
  };
}
