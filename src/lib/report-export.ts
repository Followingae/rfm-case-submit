import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface ReportColumn {
  key: string;
  label: string;
}

// ── Column definitions per report type ──

const REPORT_COLUMNS: Record<string, ReportColumn[]> = {
  pipeline: [
    { key: "legalName", label: "Legal Name" },
    { key: "dba", label: "DBA" },
    { key: "caseType", label: "Case Type" },
    { key: "status", label: "Status" },
    { key: "readinessScore", label: "Readiness" },
    { key: "readinessTier", label: "Tier" },
    { key: "createdAt", label: "Created" },
    { key: "submittedAt", label: "Submitted" },
    { key: "reviewedAt", label: "Reviewed" },
    { key: "createdBy", label: "Created By" },
    { key: "assignedTo", label: "Assigned To" },
  ],
  "merchant-portfolio": [
    { key: "legalName", label: "Legal Name" },
    { key: "dba", label: "DBA" },
    { key: "caseType", label: "Case Type" },
    { key: "status", label: "Status" },
    { key: "onboardedDate", label: "Onboarded" },
    { key: "tlExpiry", label: "TL Expiry" },
    { key: "licenseNumber", label: "License No." },
    { key: "bankName", label: "Bank" },
    { key: "emirate", label: "Emirate" },
  ],
  team: [
    { key: "name", label: "Name" },
    { key: "role", label: "Role" },
    { key: "casesCreated", label: "Created" },
    { key: "casesSubmitted", label: "Submitted" },
    { key: "casesApproved", label: "Approved" },
    { key: "casesReturned", label: "Returned" },
    { key: "avgReadiness", label: "Avg Readiness" },
    { key: "approvalRate", label: "Approval %" },
    { key: "returnRate", label: "Return %" },
  ],
  expiry: [
    { key: "merchantName", label: "Merchant" },
    { key: "documentType", label: "Document" },
    { key: "expiryDate", label: "Expiry Date" },
    { key: "daysRemaining", label: "Days Left" },
    { key: "alertLevel", label: "Alert" },
  ],
  compliance: [
    { key: "merchantName", label: "Merchant" },
    { key: "issueType", label: "Issue Type" },
    { key: "details", label: "Details" },
  ],
  "rate-summary": [
    { key: "merchantName", label: "Merchant" },
    { key: "cardType", label: "Card Type" },
    { key: "posRate", label: "POS Rate" },
    { key: "ecomRate", label: "ECOM Rate" },
    { key: "premiumRate", label: "Premium Rate" },
    { key: "internationalRate", label: "International Rate" },
  ],
};

// ── Extract rows from API response ──

function extractRows(type: string, data: Record<string, unknown>): Record<string, unknown>[] {
  // The API returns different shapes per report type
  if (type === "team") {
    const sales = (data.salesPerformance as Record<string, unknown>[]) || [];
    const processors = (data.processorPerformance as Record<string, unknown>[]) || [];
    return [...sales, ...processors];
  }
  if (type === "compliance") {
    return (data.issues as Record<string, unknown>[]) || [];
  }
  // Most reports return a `rows` or top-level array
  if (Array.isArray(data)) return data;
  if (data.rows && Array.isArray(data.rows)) return data.rows as Record<string, unknown>[];
  if (data.cases && Array.isArray(data.cases)) return data.cases as Record<string, unknown>[];
  if (data.expiries && Array.isArray(data.expiries)) return data.expiries as Record<string, unknown>[];
  // Fallback: try to find any array property
  for (const val of Object.values(data)) {
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === "object") return val;
  }
  return [];
}

// ── Export as Excel ──

export function downloadExcel(type: string, data: Record<string, unknown>, fileName: string) {
  const columns = REPORT_COLUMNS[type] || [];
  const rows = extractRows(type, data);

  if (rows.length === 0) {
    // Create sheet with headers only
    const ws = XLSX.utils.aoa_to_sheet([columns.map((c) => c.label)]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf], { type: "application/octet-stream" }), fileName);
    return;
  }

  // Map rows to column order
  const sheetData = rows.map((row) =>
    columns.reduce<Record<string, unknown>>((acc, col) => {
      acc[col.label] = row[col.key] ?? "";
      return acc;
    }, {})
  );

  const ws = XLSX.utils.json_to_sheet(sheetData);

  // Auto-size columns
  const colWidths = columns.map((col) => {
    const maxLen = Math.max(
      col.label.length,
      ...rows.map((r) => String(r[col.key] ?? "").length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  saveAs(new Blob([buf], { type: "application/octet-stream" }), fileName);
}

// ── Export as CSV ──

export function downloadCSV(type: string, data: Record<string, unknown>, fileName: string) {
  const columns = REPORT_COLUMNS[type] || [];
  const rows = extractRows(type, data);

  const header = columns.map((c) => c.label).join(",");
  const body = rows.map((row) =>
    columns.map((col) => {
      const val = String(row[col.key] ?? "");
      // Escape commas and quotes
      return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(",")
  ).join("\n");

  const csv = header + "\n" + body;
  saveAs(new Blob([csv], { type: "text/csv;charset=utf-8" }), fileName);
}

// ── Export as JSON (existing behavior) ──

export function downloadJSON(data: Record<string, unknown>, fileName: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  saveAs(blob, fileName);
}
