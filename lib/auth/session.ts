import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SubscriptionStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled";
export type UserRole = "owner" | "admin" | "reception" | "coach";

export type AppSession = {
  userId: string;
  boxId: string | null;
  fullName: string;
  role: UserRole;
  isSuperadmin: boolean;
  box: {
    id: string;
    name: string;
    status: SubscriptionStatus;
    plan: string;
    dueDate: string | null;
  } | null;
};

export async function getAppSession(): Promise<AppSession> {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, box_id, full_name, role, is_superadmin, active")
    .eq("id", user.id)
    .single();

  if (error || !profile || !profile.active) redirect("/login");

  let box = null;
  if (profile.box_id) {
    const { data } = await supabase
      .from("boxes")
      .select("id, name, subscription_status, plan, subscription_due_date")
      .eq("id", profile.box_id)
      .single();
    if (data) {
      box = {
        id: data.id,
        name: data.name,
        status: data.subscription_status as SubscriptionStatus,
        plan: data.plan,
        dueDate: data.subscription_due_date
      };
    }
  }

  return {
    userId: user.id,
    boxId: profile.box_id,
    fullName: profile.full_name,
    role: profile.role as UserRole,
    isSuperadmin: profile.is_superadmin,
    box
  };
}

export function assertBoxAccess(session: AppSession) {
  if (session.isSuperadmin) return;
  if (!session.box) redirect("/blocked");
  if (session.box.status === "suspended" || session.box.status === "cancelled") {
    redirect("/blocked");
  }
}

export function canWrite(role: UserRole) {
  return role === "owner" || role === "admin" || role === "reception";
}
