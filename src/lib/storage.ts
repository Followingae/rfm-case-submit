import { CaseSubmission, OCRData } from "./types";

const CASES_KEY = "rfm_cases";

export function saveCaseSubmission(caseData: CaseSubmission): void {
  const cases = getAllCases();
  const existingIndex = cases.findIndex((c) => c.id === caseData.id);
  if (existingIndex >= 0) {
    cases[existingIndex] = caseData;
  } else {
    cases.push(caseData);
  }
  localStorage.setItem(CASES_KEY, JSON.stringify(cases));
}

export function getAllCases(): CaseSubmission[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(CASES_KEY);
  return data ? JSON.parse(data) : [];
}

export function getCaseById(id: string): CaseSubmission | null {
  const cases = getAllCases();
  return cases.find((c) => c.id === id) || null;
}

export function saveOCRData(caseId: string, ocrData: OCRData): void {
  const key = `rfm_ocr_${caseId}`;
  localStorage.setItem(key, JSON.stringify(ocrData));
}

export function getOCRData(caseId: string): OCRData | null {
  if (typeof window === "undefined") return null;
  const data = localStorage.getItem(`rfm_ocr_${caseId}`);
  return data ? JSON.parse(data) : null;
}
