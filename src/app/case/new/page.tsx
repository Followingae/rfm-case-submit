"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { v4 as uuid } from "uuid";
import { toast } from "sonner";
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
import {
  validateMDFFields,
  MDFValidationResult,
} from "@/lib/mdf-validation";
import { detectDocumentType, DocTypeDetectionResult } from "@/lib/doc-type-detector";
import { detectDuplicates, DuplicateWarning } from "@/lib/duplicate-detector";

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

  // Validation state
  const [mdfValidation, setMdfValidation] = useState<MDFValidationResult | null>(null);
  const [docTypeWarnings, setDocTypeWarnings] = useState<Map<string, DocTypeDetectionResult>>(new Map());
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([]);

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
      setMdfValidation(null);
      setDocTypeWarnings(new Map());
      setDuplicateWarnings([]);
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

  // Run duplicate detection after any file change
  const runDuplicateCheck = useCallback(() => {
    const dupes = detectDuplicates(fileStoreRef.current);
    setDuplicateWarnings(dupes);
    dupes.forEach((d) => {
      toast.warning(`"${d.fileName}" uploaded in multiple slots`, {
        description: `Found in ${d.slots.length} locations`,
      });
    });
  }, []);

  // Run doc type detection on a file
  const runDocTypeDetection = useCallback(
    async (itemId: string, file: File) => {
      if (
        !file.type.startsWith("image/") &&
        file.type !== "application/pdf"
      ) return;

      try {
        const text = await extractTextFromFile(file);
        if (!text || text.trim().length < 30) return;

        const result = detectDocumentType(text, itemId);
        if (result.suggestion) {
          setDocTypeWarnings((prev) => {
            const next = new Map(prev);
            next.set(itemId, result);
            return next;
          });
          toast.warning(result.suggestion, {
            description: "This file may be in the wrong slot",
          });
        }
      } catch {
        // Silent fail
      }
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

        // Background OCR for MDF → structured data + validation
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

                // MDF field validation
                const validation = validateMDFFields(parsed);
                setMdfValidation(validation);
                toast.info(
                  `MDF scanned: ${validation.totalPresent} of ${validation.totalChecked} fields detected`,
                  {
                    description: validation.isAcceptable
                      ? "Key fields look good"
                      : "Some critical fields may be missing",
                  }
                );

                // Auto-fill merchant name/DBA if empty
                setMerchantInfo((prev) => {
                  const updates: Partial<MerchantInfo> = {};
                  if (!prev.legalName.trim() && parsed.merchantLegalName?.trim()) {
                    updates.legalName = parsed.merchantLegalName.trim();
                  }
                  if (!prev.dba.trim() && parsed.dba?.trim()) {
                    updates.dba = parsed.dba.trim();
                  }
                  if (Object.keys(updates).length > 0) {
                    toast.success("Auto-filled merchant info from MDF");
                    return { ...prev, ...updates };
                  }
                  return prev;
                });
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
                toast.info("Trade License scanned successfully");
              }
            } catch {
              // Silent fail
            }
          }
        }

        // Doc type detection for non-MDF/TL files (MDF/TL already get OCR'd)
        if (itemId !== "mdf" && itemId !== "trade-license") {
          runDocTypeDetection(itemId, file);
        }
      });

      // Run duplicate check after adding files
      setTimeout(() => runDuplicateCheck(), 100);
    },
    [runDuplicateCheck, runDocTypeDetection]
  );

  const handleShareholderRawFiles = useCallback(
    (key: string, rawFiles: File[]) => {
      const existing = fileStoreRef.current.get(key) || [];
      fileStoreRef.current.set(key, [...existing, ...rawFiles]);

      // Upload to Supabase Storage
      const caseId = caseIdRef.current;
      const parts = key.split("::");
      const shareholderId = parts[1];
      const docTypeRaw = parts[2];
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

      // Run duplicate check
      setTimeout(() => runDuplicateCheck(), 100);
    },
    [runDuplicateCheck]
  );

  const handleShareholdersUpdate = useCallback(
    (newShareholders: ShareholderKYC[]) => {
      setShareholders(newShareholders);
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

      // Clear doc type warning for this slot if no files remain
      setDocTypeWarnings((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });

      // Re-check duplicates
      setTimeout(() => runDuplicateCheck(), 100);
    },
    [checklist, runDuplicateCheck]
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
            mdfValidation={mdfValidation}
            docTypeWarnings={docTypeWarnings}
            duplicateWarnings={duplicateWarnings}
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
            mdfValidation={mdfValidation}
            onPrev={() => setStep(1)}
          />
        )}
      </WizardShell>
    </div>
  );
}
