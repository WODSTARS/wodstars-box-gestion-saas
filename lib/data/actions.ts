"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppSession, assertBoxAccess, canWrite } from "@/lib/auth/session";
import { modules, type ModuleKey } from "@/lib/data/tables";

function parseValue(value: FormDataEntryValue | null) {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  if (value === "") return null;
  if (!Number.isNaN(Number(value)) && value.trim() !== "" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=Credenciales%20incorrectas");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createRecord(moduleKey: ModuleKey, formData: FormData) {
  const session = await getAppSession();
  assertBoxAccess(session);
  if (!session.isSuperadmin && !canWrite(session.role)) throw new Error("No autorizado");
  if (!session.boxId) throw new Error("Sin box");

  const config = modules[moduleKey];
  const payload: Record<string, unknown> = { box_id: session.boxId };
  config.fields.forEach((field) => {
    if (field.type === "checkbox") payload[field.name] = formData.get(field.name) === "on";
    else payload[field.name] = parseValue(formData.get(field.name));
  });

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(config.table).insert(payload);
  if (error) throw new Error(error.message);
  revalidatePath(`/${moduleKey}`);
}

export async function deleteRecord(moduleKey: ModuleKey, id: string) {
  const session = await getAppSession();
  assertBoxAccess(session);
  if (!session.isSuperadmin && !canWrite(session.role)) throw new Error("No autorizado");

  const config = modules[moduleKey];
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(config.table).delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/${moduleKey}`);
}

export async function updateRecord(moduleKey: ModuleKey, id: string, formData: FormData) {
  const session = await getAppSession();
  assertBoxAccess(session);
  if (!session.isSuperadmin && !canWrite(session.role)) throw new Error("No autorizado");

  const config = modules[moduleKey];
  const payload: Record<string, unknown> = {};
  config.fields.forEach((field) => {
    if (field.name === "box_id") return;
    if (field.type === "checkbox") payload[field.name] = formData.get(field.name) === "on";
    else payload[field.name] = parseValue(formData.get(field.name));
  });

  const supabase = await createSupabaseServerClient();
  const query = supabase.from(config.table).update(payload).eq("id", id);
  const { error } = session.isSuperadmin || !session.boxId ? await query : await query.eq("box_id", session.boxId);
  if (error) throw new Error(error.message);
  revalidatePath(`/${moduleKey}`);
}

export async function updateBoxStatus(formData: FormData) {
  const session = await getAppSession();
  if (!session.isSuperadmin) throw new Error("Solo superadmin");
  const boxId = String(formData.get("box_id"));
  const subscription_status = String(formData.get("subscription_status"));
  const plan = String(formData.get("plan"));
  const subscription_due_date = String(formData.get("subscription_due_date") || "");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("boxes")
    .update({ subscription_status, plan, subscription_due_date: subscription_due_date || null })
    .eq("id", boxId);
  if (error) throw new Error(error.message);
  revalidatePath("/superadmin");
}

export async function createManualBackup() {
  const session = await getAppSession();
  assertBoxAccess(session);
  if (!session.boxId) throw new Error("Sin box");

  const supabase = await createSupabaseServerClient();
  const tables = [
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
  const payload: Record<string, unknown> = {
    box: session.box,
    generated_at: new Date().toISOString(),
    generated_by: session.userId
  };

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*").eq("box_id", session.boxId);
    payload[table] = error ? { error: error.message } : data;
  }

  const { error } = await supabase.from("backups").insert({
    box_id: session.boxId,
    label: `Respaldo manual ${new Date().toISOString().slice(0, 10)}`,
    payload,
    created_by: session.userId
  });

  if (error) throw new Error(error.message);
  revalidatePath("/settings");
}
