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
}

/** Full result returned from the /api/extract route. */
export interface AIExtractionResult {
  /** Parsed fields — shape matches the corresponding Parsed* interface. */
  data: Record<string, unknown>;
  /** Extraction metadata (confidence, completeness, signatures, etc.). */
  meta: AIExtractionMeta;
}
