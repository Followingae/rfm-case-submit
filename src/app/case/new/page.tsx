"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { StepMerchant } from "@/components/wizard/step-merchant";
import { StepDocuments } from "@/components/wizard/step-documents";
import { StepReview } from "@/components/wizard/step-review";
import {
  MerchantInfo,
  ChecklistItem,
  ShareholderKYC,
  UploadedFile,
} from "@/lib/types";
import { getChecklistForCase } from "@/lib/checklist-config";
import {
  extractTextFromFile,
  getLastConfidence,
  parseMDFText,
  parseTradeLicenseText,
} from "@/lib/ocr-engine";
import {
  createCase,
  updateCaseStatus,
  updateCaseConditionals,
  saveMDFData,
  saveTradeLicenseData,
  saveDocumentRecord,
  uploadFile,
  saveShareholders,
  saveShareholderDocument,
} from "@/lib/storage";

export default function NewCasePage() {
  const [step, setStep] = useState(0);
  const caseIdRef = useRef(uuid());

  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo>({
    legalName: "",
    dba: "",
    caseType: "low-risk",
  });

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [conditionals, setConditionals] = useState<Record<string, boolean>>({});
  const [shareholders, setShareholders] = useState<ShareholderKYC[]>([]);
  const fileStoreRef = useRef<Map<string, File[]>>(new Map());

  // Track which file paths are stored in Supabase (for the review step rename preview)
  const uploadedPathsRef = useRef<Map<string, string[]>>(new Map());

  const buildChecklist = useCallback(
    (info: MerchantInfo) => {
      const templates = getChecklistForCase(info.caseType, info.branchMode);
      setChecklist(
        templates.map((t) => ({
          id: t.id,
          label: t.label,
          category: t.category,
          required: t.required,
          conditionalKey: t.conditionalKey,
          conditionalLabel: t.conditionalLabel,
          multiFile: t.multiFile,
          notes: t.notes,
          sectionHeader: t.sectionHeader,
          files: [],
          status: "missing" as const,
        }))
      );
      fileStoreRef.current = new Map();
      uploadedPathsRef.current = new Map();
      setConditionals({});
      setShareholders([]);
    },
    []
  );

  const handleMerchantUpdate = useCallback(
    (updates: Partial<MerchantInfo>) => {
      setMerchantInfo((prev) => {
        const next = { ...prev, ...updates };
        if (
          updates.caseType !== undefined &&
          updates.caseType !== prev.caseType
        ) {
          buildChecklist(next);
        }
        if (
          updates.branchMode !== undefined &&
          updates.branchMode !== prev.branchMode
        ) {
          buildChecklist(next);
        }
        return next;
      });
    },
    [buildChecklist]
  );

  useEffect(() => {
    buildChecklist(merchantInfo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Create case in Supabase when moving to step 1
  const handleNextToDocuments = useCallback(async () => {
    await createCase(caseIdRef.current, merchantInfo);
    setStep(1);
  }, [merchantInfo]);

  const handleItemUpdate = useCallback(
    (itemId: string, newFiles: UploadedFile[]) => {
      setChecklist((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const merged = [...item.files, ...newFiles];
          return { ...item, files: merged, status: "uploaded" as const };
        })
      );
    },
    []
  );

  const handleRawFilesAdded = useCallback(
    (itemId: string, rawFiles: File[]) => {
      const existing = fileStoreRef.current.get(itemId) || [];
      fileStoreRef.current.set(itemId, [...existing, ...rawFiles]);

      // Upload each file to Supabase Storage + save record
      const caseId = caseIdRef.current;
      rawFiles.forEach(async (file) => {
        const itemData = document.querySelector(`[data-item-id="${itemId}"]`);
        const label = itemData?.getAttribute("data-label") || itemId;
        const category = itemData?.getAttribute("data-category") || "Other";

        const path = await uploadFile(caseId, itemId, file);
        if (path) {
          // Track uploaded path
          const paths = uploadedPathsRef.current.get(itemId) || [];
          paths.push(path);
          uploadedPathsRef.current.set(itemId, paths);

          await saveDocumentRecord(
            caseId,
            itemId,
            label,
            category,
            file.name,
            path,
            file.size,
            file.type
          );
        }

        // Background OCR for MDF → structured data across 5 tables
        if (itemId === "mdf") {
          if (
            file.type.startsWith("image/") ||
            file.type === "application/pdf"
          ) {
            try {
              const text = await extractTextFromFile(file);
              const confidence = getLastConfidence();
              if (text) {
                const parsed = parseMDFText(text);
                await saveMDFData(caseId, parsed, confidence);
              }
            } catch {
              // Silent fail — OCR is best-effort
            }
          }
        }

        // Background OCR for Trade License → structured table
        if (itemId === "trade-license") {
          if (
            file.type.startsWith("image/") ||
            file.type === "application/pdf"
          ) {
            try {
              const text = await extractTextFromFile(file);
              const confidence = getLastConfidence();
              if (text) {
                const parsed = parseTradeLicenseText(text);
                await saveTradeLicenseData(caseId, parsed, confidence);
              }
            } catch {
              // Silent fail
            }
          }
        }
      });
    },
    []
  );

  const handleShareholderRawFiles = useCallback(
    (key: string, rawFiles: File[]) => {
      const existing = fileStoreRef.current.get(key) || [];
      fileStoreRef.current.set(key, [...existing, ...rawFiles]);

      // Upload to Supabase Storage
      const caseId = caseIdRef.current;
      // key format: kyc-{shareholderId}-{passportFiles|eidFiles}
      const parts = key.split("-");
      const shareholderId = parts[1];
      const docTypeRaw = parts.slice(2).join("-"); // passportFiles or eidFiles
      const docType = docTypeRaw === "passportFiles" ? "passport" : "eid";

      rawFiles.forEach(async (file) => {
        const path = await uploadFile(caseId, `kyc/${shareholderId}`, file);
        if (path) {
          const paths = uploadedPathsRef.current.get(key) || [];
          paths.push(path);
          uploadedPathsRef.current.set(key, paths);

          await saveShareholderDocument(
            shareholderId,
            docType as "passport" | "eid",
            file.name,
            path,
            file.size,
            file.type
          );
        }
      });
    },
    []
  );

  const handleShareholdersUpdate = useCallback(
    (newShareholders: ShareholderKYC[]) => {
      setShareholders(newShareholders);
      // Save to Supabase (debounced implicitly — each call replaces)
      saveShareholders(caseIdRef.current, newShareholders);
    },
    []
  );

  const handleFileRemove = useCallback(
    (itemId: string, fileId: string) => {
      setChecklist((prev) =>
        prev.map((item) => {
          if (item.id !== itemId) return item;
          const filtered = item.files.filter((f) => f.id !== fileId);
          return {
            ...item,
            files: filtered,
            status: filtered.length > 0 ? ("uploaded" as const) : ("missing" as const),
          };
        })
      );

      // Also remove from raw file store
      const existing = fileStoreRef.current.get(itemId) || [];
      const itemFiles = checklist.find((i) => i.id === itemId)?.files || [];
      const fileIndex = itemFiles.findIndex((f) => f.id === fileId);
      if (fileIndex >= 0 && fileIndex < existing.length) {
        existing.splice(fileIndex, 1);
        fileStoreRef.current.set(itemId, existing);
      }
    },
    [checklist]
  );

  const handleConditionalToggle = useCallback((key: string) => {
    setConditionals((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      updateCaseConditionals(caseIdRef.current, next);
      return next;
    });
  }, []);

  // When moving to review, update case status
  const handleNextToReview = useCallback(async () => {
    await updateCaseStatus(caseIdRef.current, "complete");
    setStep(2);
  }, []);

  return (
    <div className="pb-12">
      <WizardShell currentStep={step}>
        {step === 0 && (
          <StepMerchant
            merchantInfo={merchantInfo}
            onUpdate={handleMerchantUpdate}
            onNext={handleNextToDocuments}
          />
        )}
        {step === 1 && (
          <StepDocuments
            merchantInfo={merchantInfo}
            items={checklist}
            onItemUpdate={handleItemUpdate}
            onFileRemove={handleFileRemove}
            conditionals={conditionals}
            onConditionalToggle={handleConditionalToggle}
            onRawFilesAdded={handleRawFilesAdded}
            shareholders={shareholders}
            onShareholdersUpdate={handleShareholdersUpdate}
            onShareholderRawFiles={handleShareholderRawFiles}
            onPrev={() => setStep(0)}
            onNext={handleNextToReview}
          />
        )}
        {step === 2 && (
          <StepReview
            merchantInfo={merchantInfo}
            items={checklist}
            conditionals={conditionals}
            fileStore={fileStoreRef.current}
            shareholders={shareholders}
            caseId={caseIdRef.current}
            onPrev={() => setStep(1)}
          />
        )}
      </WizardShell>
    </div>
  );
}
