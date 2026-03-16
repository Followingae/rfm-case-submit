import { createSupabaseAdmin } from "./supabase-server";

type NotificationType = "case_submitted" | "case_approved" | "case_returned" | "case_escalated" | "case_assigned" | "expiry_warning" | "info";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  caseId?: string;
}

/**
 * Create a notification for a user. Uses service role to bypass RLS.
 */
export async function createNotification(params: CreateNotificationParams) {
  const admin = createSupabaseAdmin();
  const { error } = await admin.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    case_id: params.caseId || null,
  });
  if (error) console.warn("[Notifications] Failed to create:", error.message);
}

/**
 * Notify all users with a given role.
 */
export async function notifyRole(
  role: string,
  type: NotificationType,
  title: string,
  message: string,
  caseId?: string
) {
  const admin = createSupabaseAdmin();
  const { data: users } = await admin
    .from("profiles")
    .select("id")
    .eq("role", role)
    .eq("is_active", true);

  if (!users || users.length === 0) return;

  const rows = users.map((u) => ({
    user_id: u.id,
    type,
    title,
    message,
    case_id: caseId || null,
  }));

  const { error } = await admin.from("notifications").insert(rows);
  if (error) console.warn("[Notifications] Failed to notify role:", error.message);
}
