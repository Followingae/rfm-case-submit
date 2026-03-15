import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { createSupabaseServer, createSupabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const user = await requireAuth(["superadmin"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data || [] });
}

export async function POST(req: NextRequest) {
  const user = await requireAuth(["superadmin"]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { email, password, fullName, role } = body;

  if (!email || !password || !fullName || !role) {
    return NextResponse.json(
      { error: "email, password, fullName, and role are required" },
      { status: 400 }
    );
  }

  const validRoles = ["superadmin", "sales", "processing", "management"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  // Use service role to create users (no self-signup)
  const adminClient = createSupabaseAdmin();

  const { data: authData, error: authError } =
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  return NextResponse.json({
    user: {
      id: authData.user.id,
      email,
      fullName,
      role,
    },
  });
}
