import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const backupTables = [
  "members",
  "payments",
  "sales",
  "expenses",
  "attendance",
  "classes",
  "wods",
  "staff",
  "inventory",
  "tasks"
];

export async function GET(request: Request) {
  const expectedSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: boxes, error: boxesError } = await supabase
    .from("boxes")
    .select("id, name, subscription_status")
    .in("subscription_status", ["trial", "active", "past_due"]);

  if (boxesError) {
    return NextResponse.json({ error: boxesError.message }, { status: 500 });
  }

  const created: Array<{ box_id: string; label: string }> = [];

  for (const box of boxes ?? []) {
    const payload: Record<string, unknown> = {
      box,
      generated_at: new Date().toISOString()
    };

    for (const table of backupTables) {
      const { data, error } = await supabase.from(table).select("*").eq("box_id", box.id);
      payload[table] = error ? { error: error.message } : data;
    }

    const label = `Respaldo automático ${new Date().toISOString().slice(0, 10)}`;
    const { error } = await supabase.from("backups").insert({
      box_id: box.id,
      label,
      payload
    });

    if (!error) created.push({ box_id: box.id, label });
  }

  return NextResponse.json({ ok: true, created });
}
