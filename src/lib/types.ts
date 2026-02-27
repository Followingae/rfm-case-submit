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

export interface OCRData {
  merchantLegalName?: string;
  dba?: string;
  address?: string;
  emirate?: string;
  country?: string;
  telephone?: string;
  mobile?: string;
  email1?: string;
  email2?: string;
  shopLocation?: string;
  businessType?: string;
  webAddress?: string;
  iban?: string;
  accountNo?: string;
  accountTitle?: string;
  bankName?: string;
  swiftCode?: string;
  numberOfTerminals?: string;
  shareholders?: Array<{
    name: string;
    shares: string;
    nationality: string;
    residence: string;
  }>;
  tlNumber?: string;
  tlIssueDate?: string;
  tlExpiryDate?: string;
  tlBusinessName?: string;
  tlActivities?: string;
  rawMdfText?: string;
  rawTlText?: string;
}

export interface CaseSubmission {
  id: string;
  merchantInfo: MerchantInfo;
  checklist: ChecklistItem[];
  ocrData: OCRData;
  createdAt: string;
  status: "incomplete" | "complete" | "exported";
}
