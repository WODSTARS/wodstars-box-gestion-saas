import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function markBoxSubscription(params: {
  boxId: string;
  status: "trial" | "active" | "past_due" | "suspended" | "cancelled";
  plan?: string;
  currentPeriodEnd?: string | null;
}) {
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("boxes")
    .update({
      subscription_status: params.status,
      plan: params.plan,
      subscription_due_date: params.currentPeriodEnd ? params.currentPeriodEnd.slice(0, 10) : null
    })
    .eq("id", params.boxId);
}
