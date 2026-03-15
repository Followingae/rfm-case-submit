import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const user = await requireAuth(["management", "superadmin"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServer();
  const url = new URL(req.url);
  const period = url.searchParams.get("period") || "week";

  const periodsCount = 12;
  const now = new Date();
  const periods: { start: Date; end: Date; label: string }[] = [];

  for (let i = periodsCount - 1; i >= 0; i--) {
    let start: Date;
    let end: Date;
    let label: string;

    if (period === "month") {
      start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
      label = start.toISOString().slice(0, 7); // YYYY-MM
    } else {
      // week
      const daysSinceMonday = (now.getDay() + 6) % 7;
      start = new Date(now);
      start.setDate(now.getDate() - daysSinceMonday - i * 7);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      label = start.toISOString().slice(0, 10); // YYYY-MM-DD (week start)
    }

    periods.push({ start, end, label });
  }

  const rangeStart = periods[0].start.toISOString();
  const rangeEnd = periods[periods.length - 1].end.toISOString();

  // Fetch cases and status history within the full range
  const [casesRes, historyRes] = await Promise.all([
    supabase
      .from("cases")
      .select("id, created_at, status")
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
    supabase
      .from("case_status_history")
      .select("case_id, to_status, created_at")
      .in("to_status", ["submitted", "approved"])
      .gte("created_at", rangeStart)
      .lte("created_at", rangeEnd),
  ]);

  const cases = casesRes.data || [];
  const history = historyRes.data || [];

  const result = periods.map((p) => {
    const inPeriod = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= p.start && d <= p.end;
    };

    const created = cases.filter((c) => inPeriod(c.created_at)).length;
    const submitted = history.filter(
      (h) => h.to_status === "submitted" && inPeriod(h.created_at)
    ).length;
    const approved = history.filter(
      (h) => h.to_status === "approved" && inPeriod(h.created_at)
    ).length;

    return { period: p.label, created, submitted, approved };
  });

  return NextResponse.json({ timeseries: result });
}
