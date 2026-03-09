export type CaseType = "low-risk" | "high-risk" | "additional-mid" | "additional-branch" | "ecom";
export type DocumentStatus = "missing" | "uploaded";
export type CaseStatus = "draft" | "submitted" | "in_review" | "approved" | "returned" | "escalated";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
  pageSide?: "front" | "back";
  pageCount?: number;
}

export interface ChecklistItem {
  id: string;
  label: string;
  category: string;
  required: boolean;
  conditionalKey?: string;
  conditionalLabel?: string;
  notes?: string[];
  sectionHeader?: string;
  files: UploadedFile[];
  status: DocumentStatus;
  multiFile?: boolean;
}

export interface ShareholderKYC {
  id: string;
  name: string;
  percentage: string;
  passportFiles: UploadedFile[];
  eidFiles: UploadedFile[];
}

export interface MerchantInfo {
  legalName: string;
  dba: string;
  caseType: CaseType;
  existingMid: string;
}

// ── Submission Email Table ──

export interface SubmissionDetails {
  requestDate: string;
  groupName: string;
  existingOrNew: string;
  existingRateRent: string;
  existingMidMerchantName: string;
  currentAcquirer: string;
  mcc: string;
  noOfLocations: string;
  merchantLocation: string;
  mobileNumber: string;
  contactPersonName: string;
  emailAddress: string;
  natureOfBusiness: string;
  avgTransactionSize: string;
  expectedMonthlySpend: string;
  websiteUrl: string;
  rentalFee: string;
  mso: string;
  noOfTerminalsAndType: string;
  proposedRateStandard: string;
  proposedRatePremium: string;
  proposedRateInternational: string;
  proposedRateDCC: string;
}

// ── OCR Field Extraction ──

export interface ExtractedField {
  value: string;
  confidence: number;
  sourcePage: number;
  boundingBox?: { x: number; y: number; w: number; h: number };
  extractionMethod: "ocr" | "pdf-text" | "mrz" | "user-override";
  confirmedBy?: "system" | "user";
}

// ── Scan Quality ──

export interface ScanQualityResult {
  score: number;
  passable: boolean;
  issues: ScanIssue[];
}

export interface ScanIssue {
  type: "blur" | "low-resolution" | "skew" | "overexposure";
  severity: "warning" | "critical";
  message: string;
}

// ── Page Classification ──

export interface ClassificationProgress {
  currentPage: number;
  totalPages: number;
  phase: "extracting" | "classifying" | "thumbnailing";
}

export interface PageClassification {
  pageNumber: number;
  docType: string | null;
  docTypeLabel: string | null;
  confidence: number;
  text: string;
  thumbnail: string; // base64 JPEG
  quality: ScanQualityResult;
}

export interface PageSegment {
  docType: string | null;
  docTypeLabel: string | null;
  confidence: number;
  pages: PageClassification[];
  suggestedSlotId: string | null;
}

export interface ConfirmedMapping {
  segmentIndex: number;
  slotId: string;
  pages: number[];
}

export interface FileClassificationResult {
  pages: PageClassification[];
  segments: PageSegment[];
  suggestedMappings: ConfirmedMapping[];
}

// ── Readiness Engine ──

export interface ReadinessResult {
  score: number;
  tier: "green" | "amber" | "red";
  items: ReadinessItem[];
  greenCount: number;
  amberCount: number;
  redCount: number;
}

export interface ReadinessItem {
  itemId: string;
  label: string;
  status: "pass" | "fail" | "exception";
  reason: string;
  confidence: number;
  exceptionOptions?: ExceptionOption[];
}

export interface ExceptionOption {
  id: string;
  label: string;
  requiresNote: boolean;
}

// ── Exceptions & Audit ──

export interface CaseException {
  id: string;
  caseId: string;
  itemId: string;
  reason: string;
  reasonCategory: "combined-doc" | "ocr-failed" | "field-not-detected" | "not-applicable" | "non-standard" | "other";
  notes?: string;
  createdAt: Date;
  createdBy?: string;
}

// ── Enhanced Duplicate Detection ──

export interface EnhancedDuplicateWarning {
  type: "exact" | "near-duplicate" | "identity-match";
  fileName: string;
  fileSize?: number;
  slots: string[];
  detail: string;
}

// ── Cross-Document Consistency ──

export interface ConsistencyWarning {
  type: "name-mismatch" | "expired" | "shareholder-mismatch" | "iban-invalid" | "iban-checksum-failed" | "bank-name-missing" | "passport-shareholder-mismatch";
  severity: "major" | "minor";
  message: string;
  docs: string[];
}

// ── Document Template Matching ──

/** A logical section of a document, matched by any of its keyword patterns */
export interface SectionCheck {
  /** Display label shown in the UI (e.g. "Merchant Details") */
  label: string;
  /** Alternative phrases — if ANY appears in the text, the section is considered present */
  patterns: string[];
}

export interface DocumentTemplate {
  id: string;
  docTypeId: string;
  label: string;
  sections: SectionCheck[];
  requiredFields: string[];
  /** Patterns that match required fields in OCR text (parallel to requiredFields) */
  fieldPatterns: string[];
  identifyingKeywords: string[];
  version?: string;
}

export interface TemplateMatchResult {
  matched: DocumentTemplate | null;
  confidence: number;
  matchedSections: string[];
  missingSections: string[];
}

// ── Structured Extraction Types ──

export interface ParsedPassport {
  surname?: string;
  givenNames?: string;
  passportNumber?: string;
  nationality?: string;
  dateOfBirth?: string;
  sex?: string;
  expiryDate?: string;
  isExpired?: boolean;
  mrzValid?: boolean;
  rawText: string;
}

export interface ParsedEID {
  idNumber?: string;
  name?: string;
  nationality?: string;
  expiryDate?: string;
  isExpired?: boolean;
  rawText: string;
}

export interface ParsedMOA {
  companyName?: string;
  shareholders?: string[];
  sharePercentages?: string[];
  signatories?: string[];
  rawText: string;
}

export interface ParsedBankStatement {
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  period?: string;
  rawText: string;
}

export interface ParsedVATCert {
  trnNumber?: string;
  businessName?: string;
  registrationDate?: string;
  rawText: string;
}

// ── Upload Progress ──

export interface UploadProgress {
  phase: "uploading" | "scanning" | "processing";
  message: string;
}

// OCR types are now defined in ocr-engine.ts (ParsedMDF, ParsedTradeLicense)
// and stored in structured Supabase tables instead of a single blob
