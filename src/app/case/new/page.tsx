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
  ReadinessResult,
  CaseException,
  ConsistencyWarning,
  TemplateMatchResult,
  ExtractedField,
  SubmissionDetails,
  UploadProgress,
} from "@/lib/types";
import { getChecklistForCase } from "@/lib/checklist-config";
import {
  extractTextFromFile,
  getLastConfidence,
  parseMDFText,
  parseTradeLicenseText,
  parsePassportText,
  parseEIDText,
  parseMOAText,
  parseBankStatementText,
  parseVATCertText,
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
  savePassportData,
  saveEIDData,
  saveBankStatementData,
  saveVATCertData,
  saveMOAData,
} from "@/lib/storage";
import {
  validateMDFFields,
  MDFValidationResult,
} from "@/lib/mdf-validation";
import { detectDocumentType, DocTypeDetectionResult } from "@/lib/doc-type-detector";
import { validateSlotUpload, UploadValidation } from "@/lib/upload-validator";
import { detectDuplicates, DuplicateWarning } from "@/lib/duplicate-detector";
import { computeReadiness } from "@/lib/readiness-engine";
import { checkConsistency } from "@/lib/consistency-checker";
import { getExceptions } from "@/lib/exception-store";
import { matchTemplate } from "@/lib/template-registry";
import { mdfToExtractedFields, tradeLicenseToExtractedFields, type LabeledField } from "@/lib/field-adapter";
import type { ParsedTradeLicense, ParsedMDF } from "@/lib/ocr-engine";
import { detectMDFMergePlan, type MergePlan } from "@/lib/pdf-merger";
import { extractMDFFormFields } from "@/lib/mdf-form-reader";

export default function NewCasePage() {
  const [step, setStep] = useState(0);
  const caseIdRef = useRef(uuid());

  const [merchantInfo, setMerchantInfo] = useState<MerchantInfo>({
    legalName: "",
    dba: "",
    caseType: "low-risk",
    existingMid: "",
  });

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [conditionals, setConditionals] = useState<Record<string, boolean>>({});
  const [shareholders, setShareholders] = useState<ShareholderKYC[]>([]);
  const fileStoreRef = useRef<Map<string, File[]>>(new Map());

  // Track uploaded Supabase paths
  const uploadedPathsRef = useRef<Map<string, string[]>>(new Map());

  // Validation state
  const [mdfValidation, setMdfValidation] = useState<MDFValidationResult | null>(null);
  const [docTypeWarnings, setDocTypeWarnings] = useState<Map<string, DocTypeDetectionResult>>(new Map());
  const [duplicateWarnings, setDuplicateWarnings] = useState<DuplicateWarning[]>([]);

  // New intelligence state
  const [tradeLicenseData, setTradeLicenseData] = useState<ParsedTradeLicense | null>(null);
  const [consistencyWarnings, setConsistencyWarnings] = useState<ConsistencyWarning[]>([]);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [exceptions, setExceptions] = useState<CaseException[]>([]);
  const [classificationInProgress, setClassificationInProgress] = useState<string | null>(null);
  const [uploadValidations, setUploadValidations] = useState<Map<string, UploadValidation>>(new Map());
  const [templateWarnings, setTemplateWarnings] = useState<Map<string, TemplateMatchResult>>(new Map());
  const [extractedFields, setExtractedFields] = useState<Map<string, LabeledField[]>>(new Map());

  // Submission email table
  const [submissionDetails, setSubmissionDetails] = useState<SubmissionDetails>({
    requestDate: new Date().toLocaleDateString("en-GB"),
    groupName: "",
    existingOrNew: "New",
    existingRateRent: "",
    existingMidMerchantName: "",
    currentAcquirer: "",
    mcc: "",
    noOfLocations: "",
    merchantLocation: "",
    mobileNumber: "",
    contactPersonName: "",
    emailAddress: "",
    natureOfBusiness: "",
    avgTransactionSize: "",
    expectedMonthlySpend: "",
    websiteUrl: "",
    rentalFee: "",
    mso: "",
    noOfTerminalsAndType: "",
    proposedRateStandard: "",
    proposedRatePremium: "",
    proposedRateInternational: "",
    proposedRateDCC: "",
  });

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState<Map<string, UploadProgress>>(new Map());
  const abortControllersRef = useRef<Map<string, AbortController>>(new Map());

  // MDF merge state
  const [mdfMergePlan, setMdfMergePlan] = useState<MergePlan | null>(null);
  const [skipMdfMerge, setSkipMdfMerge] = useState(false);

  // Parsed MDF data ref for consistency checks
  const parsedMDFRef = useRef<ReturnType<typeof parseMDFText> | null>(null);

  const setSlotProgress = useCallback((itemId: string, progress: UploadProgress | null) => {
    setUploadProgress(prev => {
      const next = new Map(prev);
      if (progress) next.set(itemId, progress);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const handleCancelUpload = useCallback((itemId: string) => {
    abortControllersRef.current.get(itemId)?.abort();
    abortControllersRef.current.delete(itemId);
    setSlotProgress(itemId, null);
    // Revert slot to missing
    setChecklist(prev => prev.map(item =>
      item.id === itemId ? { ...item, files: [], status: "missing" } : item
    ));
    fileStoreRef.current.set(itemId, []);
    uploadedPathsRef.current.delete(itemId);
    toast.info("Upload cancelled");
  }, [setSlotProgress]);

  // Merge parsed MDF data — keep best values from both main form and stamp pages
  const mergeParsedMDF = useCallback(
    (existing: ParsedMDF | null, incoming: ParsedMDF): ParsedMDF => {
      if (!existing) return incoming;
      const result: ParsedMDF = { ...existing };
      for (const key of Object.keys(incoming)) {
        const k = key as keyof ParsedMDF;
        const newVal = incoming[k];
        const existVal = existing[k];
        if (typeof newVal === "string" && newVal.trim()) {
          if (!existVal || (typeof existVal === "string" && newVal.length > existVal.length)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (result as any)[k] = newVal;
          }
        }
        if (Array.isArray(newVal) && newVal.length > 0) {
          if (!Array.isArray(existVal) || newVal.length > existVal.length) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (result as any)[k] = newVal;
          }
        }
      }
      return result;
    },
    []
  );

  // Detect MDF merge plan when MDF slot files change
  const runMdfMergeDetection = useCallback(async () => {
    const mdfFiles = fileStoreRef.current.get("mdf") || [];
    if (mdfFiles.length === 2) {
      try {
        const plan = await detectMDFMergePlan(mdfFiles);
        setMdfMergePlan(plan);
        setSkipMdfMerge(false);
      } catch {
        setMdfMergePlan(null);
      }
    } else {
      setMdfMergePlan(null);
    }
  }, []);

  const buildChecklist = useCallback(
    (info: MerchantInfo) => {
      const templates = getChecklistForCase(info.caseType);
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
      setTradeLicenseData(null);
      setConsistencyWarnings([]);
      setReadiness(null);
      setExceptions([]);
      setTemplateWarnings(new Map());
      setExtractedFields(new Map());
      setUploadValidations(new Map());
      parsedMDFRef.current = null;
    },
    []
  );

  const handleMerchantUpdate = useCallback(
    (updates: Partial<MerchantInfo>) => {
      setMerchantInfo((prev) => {
        const next = { ...prev, ...updates };
        if (updates.caseType !== undefined && updates.caseType !== prev.caseType) {
          buildChecklist(next);
        }
        return next;
      });
    },
    [buildChecklist]
  );

  useEffect(() => {
    buildChecklist(merchantInfo);
    // Load any existing exceptions for this case
    setExceptions(getExceptions(caseIdRef.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute readiness whenever relevant state changes
  const recomputeReadiness = useCallback(() => {
    setChecklist((currentChecklist) => {
      const result = computeReadiness(
        currentChecklist,
        conditionals,
        shareholders,
        mdfValidation,
        tradeLicenseData,
        docTypeWarnings,
        exceptions,
        uploadValidations
      );
      setReadiness(result);
      return currentChecklist;
    });
  }, [conditionals, shareholders, mdfValidation, tradeLicenseData, docTypeWarnings, exceptions, uploadValidations]);

  // Run consistency checks
  const runConsistencyChecks = useCallback(() => {
    const warnings = checkConsistency(
      parsedMDFRef.current || null,
      tradeLicenseData,
      merchantInfo,
      shareholders
    );
    setConsistencyWarnings(warnings);
  }, [tradeLicenseData, merchantInfo, shareholders]);

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

  const runDuplicateCheck = useCallback(() => {
    const dupes = detectDuplicates(fileStoreRef.current);
    setDuplicateWarnings(dupes);
  }, []);

  const runDocTypeDetection = useCallback(
    async (itemId: string, file: File) => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") return;
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
        }
      } catch {
        // Silent fail
      }
    },
    []
  );

  // Run upload slot validation
  const runUploadValidation = useCallback(
    async (itemId: string, file: File) => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") return;
      try {
        const text = await extractTextFromFile(file);
        if (!text || text.trim().length < 30) return;
        const currentItems = checklist.map((i) => ({ id: i.id, label: i.label, status: i.status }));
        const result = await validateSlotUpload(text, itemId, currentItems);
        setUploadValidations((prev) => {
          const next = new Map(prev);
          next.set(itemId, result);
          return next;
        });
        // Only toast for mismatch/unknown — pass/warn are inline only
        if (result.status === "mismatch" || result.status === "unknown") {
          toast.warning(
            result.status === "mismatch"
              ? `Possible wrong document in ${checklist.find((i) => i.id === itemId)?.label || itemId}`
              : "Document couldn't be identified",
            { description: result.message.replace(/\*\*/g, "") }
          );
        }
      } catch {
        // Silent fail
      }
    },
    [checklist]
  );

  const handleRawFilesAdded = useCallback(
    (itemId: string, rawFiles: File[]) => {
      const existing = fileStoreRef.current.get(itemId) || [];
      fileStoreRef.current.set(itemId, [...existing, ...rawFiles]);

      const caseId = caseIdRef.current;
      rawFiles.forEach(async (file) => {
        const controller = new AbortController();
        abortControllersRef.current.set(itemId, controller);
        const signal = controller.signal;

        const itemData = document.querySelector(`[data-item-id="${itemId}"]`);
        const label = itemData?.getAttribute("data-label") || itemId;
        const category = itemData?.getAttribute("data-category") || "Other";

        // Phase 1: Upload
        setSlotProgress(itemId, { phase: "uploading", message: "Uploading..." });
        const path = await uploadFile(caseId, itemId, file);
        if (signal.aborted) return;
        if (path) {
          const paths = uploadedPathsRef.current.get(itemId) || [];
          paths.push(path);
          uploadedPathsRef.current.set(itemId, paths);

          await saveDocumentRecord(caseId, itemId, label, category, file.name, path, file.size, file.type);
          if (signal.aborted) return;
        }

        // OCR extraction based on slot type
        if (file.type.startsWith("image/") || file.type === "application/pdf") {
          try {
            // Phase 2: Scan (OCR)
            setSlotProgress(itemId, { phase: "scanning", message: "Scanning document..." });

            // ── MDF ──
            if (itemId === "mdf") {
              // Try AcroForm extraction first (fillable PDFs)
              let parsed: ParsedMDF | null = null;
              let confidence = 0;
              let textForTemplate = "";

              if (file.type === "application/pdf") {
                try {
                  const arrayBuf = await file.arrayBuffer();
                  if (signal.aborted) return;
                  const formParsed = await extractMDFFormFields(arrayBuf);
                  if (formParsed && formParsed.merchantLegalName) {
                    parsed = formParsed;
                    confidence = 95; // High confidence for form field extraction
                    textForTemplate = formParsed.rawText;
                  }
                } catch (err) {
                  console.warn("[MDF] AcroForm extraction failed, falling back to OCR:", err);
                }
              }

              // Fallback: OCR text extraction
              if (!parsed) {
                const text = await extractTextFromFile(file);
                if (signal.aborted) return;
                confidence = getLastConfidence();
                if (text) {
                  parsed = parseMDFText(text);
                  textForTemplate = text;
                }
              }

              // Phase 3: Process
              setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
              if (parsed) {
                parsedMDFRef.current = mergeParsedMDF(parsedMDFRef.current, parsed);
                await saveMDFData(caseId, parsed, confidence);
                if (signal.aborted) return;

                const validation = validateMDFFields(parsed);
                setMdfValidation(validation);

                // Auto-fill merchant name/DBA
                setMerchantInfo((prev) => {
                  const updates: Partial<MerchantInfo> = {};
                  if (!prev.legalName.trim() && parsed!.merchantLegalName?.trim()) {
                    updates.legalName = parsed!.merchantLegalName.trim();
                  }
                  if (!prev.dba.trim() && parsed!.dba?.trim()) {
                    updates.dba = parsed!.dba.trim();
                  }
                  if (Object.keys(updates).length > 0) {
                    toast.success("Auto-filled merchant info from MDF");
                    return { ...prev, ...updates };
                  }
                  return prev;
                });

                // Auto-fill submission details from MDF
                setSubmissionDetails((prev) => ({
                  ...prev,
                  contactPersonName: parsed!.contactName?.trim() || prev.contactPersonName,
                  mobileNumber: parsed!.contactMobile?.trim() || parsed!.mobileNo?.trim() || prev.mobileNumber,
                  emailAddress: parsed!.email1?.trim() || prev.emailAddress,
                  merchantLocation: parsed!.address?.trim() || parsed!.shopLocation?.trim() || prev.merchantLocation,
                  websiteUrl: parsed!.webAddress?.trim() || prev.websiteUrl,
                  noOfTerminalsAndType: parsed!.numTerminals?.trim() || prev.noOfTerminalsAndType,
                  natureOfBusiness: parsed!.businessType?.trim() || prev.natureOfBusiness,
                }));

                // Template matching for MDF
                if (textForTemplate) {
                  const tmResult = await matchTemplate(textForTemplate, "mdf");
                  if (signal.aborted) return;
                  if (tmResult.matched) {
                    setTemplateWarnings((prev) => {
                      const next = new Map(prev);
                      next.set("mdf", tmResult);
                      return next;
                    });
                  }
                }

                // Extract fields for review step
                const mdfFields = mdfToExtractedFields(parsed, confidence);
                if (mdfFields.length > 0) {
                  setExtractedFields((prev) => {
                    const next = new Map(prev);
                    next.set("mdf", mdfFields);
                    return next;
                  });
                }

                runConsistencyChecks();
                recomputeReadiness();
              }
            }

            // ── Trade License ──
            else if (itemId === "trade-license") {
              const text = await extractTextFromFile(file);
              if (signal.aborted) return;
              const confidence = getLastConfidence();

              setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
              if (text) {
                const parsed = parseTradeLicenseText(text);
                setTradeLicenseData(parsed);
                await saveTradeLicenseData(caseId, parsed, confidence);
                if (signal.aborted) return;
                // Inline indicator replaces toast

                // Extract fields for review step
                const tlFields = tradeLicenseToExtractedFields(parsed, confidence);
                if (tlFields.length > 0) {
                  setExtractedFields((prev) => {
                    const next = new Map(prev);
                    next.set("trade-license", tlFields);
                    return next;
                  });
                }

                runConsistencyChecks();
                recomputeReadiness();
              }
            }

            // ── Bank Statement ──
            else if (itemId === "bank-statement") {
              const text = await extractTextFromFile(file);
              if (signal.aborted) return;
              const confidence = getLastConfidence();

              setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
              if (text) {
                const parsed = parseBankStatementText(text);
                await saveBankStatementData(caseId, parsed, confidence);
                if (signal.aborted) return;
                // Inline indicator replaces toast
              }
            }

            // ── VAT Certificate ──
            else if (itemId === "vat-cert") {
              const text = await extractTextFromFile(file);
              if (signal.aborted) return;
              const confidence = getLastConfidence();

              setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
              if (text) {
                const parsed = parseVATCertText(text);
                await saveVATCertData(caseId, parsed, confidence);
                if (signal.aborted) return;
                // Inline indicator replaces toast
              }
            }

            // ── MOA ──
            else if (itemId === "main-moa" || itemId === "amended-moa") {
              const text = await extractTextFromFile(file);
              if (signal.aborted) return;
              const confidence = getLastConfidence();

              setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
              if (text) {
                const parsed = parseMOAText(text);
                await saveMOAData(caseId, parsed, confidence);
                if (signal.aborted) return;
                // Inline indicator replaces toast
                runConsistencyChecks();
              }
            }

            // ── Other files: doc type detection + template matching ──
            else {
              const templatedSlots = ["ack-form", "signed-svr", "aml-questionnaire", "addendum", "branch-form", "pg-questionnaire", "pep-form"];
              if (templatedSlots.includes(itemId)) {
                const text = await extractTextFromFile(file);
                if (signal.aborted) return;

                setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
                if (text && text.trim().length >= 30) {
                  const tmResult = await matchTemplate(text, itemId);
                  if (signal.aborted) return;
                  if (tmResult.matched) {
                    setTemplateWarnings((prev) => {
                      const next = new Map(prev);
                      next.set(itemId, tmResult);
                      return next;
                    });
                  }
                }
              } else {
                runDocTypeDetection(itemId, file);
              }
            }
          } catch {
            // Silent fail — OCR is best-effort
          }

          // Run upload slot validation only for slots without dedicated parsers
          // (MDF, trade-license, bank-statement, vat-cert, moa-articles already OCR + validate inline)
          const hasInlineParser = ["mdf", "trade-license", "bank-statement", "vat-cert", "moa-articles"].includes(itemId);
          if (!signal.aborted && !hasInlineParser) runUploadValidation(itemId, file);
        } else {
          // Non-image/PDF: just run doc type detection
          if (itemId !== "mdf" && itemId !== "trade-license") {
            runDocTypeDetection(itemId, file);
          }
        }

        // Done — clear progress
        if (!signal.aborted) {
          setSlotProgress(itemId, null);
          abortControllersRef.current.delete(itemId);
        }
      });

      // Run duplicate check after adding files
      setTimeout(() => {
        runDuplicateCheck();
        recomputeReadiness();
        // Trigger MDF merge detection if MDF slot changed
        if (itemId === "mdf") runMdfMergeDetection();
      }, 100);
    },
    [runDuplicateCheck, runDocTypeDetection, runConsistencyChecks, recomputeReadiness, runUploadValidation, mergeParsedMDF, runMdfMergeDetection, setSlotProgress]
  );

  const handleShareholderRawFiles = useCallback(
    (key: string, rawFiles: File[]) => {
      const existing = fileStoreRef.current.get(key) || [];
      fileStoreRef.current.set(key, [...existing, ...rawFiles]);

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

        // OCR for passport/EID
        if (file.type.startsWith("image/") || file.type === "application/pdf") {
          try {
            const text = await extractTextFromFile(file);
            const confidence = getLastConfidence();
            if (text) {
              if (docType === "passport") {
                const parsed = parsePassportText(text);
                await savePassportData(caseId, shareholderId, parsed, confidence);
                if (parsed.passportNumber) {
                  toast.info(`Passport scanned: ${parsed.surname || ""} ${parsed.givenNames || ""}`.trim(), {
                    description: parsed.isExpired ? "Warning: Passport appears expired" : undefined,
                  });
                }
              } else {
                const parsed = parseEIDText(text);
                await saveEIDData(caseId, shareholderId, parsed, confidence);
                if (parsed.idNumber) {
                  toast.info(`Emirates ID scanned: ${parsed.idNumber}`, {
                    description: parsed.isExpired ? "Warning: EID appears expired" : undefined,
                  });
                }
              }
            }
          } catch {
            // Silent fail
          }
        }
      });

      setTimeout(() => {
        runDuplicateCheck();
        recomputeReadiness();
      }, 100);
    },
    [runDuplicateCheck, recomputeReadiness]
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

      const existing = fileStoreRef.current.get(itemId) || [];
      const itemFiles = checklist.find((i) => i.id === itemId)?.files || [];
      const fileIndex = itemFiles.findIndex((f) => f.id === fileId);
      if (fileIndex >= 0 && fileIndex < existing.length) {
        existing.splice(fileIndex, 1);
        fileStoreRef.current.set(itemId, existing);
      }

      setDocTypeWarnings((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });

      setUploadValidations((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });

      setTemplateWarnings((prev) => {
        const next = new Map(prev);
        next.delete(itemId);
        return next;
      });

      if (itemId === "mdf") {
        const remaining = fileStoreRef.current.get("mdf") || [];
        if (remaining.length === 0) {
          setMdfValidation(null);
          parsedMDFRef.current = null;
          setExtractedFields((prev) => {
            const next = new Map(prev);
            next.delete("mdf");
            return next;
          });
          setMdfMergePlan(null);
        } else {
          // Re-detect merge plan with remaining files
          runMdfMergeDetection();
        }
      }

      if (itemId === "trade-license") {
        const remaining = fileStoreRef.current.get("trade-license") || [];
        if (remaining.length === 0) {
          setTradeLicenseData(null);
          setExtractedFields((prev) => {
            const next = new Map(prev);
            next.delete("trade-license");
            return next;
          });
        }
      }

      setTimeout(() => {
        runDuplicateCheck();
        recomputeReadiness();
        runConsistencyChecks();
      }, 100);
    },
    [checklist, runDuplicateCheck, recomputeReadiness, runConsistencyChecks, runMdfMergeDetection]
  );

  const handleMoveFile = useCallback(
    (fromSlotId: string, toSlotId: string, _files: File[]) => {
      // Get raw files from store (passed files may be empty from child)
      const rawFiles = fileStoreRef.current.get(fromSlotId) || [];
      if (rawFiles.length === 0) return;

      // 1. Remove files from source slot
      setChecklist((prev) =>
        prev.map((item) => {
          if (item.id !== fromSlotId) return item;
          return { ...item, files: [], status: "missing" as const };
        })
      );
      fileStoreRef.current.set(fromSlotId, []);
      setUploadValidations((prev) => {
        const next = new Map(prev);
        next.delete(fromSlotId);
        return next;
      });
      setDocTypeWarnings((prev) => {
        const next = new Map(prev);
        next.delete(fromSlotId);
        return next;
      });

      // 2. Add files to target slot
      const uploadedFiles: UploadedFile[] = rawFiles.map((f) => ({
        id: uuid(),
        name: f.name,
        size: f.size,
        type: f.type,
      }));
      handleItemUpdate(toSlotId, uploadedFiles);
      handleRawFilesAdded(toSlotId, rawFiles);

      toast.success(`File moved to ${checklist.find((i) => i.id === toSlotId)?.label || toSlotId}`);
    },
    [checklist, handleItemUpdate, handleRawFilesAdded]
  );

  const handleConditionalToggle = useCallback((key: string) => {
    setConditionals((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      updateCaseConditionals(caseIdRef.current, next);
      return next;
    });
  }, []);

  const handleMultiSlotFulfill = useCallback(
    (results: Array<{ slotId: string; files: File[] }>) => {
      for (const { slotId, files } of results) {
        const uploadedFiles: UploadedFile[] = files.map((f) => ({
          id: uuid(),
          name: f.name,
          size: f.size,
          type: f.type,
        }));
        handleItemUpdate(slotId, uploadedFiles);
        handleRawFilesAdded(slotId, files);
      }
    },
    [handleItemUpdate, handleRawFilesAdded]
  );

  const handleFieldConfirm = useCallback((docKey: string, fieldIndex: number, value: string) => {
    setExtractedFields((prev) => {
      const next = new Map(prev);
      const fields = [...(next.get(docKey) ?? [])];
      if (fields[fieldIndex]) {
        fields[fieldIndex] = {
          ...fields[fieldIndex],
          field: {
            ...fields[fieldIndex].field,
            value,
            extractionMethod: "user-override",
            confirmedBy: "user",
          },
        };
        next.set(docKey, fields);
      }
      return next;
    });
  }, []);

  const handleExceptionsChange = useCallback((newExceptions: CaseException[]) => {
    setExceptions(newExceptions);
    // Recompute readiness with updated exceptions
    setTimeout(() => recomputeReadiness(), 50);
  }, [recomputeReadiness]);

  const handleNextToReview = useCallback(async () => {
    await updateCaseStatus(caseIdRef.current, "complete");
    // Final readiness computation
    recomputeReadiness();
    setStep(2);
  }, [recomputeReadiness]);

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
            templateWarnings={templateWarnings}
            uploadValidations={uploadValidations}
            uploadProgress={uploadProgress}
            onCancelUpload={handleCancelUpload}
            onMoveFile={handleMoveFile}
            onMultiSlotFulfill={handleMultiSlotFulfill}
            onClassificationProgress={setClassificationInProgress}
            mdfMergePlan={mdfMergePlan}
            skipMdfMerge={skipMdfMerge}
            onSkipMdfMergeChange={setSkipMdfMerge}
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
            readiness={readiness}
            exceptions={exceptions}
            onExceptionsChange={handleExceptionsChange}
            extractedFields={extractedFields}
            onFieldConfirm={handleFieldConfirm}
            submissionDetails={submissionDetails}
            onSubmissionDetailsChange={setSubmissionDetails}
            mdfMergePlan={mdfMergePlan}
            skipMdfMerge={skipMdfMerge}
            onPrev={() => setStep(1)}
          />
        )}
      </WizardShell>
    </div>
  );
}
