import { createSupabaseServer } from "./supabase-server";

export type UserRole = "superadmin" | "sales" | "processing" | "management";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

/**
 * Validate the current session and optionally check role.
 * Returns the authenticated user or null if unauthorized.
 */
export async function requireAuth(
  allowedRoles?: UserRole[]
): Promise<AuthUser | null> {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, is_active")
    .eq("id", user.id)
    .single();

  if (!profile || !profile.is_active) return null;

  if (allowedRoles && !allowedRoles.includes(profile.role as UserRole)) {
    return null;
  }

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as UserRole,
  };
}
