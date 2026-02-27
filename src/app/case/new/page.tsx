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
  parseMDFText,
  parseTradeLicenseText,
} from "@/lib/ocr-engine";
import { saveOCRData } from "@/lib/storage";

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

      // Background OCR for MDF and Trade License
      if (itemId === "mdf") {
        rawFiles.forEach(async (file) => {
          if (
            file.type.startsWith("image/") ||
            file.type === "application/pdf"
          ) {
            try {
              const text = await extractTextFromFile(file);
              if (text) {
                const parsed = parseMDFText(text);
                saveOCRData(caseIdRef.current, parsed);
              }
            } catch {
              // Silent fail — OCR is best-effort
            }
          }
        });
      }

      if (itemId === "trade-license") {
        rawFiles.forEach(async (file) => {
          if (
            file.type.startsWith("image/") ||
            file.type === "application/pdf"
          ) {
            try {
              const text = await extractTextFromFile(file);
              if (text) {
                const parsed = parseTradeLicenseText(text);
                saveOCRData(caseIdRef.current, parsed);
              }
            } catch {
              // Silent fail
            }
          }
        });
      }
    },
    []
  );

  const handleShareholderRawFiles = useCallback(
    (key: string, rawFiles: File[]) => {
      const existing = fileStoreRef.current.get(key) || [];
      fileStoreRef.current.set(key, [...existing, ...rawFiles]);
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

      // Also remove from raw file store (by index approximation)
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
    setConditionals((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <div className="pb-12">
      <WizardShell currentStep={step}>
        {step === 0 && (
          <StepMerchant
            merchantInfo={merchantInfo}
            onUpdate={handleMerchantUpdate}
            onNext={() => setStep(1)}
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
            onShareholdersUpdate={setShareholders}
            onShareholderRawFiles={handleShareholderRawFiles}
            onPrev={() => setStep(0)}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepReview
            merchantInfo={merchantInfo}
            items={checklist}
            conditionals={conditionals}
            fileStore={fileStoreRef.current}
            shareholders={shareholders}
            onPrev={() => setStep(1)}
          />
        )}
      </WizardShell>
    </div>
  );
}
