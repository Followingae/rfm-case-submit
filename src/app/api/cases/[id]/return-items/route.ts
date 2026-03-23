import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("case_return_items")
    .select("*, creator:profiles!case_return_items_created_by_fkey(full_name)")
    .eq("case_id", id)
    .order("return_number", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireAuth();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { itemId, resolved } = body as { itemId: string; resolved: boolean };

  if (!itemId) {
    return NextResponse.json({ error: "itemId required" }, { status: 400 });
  }

  const supabase = await createSupabaseServer();

  const { error } = await supabase
    .from("case_return_items")
    .update({
      resolved,
      resolved_at: resolved ? new Date().toISOString() : null,
    })
    .eq("id", itemId)
    .eq("case_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
