export type CaseType = "low-risk" | "high-risk" | "ecom" | "branch";
export type BranchMode = "with-main" | "separate";
export type DocumentStatus = "missing" | "uploaded";

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dataUrl?: string;
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
  branchMode?: BranchMode;
}

// OCR types are now defined in ocr-engine.ts (ParsedMDF, ParsedTradeLicense)
// and stored in structured Supabase tables instead of a single blob
