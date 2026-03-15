import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

interface ExpiryItem {
  caseId: string;
  merchantName: string;
  documentType: string;
  expiryDate: string;
  daysRemaining: number;
  alertLevel: "green" | "amber" | "red" | "critical";
}

function getAlertLevel(daysRemaining: number): ExpiryItem["alertLevel"] {
  if (daysRemaining < 0) return "critical";
  if (daysRemaining < 30) return "red";
  if (daysRemaining <= 90) return "amber";
  return "green";
}

/**
 * Parse dates that may be in DD/MM/YYYY, YYYY-MM-DD, or other formats.
 * Returns null if unparseable.
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();

  // DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!isNaN(d.getTime())) return d;
  }

  // YYYY-MM-DD (ISO)
  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  // Fallback
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

function daysUntil(dateStr: string): number | null {
  const target = parseDate(dateStr);
  if (!target) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(req: NextRequest) {
  const user = await requireAuth(["processing", "management", "superadmin"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServer();
  const url = new URL(req.url);
  const window = parseInt(url.searchParams.get("window") || "90");

  // Get active/exported/renewal_pending cases
  const { data: cases, error: casesError } = await supabase
    .from("cases")
    .select("id, legal_name")
    .in("status", ["approved", "exported", "active", "renewal_pending"]);

  if (casesError) {
    return NextResponse.json({ error: casesError.message }, { status: 500 });
  }

  if (!cases || cases.length === 0) {
    return NextResponse.json({ expiries: [] });
  }

  const caseIds = cases.map((c) => c.id);
  const caseMap = new Map(cases.map((c) => [c.id, c.legal_name]));

  // Fetch all expiry-bearing OCR tables in parallel
  const [tradeLicenses, passports, eids, vatCerts, tenancies] =
    await Promise.all([
      supabase
        .from("ocr_trade_license")
        .select("case_id, expiry_date")
        .in("case_id", caseIds),
      supabase
        .from("ocr_passport_data")
        .select("case_id, expiry_date")
        .in("case_id", caseIds),
      supabase
        .from("ocr_eid_data")
        .select("case_id, expiry_date")
        .in("case_id", caseIds),
      supabase
        .from("ocr_vat_cert")
        .select("case_id, expiry_date")
        .in("case_id", caseIds),
      supabase
        .from("ocr_tenancy")
        .select("case_id, expiry_date")
        .in("case_id", caseIds),
    ]);

  const expiries: ExpiryItem[] = [];

  const addExpiries = (
    rows: { case_id: string; expiry_date: string | null }[] | null,
    docType: string
  ) => {
    if (!rows) return;
    for (const row of rows) {
      if (!row.expiry_date) continue;
      const days = daysUntil(row.expiry_date);
      if (days === null) continue; // unparseable date, skip
      if (days > window && days >= 0) continue; // outside window, skip (but always include expired)
      const parsed = parseDate(row.expiry_date);
      expiries.push({
        caseId: row.case_id,
        merchantName: caseMap.get(row.case_id) || "",
        documentType: docType,
        expiryDate: parsed ? parsed.toISOString().slice(0, 10) : row.expiry_date,
        daysRemaining: days,
        alertLevel: getAlertLevel(days),
      });
    }
  };

  addExpiries(tradeLicenses.data, "Trade License");
  addExpiries(passports.data, "Passport");
  addExpiries(eids.data, "Emirates ID");
  addExpiries(vatCerts.data, "VAT Certificate");
  addExpiries(tenancies.data, "Tenancy Contract");

  // Sort by expiry date ascending (most urgent first)
  expiries.sort(
    (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
  );

  return NextResponse.json({ expiries });
}
