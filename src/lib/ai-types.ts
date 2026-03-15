/** Metadata returned by the AI extraction alongside parsed fields. */
export interface AIExtractionMeta {
  /** 0–100 overall confidence in the extraction quality. */
  confidence: number;
  /** Whether all visible form sections appear to be filled in. */
  isComplete: boolean;
  /** Names of any sections/areas that appear blank or unfilled. */
  blankSections: string[];
  /** Whether a handwritten or digital signature is present. */
  hasSignature: boolean;
  /** Whether an official company or authority stamp is visible. */
  hasStamp: boolean;
  /** Number of pages analysed. */
  pageCount: number;
  /** AI-generated warnings about the document (expired, illegible, etc.). */
  warnings: string[];
  /** What the AI thinks this document type is. */
  detectedDocType: string;
  /** Human-readable description of what the AI thinks this document is. */
  detectedDescription: string;
  /** The exact heading/phrase that identified this document type (e.g., "TRADE LICENSE"). */
  detectedKeyText?: string;
  /** Which area of the page the identifying text is in (3x3 grid position). */
  detectedKeyPosition?: string;

  // ── Enterprise Intelligence (populated from extracted data, no extra AI calls) ──

  /** Sanctions exposure flags from MDF KYC section — countries where merchant has business */
  sanctionsFlags?: Array<{ country: string; percentage?: string; goods?: string }>;
  /** PEP individual details from PEP declaration form */
  pepDetails?: Array<{ name: string; position: string; country: string; relationship: string; currentlyActive?: boolean }>;
  /** MRZ validation status from passport extraction */
  mrzValid?: boolean;
  /** Trade license number extracted from MDF for cross-document validation */
  tradeLicenseNumber?: string;
  /** IBAN extracted from document for cross-document validation */
  iban?: string;
  /** Document expiry date for freshness/validity display */
  documentExpiryDate?: string;
}

/** Full result returned from the /api/extract route. */
export interface AIExtractionResult {
  /** Parsed fields — shape matches the corresponding Parsed* interface. */
  data: Record<string, unknown>;
  /** Extraction metadata (confidence, completeness, signatures, etc.). */
  meta: AIExtractionMeta;
}
