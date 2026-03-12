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
  ParsedBankStatement,
  ParsedVATCert,
  ParsedMOA,
  ParsedPassport,
  ParsedEID,
} from "@/lib/types";
import { getChecklistForCase } from "@/lib/checklist-config";
// OCR removed — pure AI platform
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
import { detectDocumentType, DocTypeDetectionResult, DOC_TYPES, SLOT_TO_DOCTYPE } from "@/lib/doc-type-detector";
import { validateSlotUpload, UploadValidation } from "@/lib/upload-validator";
import { detectEnhancedDuplicates } from "@/lib/duplicate-detector";
import type { EnhancedDuplicateWarning } from "@/lib/types";
import { computeReadiness, type KycExpiryFlag } from "@/lib/readiness-engine";
import { checkConsistency } from "@/lib/consistency-checker";
import { getExceptions } from "@/lib/exception-store";
import {
  mdfToExtractedFields,
  tradeLicenseToExtractedFields,
  bankStatementToExtractedFields,
  vatCertToExtractedFields,
  moaToExtractedFields,
  passportToExtractedFields,
  eidToExtractedFields,
  type LabeledField,
} from "@/lib/field-adapter";
import type { ParsedTradeLicense, ParsedMDF } from "@/lib/ocr-engine";
import { detectMDFMergePlan, type MergePlan } from "@/lib/pdf-merger";
import { validateDocCompleteness, type DocCompletenessResult } from "@/lib/doc-completeness";
import { autofillSubmissionFromMDF } from "@/lib/submission-autofill";
import { aiExtractDocument } from "@/lib/ai-extract";
import type { AIExtractionMeta } from "@/lib/ai-types";

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
  const [duplicateWarnings, setDuplicateWarnings] = useState<EnhancedDuplicateWarning[]>([]);

  // New intelligence state
  const [tradeLicenseData, setTradeLicenseData] = useState<ParsedTradeLicense | null>(null);
  const [bankStatementData, setBankStatementData] = useState<ParsedBankStatement | null>(null);
  const [vatCertData, setVatCertData] = useState<ParsedVATCert | null>(null);
  const [moaData, setMoaData] = useState<ParsedMOA | null>(null);
  const [consistencyWarnings, setConsistencyWarnings] = useState<ConsistencyWarning[]>([]);
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null);
  const [exceptions, setExceptions] = useState<CaseException[]>([]);
  const [uploadValidations, setUploadValidations] = useState<Map<string, UploadValidation>>(new Map());
  const [templateWarnings, setTemplateWarnings] = useState<Map<string, TemplateMatchResult>>(new Map());
  const [extractedFields, setExtractedFields] = useState<Map<string, LabeledField[]>>(new Map());

  // KYC expiry tracking for readiness engine
  const [kycExpiryFlags, setKycExpiryFlags] = useState<Map<string, KycExpiryFlag>>(new Map());

  // Document completeness tracking
  const [docCompleteness, setDocCompleteness] = useState<Map<string, DocCompletenessResult>>(new Map());

  // AI extraction metadata tracking
  const [aiMetadata, setAiMetadata] = useState<Map<string, AIExtractionMeta>>(new Map());

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
  const parsedMDFRef = useRef<ParsedMDF | null>(null);

  const setSlotProgress = useCallback((itemId: string, progress: UploadProgress | null) => {
    setUploadProgress(prev => {
      const next = new Map(prev);
      if (progress) next.set(itemId, progress);
      else next.delete(itemId);
      return next;
    });
  }, []);

  const storeAiMeta = useCallback((slotId: string, meta: AIExtractionMeta) => {
    setAiMetadata(prev => { const m = new Map(prev); m.set(slotId, meta); return m; });
  }, []);

  // AI-powered wrong-doc-in-slot detection — uses the detectedDocType from primary extraction (no extra API call)
  const checkSlotDocType = useCallback((slotId: string, meta: AIExtractionMeta) => {
    const detected = meta.detectedDocType?.toLowerCase().trim();
    if (!detected || detected === "unknown") return;

    const expectedTypes = SLOT_TO_DOCTYPE[slotId] || [];
    if (expectedTypes.length === 0) return; // no mapping for this slot

    const isMatch = expectedTypes.includes(detected);

    if (isMatch) {
      // Set "pass" upload validation — shows "AI Verified" in UI
      setUploadValidations(prev => {
        const next = new Map(prev);
        const slotLabel = checklist.find(i => i.id === slotId)?.label || slotId;
        next.set(slotId, {
          status: "pass",
          confidence: meta.confidence,
          detectedDocType: detected,
          detectedLabel: DOC_TYPES.find(d => d.id === detected)?.label || detected,
          expectedDocType: expectedTypes[0] || slotId,
          expectedLabel: slotLabel,
          suggestedSlotId: null,
          suggestedSlotLabel: null,
          message: "Document type verified",
          referenceUsed: false,
        });
        return next;
      });
    } else {
      // Mismatch — find the correct slot
      let suggestedSlotId: string | null = null;
      let suggestedSlotLabel: string | null = null;
      for (const [sId, types] of Object.entries(SLOT_TO_DOCTYPE)) {
        if (sId === slotId) continue;
        if (types.includes(detected)) {
          const slot = checklist.find(i => i.id === sId);
          if (slot) { suggestedSlotId = sId; suggestedSlotLabel = slot.label; break; }
        }
      }

      const detectedLabel = DOC_TYPES.find(d => d.id === detected)?.label || detected;
      const expectedLabel = checklist.find(i => i.id === slotId)?.label || slotId;

      setDocTypeWarnings(prev => {
        const next = new Map(prev);
        next.set(slotId, {
          detected,
          detectedLabel,
          confidence: meta.confidence,
          isMatch: false,
          suggestion: suggestedSlotLabel
            ? `Detected as ${detectedLabel} — move to ${suggestedSlotLabel}?`
            : `Detected as ${detectedLabel}, not ${expectedLabel}`,
        });
        return next;
      });

      setUploadValidations(prev => {
        const next = new Map(prev);
        next.set(slotId, {
          status: "mismatch",
          confidence: meta.confidence,
          detectedDocType: detected,
          detectedLabel,
          expectedDocType: expectedTypes[0] || slotId,
          expectedLabel,
          suggestedSlotId,
          suggestedSlotLabel,
          message: suggestedSlotLabel
            ? `This looks like a **${detectedLabel}**. Would you like to move it to the ${suggestedSlotLabel} slot?`
            : `This doesn't look like a ${expectedLabel}. Please double-check.`,
          referenceUsed: false,
        });
        return next;
      });
    }
  }, [checklist]);

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
        // Boolean: prefer true
        if (typeof newVal === "boolean" && newVal === true) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (result as any)[k] = true;
          continue;
        }
        // String: prefer first non-empty value
        if (typeof newVal === "string" && newVal.trim()) {
          if (!existVal || (typeof existVal === "string" && !existVal.trim())) {
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
      setKycExpiryFlags(new Map());
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
        uploadValidations,
        kycExpiryFlags,
        docCompleteness,
        aiMetadata,
      );
      setReadiness(result);
      return currentChecklist;
    });
  }, [conditionals, shareholders, mdfValidation, tradeLicenseData, docTypeWarnings, exceptions, uploadValidations, kycExpiryFlags, docCompleteness, aiMetadata]);

  // Run consistency checks
  const runConsistencyChecks = useCallback(() => {
    const warnings = checkConsistency(
      parsedMDFRef.current || null,
      tradeLicenseData,
      merchantInfo,
      shareholders,
      bankStatementData,
      vatCertData,
      moaData,
    );
    setConsistencyWarnings(warnings);
  }, [tradeLicenseData, merchantInfo, shareholders, bankStatementData, vatCertData, moaData]);

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

  const runDuplicateCheck = useCallback(async () => {
    const dupes = await detectEnhancedDuplicates(fileStoreRef.current);
    setDuplicateWarnings(dupes);
  }, []);

  const runDocTypeDetection = useCallback(
    async (itemId: string, file: File) => {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") return;
      try {
        // Use AI doc-type detection instead of OCR
        const aiResult = await aiExtractDocument(file, "doc-detect");
        if (aiResult?.meta?.detectedDocType) {
          const detected = aiResult.meta.detectedDocType.toLowerCase();
          const slotId = itemId.toLowerCase();
          // If detected type doesn't match the slot, surface a warning
          if (detected !== "unknown" && !detected.includes(slotId) && !slotId.includes(detected)) {
            const result = detectDocumentType(detected, itemId);
            if (result.suggestion) {
              setDocTypeWarnings((prev) => {
                const next = new Map(prev);
                next.set(itemId, result);
                return next;
              });
            }
          }
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
        // Use AI doc-detect to validate the upload matches the slot
        const aiResult = await aiExtractDocument(file, "doc-detect");
        if (aiResult?.meta?.detectedDocType) {
          const detected = aiResult.meta.detectedDocType;
          const currentItems = checklist.map((i) => ({ id: i.id, label: i.label, status: i.status }));
          const result = await validateSlotUpload(detected, itemId, currentItems);
          setUploadValidations((prev) => {
            const next = new Map(prev);
            next.set(itemId, result);
            return next;
          });
        }
      } catch {
        // Silent fail
      }
    },
    [checklist]
  );

  const handleRawFilesAdded = useCallback(
    async (itemId: string, rawFiles: File[]) => {
      const existing = fileStoreRef.current.get(itemId) || [];
      fileStoreRef.current.set(itemId, [...existing, ...rawFiles]);

      const caseId = caseIdRef.current;
      for (const file of rawFiles) {
        const abortKey = `${itemId}::${file.name}`;
        const controller = new AbortController();
        abortControllersRef.current.set(abortKey, controller);
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
        } else {
          toast.error(`Upload failed for ${file.name}`, { description: "Could not save file to storage. Please try again." });
        }

        // AI extraction based on slot type
        if (file.type.startsWith("image/") || file.type === "application/pdf") {
          try {
            // Phase 2: AI Analysis
            setSlotProgress(itemId, { phase: "scanning", message: "Scanning document..." });

            // ── MDF ──
            if (itemId === "mdf") {
              // AI extraction
              setSlotProgress(itemId, { phase: "analyzing", message: "Analyzing..." });
              const aiResult = await aiExtractDocument(file, "mdf", signal);
              if (signal.aborted) return;

              let parsed: ParsedMDF | null = null;
              let confidence = 0;
              if (aiResult) {
                // AI succeeded — map to ParsedMDF
                const d = aiResult.data;
                parsed = {
                  rawText: "",
                  feeSchedule: Array.isArray(d.feeSchedule) ? d.feeSchedule as ParsedMDF["feeSchedule"] : [],
                  terminalFees: Array.isArray(d.terminalFees) ? d.terminalFees as ParsedMDF["terminalFees"] : [],
                  shareholders: Array.isArray(d.shareholders) ? d.shareholders as ParsedMDF["shareholders"] : [],
                  keySuppliers: Array.isArray(d.keySuppliers) ? d.keySuppliers as ParsedMDF["keySuppliers"] : [],
                  keyCustomers: Array.isArray(d.keyCustomers) ? d.keyCustomers as ParsedMDF["keyCustomers"] : [],
                  sanctionsExposure: Array.isArray(d.sanctionsExposure) ? d.sanctionsExposure as ParsedMDF["sanctionsExposure"] : [],
                  productPOS: d.productPOS === true,
                  productECOM: d.productECOM === true,
                  productMPOS: d.productMPOS === true,
                  productMOTO: d.productMOTO === true,
                  hasOtherAcquirer: d.hasOtherAcquirer === true,
                  // String fields
                  merchantLegalName: (d.merchantLegalName as string) || undefined,
                  dba: (d.dba as string) || undefined,
                  emirate: (d.emirate as string) || undefined,
                  country: (d.country as string) || undefined,
                  address: (d.address as string) || undefined,
                  poBox: (d.poBox as string) || undefined,
                  mobileNo: (d.mobileNo as string) || undefined,
                  telephoneNo: (d.telephoneNo as string) || undefined,
                  email1: (d.email1 as string) || undefined,
                  email2: (d.email2 as string) || undefined,
                  shopLocation: (d.shopLocation as string) || undefined,
                  businessType: (d.businessType as string) || undefined,
                  webAddress: (d.webAddress as string) || undefined,
                  contactName: (d.contactName as string) || undefined,
                  contactTitle: (d.contactTitle as string) || undefined,
                  contactMobile: (d.contactMobile as string) || undefined,
                  contactWorkPhone: (d.contactWorkPhone as string) || undefined,
                  refundFee: (d.refundFee as string) || undefined,
                  msvShortfall: (d.msvShortfall as string) || undefined,
                  chargebackFee: (d.chargebackFee as string) || undefined,
                  portalFee: (d.portalFee as string) || undefined,
                  businessInsightFee: (d.businessInsightFee as string) || undefined,
                  numTerminals: (d.numTerminals as string) || undefined,
                  accountNo: (d.accountNo as string) || undefined,
                  iban: (d.iban as string) || undefined,
                  accountTitle: (d.accountTitle as string) || undefined,
                  bankName: (d.bankName as string) || undefined,
                  swiftCode: (d.swiftCode as string) || undefined,
                  branchName: (d.branchName as string) || undefined,
                  paymentPlan: (d.paymentPlan as string) || undefined,
                  projectedMonthlyVolume: (d.projectedMonthlyVolume as string) || undefined,
                  projectedMonthlyCount: (d.projectedMonthlyCount as string) || undefined,
                  sourceOfIncome: (d.sourceOfIncome as string) || undefined,
                  incomeCountry: (d.incomeCountry as string) || undefined,
                  activityDetails: (d.activityDetails as string) || undefined,
                  sourceOfCapital: (d.sourceOfCapital as string) || undefined,
                  yearsInUAE: (d.yearsInUAE as string) || undefined,
                  exactBusinessNature: (d.exactBusinessNature as string) || undefined,
                  otherAcquirerNames: (d.otherAcquirerNames as string) || undefined,
                  otherAcquirerYears: (d.otherAcquirerYears as string) || undefined,
                  reasonForMagnati: (d.reasonForMagnati as string) || undefined,
                };
                confidence = aiResult.meta.confidence;
                storeAiMeta("mdf", aiResult.meta);
                checkSlotDocType("mdf", aiResult.meta);
              } else {
                toast.error("Extraction failed for MDF", { description: "Please check your internet connection and try again." });
              }

              // Phase 3: Process
              setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
              if (parsed) {
                parsedMDFRef.current = mergeParsedMDF(parsedMDFRef.current, parsed);
                await saveMDFData(caseId, parsed, confidence);
                if (signal.aborted) return;

                const validation = validateMDFFields(parsedMDFRef.current!);
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

                // Auto-fill submission details from MDF (rates, projections, contact, etc.)
                setSubmissionDetails((prev) => autofillSubmissionFromMDF(prev, parsed!));

                // Extract fields for review step
                const mdfFields = mdfToExtractedFields(parsed, confidence);
                if (mdfFields.length > 0) {
                  setExtractedFields((prev) => {
                    const next = new Map(prev);
                    next.set("mdf", mdfFields);
                    return next;
                  });
                }

                // Auto-populate shareholders from MDF
                if (parsed.shareholders && parsed.shareholders.length > 0) {
                  setShareholders(prev => {
                    if (prev.length > 0) return prev; // don't overwrite user entries
                    return parsed!.shareholders.map(s => ({
                      id: crypto.randomUUID(),
                      name: s.name || "",
                      percentage: (s.sharesPercentage || "").replace(/[^0-9.]/g, ""),
                      passportFiles: [],
                      eidFiles: [],
                    }));
                  });
                }

                runConsistencyChecks();
                recomputeReadiness();
              }
            }

            // ── Trade License ──
            else if (itemId === "trade-license") {
              // AI extraction
              setSlotProgress(itemId, { phase: "analyzing", message: "Analyzing..." });
              const aiResult = await aiExtractDocument(file, "trade-license", signal);
              if (signal.aborted) return;

              if (aiResult) {
                const d = aiResult.data;
                const parsed: ParsedTradeLicense = {
                  rawText: "",
                  licenseNumber: (d.licenseNumber as string) || undefined,
                  issueDate: (d.issueDate as string) || undefined,
                  expiryDate: (d.expiryDate as string) || undefined,
                  businessName: (d.businessName as string) || undefined,
                  legalForm: (d.legalForm as string) || undefined,
                  activities: (d.activities as string) || undefined,
                  authority: (d.authority as string) || undefined,
                  partnersListed: (d.partnersListed as string) || undefined,
                  registeredAddress: (d.registeredAddress as string) || undefined,
                  paidUpCapital: (d.paidUpCapital as string) || undefined,
                  licenseType: (d.licenseType as string) || undefined,
                };
                const confidence = aiResult.meta.confidence;
                storeAiMeta("trade-license", aiResult.meta);
                checkSlotDocType("trade-license", aiResult.meta);

                setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
                setTradeLicenseData(parsed);
                await saveTradeLicenseData(caseId, parsed, confidence);
                if (signal.aborted) return;

                // Document completeness check
                const tlComplete = validateDocCompleteness("trade-license", parsed, aiResult.meta);
                setDocCompleteness(prev => { const m = new Map(prev); m.set("trade-license", tlComplete); return m; });

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
              } else {
                toast.error("Extraction failed for Trade License", { description: "Please check your internet connection and try again." });
              }
            }

            // ── Bank Statement ──
            else if (itemId === "bank-statement") {
              // AI extraction
              setSlotProgress(itemId, { phase: "analyzing", message: "Analyzing..." });
              const aiResult = await aiExtractDocument(file, "bank-statement", signal);
              if (signal.aborted) return;

              if (aiResult) {
                const d = aiResult.data;
                const parsed: ParsedBankStatement = {
                  rawText: "",
                  bankName: (d.bankName as string) || undefined,
                  accountHolder: (d.accountHolder as string) || undefined,
                  accountNumber: (d.accountNumber as string) || undefined,
                  iban: (d.iban as string) || undefined,
                  currency: (d.currency as string) || undefined,
                  period: (d.period as string) || undefined,
                  periodEndDate: (d.periodEndDate as string) || undefined,
                  openingBalance: (d.openingBalance as string) || undefined,
                  closingBalance: (d.closingBalance as string) || undefined,
                  totalCredits: (d.totalCredits as string) || undefined,
                  totalDebits: (d.totalDebits as string) || undefined,
                  swiftCode: (d.swiftCode as string) || undefined,
                };
                const confidence = aiResult.meta.confidence;
                storeAiMeta("bank-statement", aiResult.meta);
                checkSlotDocType("bank-statement", aiResult.meta);

                setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
                await saveBankStatementData(caseId, parsed, confidence);
                if (signal.aborted) return;

                setBankStatementData(parsed);

                // Document completeness check
                const bsComplete = validateDocCompleteness("bank-statement", parsed, aiResult.meta);
                setDocCompleteness(prev => { const m = new Map(prev); m.set("bank-statement", bsComplete); return m; });

                // Extract fields for review step
                const bsFields = bankStatementToExtractedFields(parsed, confidence);
                if (bsFields.length > 0) {
                  setExtractedFields((prev) => {
                    const next = new Map(prev);
                    next.set("bank-statement", bsFields);
                    return next;
                  });
                }

                runConsistencyChecks();
                recomputeReadiness();
              } else {
                toast.error("Extraction failed for Bank Statement", { description: "Please check your internet connection and try again." });
              }
            }

            // ── VAT Certificate ──
            else if (itemId === "vat-cert") {
              // AI extraction
              setSlotProgress(itemId, { phase: "analyzing", message: "Analyzing..." });
              const aiResult = await aiExtractDocument(file, "vat-cert", signal);
              if (signal.aborted) return;

              if (aiResult) {
                const d = aiResult.data;
                const parsed: ParsedVATCert = {
                  rawText: "",
                  trnNumber: (d.trnNumber as string) || undefined,
                  businessName: (d.businessName as string) || undefined,
                  registrationDate: (d.registrationDate as string) || undefined,
                  effectiveDate: (d.effectiveDate as string) || undefined,
                  expiryDate: (d.expiryDate as string) || undefined,
                  businessAddress: (d.businessAddress as string) || undefined,
                };
                const confidence = aiResult.meta.confidence;
                storeAiMeta("vat-cert", aiResult.meta);
                checkSlotDocType("vat-cert", aiResult.meta);

                setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
                await saveVATCertData(caseId, parsed, confidence);
                if (signal.aborted) return;

                setVatCertData(parsed);

                // Document completeness check
                const vatComplete = validateDocCompleteness("vat-cert", parsed, aiResult.meta);
                setDocCompleteness(prev => { const m = new Map(prev); m.set("vat-cert", vatComplete); return m; });

                // Extract fields for review step
                const vatFields = vatCertToExtractedFields(parsed, confidence);
                if (vatFields.length > 0) {
                  setExtractedFields((prev) => {
                    const next = new Map(prev);
                    next.set("vat-cert", vatFields);
                    return next;
                  });
                }

                runConsistencyChecks();
                recomputeReadiness();
              } else {
                toast.error("Extraction failed for VAT Certificate", { description: "Please check your internet connection and try again." });
              }
            }

            // ── MOA ──
            else if (itemId === "main-moa" || itemId === "amended-moa") {
              // AI extraction (use "main-moa" as docType for the AI prompt)
              setSlotProgress(itemId, { phase: "analyzing", message: "Analyzing..." });
              const aiResult = await aiExtractDocument(file, "main-moa", signal);
              if (signal.aborted) return;

              if (aiResult) {
                const d = aiResult.data;
                const parsed: ParsedMOA = {
                  rawText: "",
                  companyName: (d.companyName as string) || undefined,
                  shareholders: Array.isArray(d.shareholders) ? d.shareholders as string[] : undefined,
                  sharePercentages: Array.isArray(d.sharePercentages) ? d.sharePercentages as string[] : undefined,
                  signatories: Array.isArray(d.signatories) ? d.signatories as string[] : undefined,
                  registrationNumber: (d.registrationNumber as string) || undefined,
                  registrationDate: (d.registrationDate as string) || undefined,
                  authorizedCapital: (d.authorizedCapital as string) || undefined,
                  legalForm: (d.legalForm as string) || undefined,
                  paidUpCapital: (d.paidUpCapital as string) || undefined,
                  companyObjectives: (d.companyObjectives as string) || undefined,
                  registeredAddress: (d.registeredAddress as string) || undefined,
                  notarizationDate: (d.notarizationDate as string) || undefined,
                };
                const confidence = aiResult.meta.confidence;
                storeAiMeta(itemId, aiResult.meta);
                checkSlotDocType(itemId, aiResult.meta);

                setSlotProgress(itemId, { phase: "processing", message: "Processing..." });
                await saveMOAData(caseId, parsed, confidence);
                if (signal.aborted) return;

                setMoaData(parsed);

                // Document completeness check
                const moaComplete = validateDocCompleteness(itemId, parsed, aiResult.meta);
                setDocCompleteness(prev => { const m = new Map(prev); m.set(itemId, moaComplete); return m; });

                // Extract fields for review step
                const moaFields = moaToExtractedFields(parsed, confidence);
                if (moaFields.length > 0) {
                  setExtractedFields((prev) => {
                    const next = new Map(prev);
                    next.set(itemId, moaFields);
                    return next;
                  });
                }

                // Auto-populate shareholders from MOA if MDF didn't provide them
                if (parsed.shareholders && parsed.shareholders.length > 0) {
                  setShareholders(prev => {
                    if (prev.length > 0) return prev; // don't overwrite existing
                    return parsed.shareholders!.map((name, i) => ({
                      id: crypto.randomUUID(),
                      name: name || "",
                      percentage: parsed.sharePercentages?.[i]?.replace(/[^0-9.]/g, "") || "",
                      passportFiles: [],
                      eidFiles: [],
                    }));
                  });
                }

                runConsistencyChecks();
              } else {
                toast.error("Extraction failed for MOA", { description: "Please check your internet connection and try again." });
              }
            }

            // ── PEP Form: AI extraction ──
            else if (itemId === "pep-form") {
              setSlotProgress(itemId, { phase: "analyzing", message: "Analyzing PEP form..." });
              const aiResult = await aiExtractDocument(file, "pep-form", signal);
              if (signal.aborted) return;

              if (aiResult) {
                const confidence = aiResult.meta?.confidence ?? 0;
                storeAiMeta(itemId, aiResult.meta);
                checkSlotDocType(itemId, aiResult.meta);

                // Surface PEP status in toast
                const isPEP = aiResult.data?.isPEP;
                if (isPEP === true) {
                  toast.warning("PEP declared", {
                    description: "This merchant has declared politically exposed persons. Enhanced due diligence required.",
                  });
                } else if (isPEP === false) {
                  toast.success("PEP form analyzed", {
                    description: `No PEP declared. Confidence: ${confidence}%`,
                  });
                }
              } else {
                runDocTypeDetection(itemId, file);
              }
            }

            // ── Other files: AI-based doc type detection ──
            else {
              runDocTypeDetection(itemId, file);
            }
          } catch {
            // Silent fail — AI is best-effort
          }

          // Run upload slot validation only for slots without dedicated parsers
          // (MDF, trade-license, bank-statement, vat-cert, main-moa, amended-moa already AI + validate inline)
          const hasInlineParser = ["mdf", "trade-license", "bank-statement", "vat-cert", "main-moa", "amended-moa", "pep-form"].includes(itemId);
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
          abortControllersRef.current.delete(abortKey);
        }
      }

      // Run duplicate check after adding files
      setTimeout(() => {
        runDuplicateCheck();
        recomputeReadiness();
        // Trigger MDF merge detection if MDF slot changed
        if (itemId === "mdf") runMdfMergeDetection();
      }, 100);
    },
    [runDuplicateCheck, runDocTypeDetection, runConsistencyChecks, recomputeReadiness, runUploadValidation, mergeParsedMDF, runMdfMergeDetection, setSlotProgress, storeAiMeta, checkSlotDocType]
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

        // AI for passport/EID
        if (file.type.startsWith("image/") || file.type === "application/pdf") {
          try {
            if (docType === "passport") {
              // AI extraction
              const aiResult = await aiExtractDocument(file, "passport");

              if (aiResult) {
                const d = aiResult.data;
                const parsed: ParsedPassport = {
                  rawText: "",
                  surname: (d.surname as string) || undefined,
                  givenNames: (d.givenNames as string) || undefined,
                  passportNumber: (d.passportNumber as string) || undefined,
                  nationality: (d.nationality as string) || undefined,
                  dateOfBirth: (d.dateOfBirth as string) || undefined,
                  sex: (d.sex as string) || undefined,
                  expiryDate: (d.expiryDate as string) || undefined,
                  placeOfBirth: (d.placeOfBirth as string) || undefined,
                  issuingDate: (d.issuingDate as string) || undefined,
                  isExpired: d.isExpired === true,
                  mrzValid: d.mrzValid === true,
                };
                const confidence = aiResult.meta.confidence;
                storeAiMeta(`passport::${shareholderId}`, aiResult.meta);

                await savePassportData(caseId, shareholderId, parsed, confidence);

                // Document completeness check
                const ppComplete = validateDocCompleteness("passport", parsed, aiResult.meta);
                setDocCompleteness(prev => { const m = new Map(prev); m.set(`passport::${shareholderId}`, ppComplete); return m; });

                // Extract fields for review step
                const ppFields = passportToExtractedFields(parsed, confidence);
                if (ppFields.length > 0) {
                  setExtractedFields((prev) => {
                    const next = new Map(prev);
                    next.set(`passport::${shareholderId}`, ppFields);
                    return next;
                  });
                }

                // Update KYC expiry flags for readiness engine
                setKycExpiryFlags((prev) => {
                  const next = new Map(prev);
                  const existing = next.get(shareholderId) || {};
                  next.set(shareholderId, {
                    ...existing,
                    passportExpired: parsed.isExpired === true,
                    passportExpiryDate: parsed.expiryDate,
                  });
                  return next;
                });

                if (parsed.passportNumber) {
                  toast.success(`Passport scanned: ${parsed.surname || ""} ${parsed.givenNames || ""}`.trim(), {
                    description: parsed.isExpired ? "Warning: Passport appears expired" : undefined,
                  });
                }

                recomputeReadiness();
              } else {
                toast.error("Extraction failed for Passport", { description: "Please check your internet connection and try again." });
              }
            } else {
              // EID — AI extraction
              const aiResult = await aiExtractDocument(file, "eid");

              if (aiResult) {
                const d = aiResult.data;
                const parsed: ParsedEID = {
                  rawText: "",
                  idNumber: (d.idNumber as string) || undefined,
                  cardNumber: (d.cardNumber as string) || undefined,
                  name: (d.name as string) || undefined,
                  nationality: (d.nationality as string) || undefined,
                  expiryDate: (d.expiryDate as string) || undefined,
                  issuingDate: (d.issuingDate as string) || undefined,
                  dateOfBirth: (d.dateOfBirth as string) || undefined,
                  gender: (d.gender as string) || undefined,
                  isExpired: d.isExpired === true,
                };
                const confidence = aiResult.meta.confidence;
                storeAiMeta(`eid::${shareholderId}`, aiResult.meta);

                await saveEIDData(caseId, shareholderId, parsed, confidence);

                // Document completeness check
                const eidComplete = validateDocCompleteness("eid", parsed, aiResult.meta);
                setDocCompleteness(prev => { const m = new Map(prev); m.set(`eid::${shareholderId}`, eidComplete); return m; });

                // Extract fields for review step
                const eidFields = eidToExtractedFields(parsed, confidence);
                if (eidFields.length > 0) {
                  setExtractedFields((prev) => {
                    const next = new Map(prev);
                    next.set(`eid::${shareholderId}`, eidFields);
                    return next;
                  });
                }

                // Update KYC expiry flags for readiness engine
                setKycExpiryFlags((prev) => {
                  const next = new Map(prev);
                  const existing = next.get(shareholderId) || {};
                  next.set(shareholderId, {
                    ...existing,
                    eidExpired: parsed.isExpired === true,
                    eidExpiryDate: parsed.expiryDate,
                  });
                  return next;
                });

                if (parsed.idNumber) {
                  toast.success(`Emirates ID scanned: ${parsed.idNumber}`, {
                    description: parsed.isExpired ? "Warning: EID appears expired" : undefined,
                  });
                }

                recomputeReadiness();
              } else {
                toast.error("Extraction failed for Emirates ID", { description: "Please check your internet connection and try again." });
              }
            }
          } catch {
            // Silent fail — AI is best-effort
          }
        }
      });

      setTimeout(() => {
        runDuplicateCheck();
        recomputeReadiness();
      }, 100);
    },
    [runDuplicateCheck, recomputeReadiness, storeAiMeta]
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
    recomputeReadiness();
  }, [recomputeReadiness]);

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
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col overflow-hidden md:h-dvh">
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
            consistencyWarnings={consistencyWarnings}
            mdfMergePlan={mdfMergePlan}
            skipMdfMerge={skipMdfMerge}
            onSkipMdfMergeChange={setSkipMdfMerge}
            aiMetadata={aiMetadata}
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
            consistencyWarnings={consistencyWarnings}
            mdfMergePlan={mdfMergePlan}
            skipMdfMerge={skipMdfMerge}
            aiMetadata={aiMetadata}
            onPrev={() => setStep(1)}
          />
        )}
      </WizardShell>
    </div>
  );
}
