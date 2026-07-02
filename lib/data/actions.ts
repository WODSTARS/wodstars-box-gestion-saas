"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppSession, assertBoxAccess, canWrite } from "@/lib/auth/session";
import { modules, type ModuleKey } from "@/lib/data/tables";

type SupabaseServer = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function parseValue(value: FormDataEntryValue | null) {
  if (value === null) return null;
  if (typeof value !== "string") return null;
  if (value === "") return null;
  if (!Number.isNaN(Number(value)) && value.trim() !== "" && /^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function isUuid(value: unknown) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value ?? ""));
}

function sanitizePayload(payload: Record<string, unknown>) {
  if ("coach_id" in payload && !isUuid(payload.coach_id)) payload.coach_id = null;
  if ("member_id" in payload && payload.member_id !== null && !isUuid(payload.member_id)) payload.member_id = null;
  if ("class_id" in payload && payload.class_id !== null && !isUuid(payload.class_id)) payload.class_id = null;
  return payload;
}

async function decrementInventoryForProduct(supabase: SupabaseServer, boxId: string, product: unknown, quantity: unknown) {
  const productName = String(product ?? "").trim();
  const amount = Math.max(1, Number(quantity ?? 1));
  if (!productName || !Number.isFinite(amount)) return;

  const { data: item } = await supabase
    .from("inventory")
    .select("id, quantity")
    .eq("box_id", boxId)
    .ilike("equipment", productName)
    .limit(1)
    .maybeSingle();

  if (!item) return;

  const nextQuantity = Math.max(0, Number(item.quantity ?? 0) - amount);
  await supabase.from("inventory").update({ quantity: nextQuantity }).eq("id", item.id).eq("box_id", boxId);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
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
  sanitizePayload(payload);

  const supabase = await createSupabaseServerClient();
  const insertQuery = supabase.from(config.table).insert(payload);
  const result = moduleKey === "members" ? await insertQuery.select("id, name, monthly_amount, start_date").single() : await insertQuery;
  const { error } = result;
  if (error) throw new Error(error.message);
  if (moduleKey === "members") {
    const member = "data" in result ? result.data : null;
    const amount = Number(member?.monthly_amount ?? payload.monthly_amount ?? 0);
    if (amount > 0) {
      const paymentDate = String(member?.start_date ?? payload.start_date ?? new Date().toISOString().slice(0, 10));
      const { error: paymentError } = await supabase.from("payments").insert({
        box_id: session.boxId,
        member_id: member?.id ?? null,
        date: paymentDate,
        concept: `Mensualidad inicial - ${String(member?.name ?? payload.name ?? "Socio")}`,
        amount,
        method: "Sistema",
        notes: "Pago generado automaticamente al crear socio"
      });
      if (paymentError) throw new Error(paymentError.message);
      revalidatePath("/payments");
      revalidatePath("/dashboard");
    }
  }
  if (moduleKey === "sales") {
    await decrementInventoryForProduct(supabase, session.boxId, payload.product, payload.quantity);
    revalidatePath("/inventory");
  }
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
  sanitizePayload(payload);

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

export async function createBox(formData: FormData) {
  const session = await getAppSession();
  if (!session.isSuperadmin) throw new Error("Solo superadmin");

  const name = String(formData.get("name") || "").trim();
  const slug = slugify(String(formData.get("slug") || name));
  const email = String(formData.get("email") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const plan = String(formData.get("plan") || "starter").trim() || "starter";
  const subscription_due_date = String(formData.get("subscription_due_date") || "") || null;

  if (!name || !slug) throw new Error("Falta nombre o slug del box");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("boxes").insert({
    name,
    slug,
    email,
    phone,
    plan,
    subscription_status: "trial",
    subscription_due_date
  });
  if (error) throw new Error(error.message);
  revalidatePath("/superadmin");
  revalidatePath("/users");
}

export async function createPlatformUser(formData: FormData) {
  const session = await getAppSession();
  assertBoxAccess(session);
  if (!session.isSuperadmin && !canWrite(session.role)) throw new Error("No autorizado");

  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "coach");
  const requestedBoxId = String(formData.get("box_id") || "");
  const boxId = session.isSuperadmin ? requestedBoxId : session.boxId;

  if (!boxId) throw new Error("Selecciona un box");
  if (!fullName || !email || password.length < 6) throw new Error("Nombre, email y password de minimo 6 caracteres son obligatorios");
  if (!["owner", "admin", "reception", "coach"].includes(role)) throw new Error("Rol invalido");

  const admin = createSupabaseAdminClient();
  const { data, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName }
  });
  if (userError) throw new Error(userError.message);
  if (!data.user) throw new Error("No se pudo crear el usuario");

  const { error } = await admin.from("profiles").upsert({
    id: data.user.id,
    box_id: boxId,
    full_name: fullName,
    role,
    active: true,
    is_superadmin: false
  });
  if (error) throw new Error(error.message);

  revalidatePath("/users");
  revalidatePath("/superadmin");
}

export async function updatePlatformUser(id: string, formData: FormData) {
  const session = await getAppSession();
  assertBoxAccess(session);
  if (!session.isSuperadmin && !canWrite(session.role)) throw new Error("No autorizado");

  const role = String(formData.get("role") || "coach");
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const active = formData.get("active") === "on";
  const requestedBoxId = String(formData.get("box_id") || "");
  const boxId = session.isSuperadmin ? requestedBoxId : session.boxId;

  if (!boxId) throw new Error("Selecciona un box");
  if (!fullName) throw new Error("Falta nombre");
  if (!["owner", "admin", "reception", "coach"].includes(role)) throw new Error("Rol invalido");

  const admin = createSupabaseAdminClient();
  const updates: { email?: string; password?: string; user_metadata?: { full_name: string } } = {
    user_metadata: { full_name: fullName }
  };
  if (email) updates.email = email;
  if (password) {
    if (password.length < 6) throw new Error("La nueva contraseña debe tener minimo 6 caracteres");
    updates.password = password;
  }

  const { error: authError } = await admin.auth.admin.updateUserById(id, updates);
  if (authError) throw new Error(authError.message);

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("profiles")
    .update({ full_name: fullName, role, active, box_id: boxId })
    .eq("id", id);

  if (!session.isSuperadmin) query = query.eq("box_id", session.boxId);
  const { error } = await query;
  if (error) throw new Error(error.message);

  revalidatePath("/users");
  revalidatePath("/superadmin");
}

export async function deletePlatformUser(id: string) {
  const session = await getAppSession();
  assertBoxAccess(session);
  if (!session.isSuperadmin && !canWrite(session.role)) throw new Error("No autorizado");
  if (id === session.userId) throw new Error("No puedes eliminar tu propio usuario");

  const supabase = await createSupabaseServerClient();
  if (!session.isSuperadmin) {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("id, box_id, is_superadmin")
      .eq("id", id)
      .single();
    if (error || !profile || profile.box_id !== session.boxId || profile.is_superadmin) {
      throw new Error("No puedes eliminar este usuario");
    }
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);

  revalidatePath("/users");
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

export async function approveCreditRequest(id: string) {
  const session = await getAppSession();
  assertBoxAccess(session);
  if (!session.isSuperadmin && !canWrite(session.role)) throw new Error("No autorizado");
  if (!session.boxId) throw new Error("Sin box");

  const supabase = await createSupabaseServerClient();
  const { data: request, error: requestError } = await supabase
    .from("credit_requests")
    .select("id, box_id, member_id, inventory_id, product, quantity, unit_price, total, status")
    .eq("id", id)
    .eq("box_id", session.boxId)
    .single();

  if (requestError || !request) throw new Error(requestError?.message ?? "Fiado no encontrado");
  if (request.status !== "pending") throw new Error("Este fiado ya fue atendido");

  const { data: item, error: itemError } = await supabase
    .from("inventory")
    .select("id, quantity")
    .eq("id", request.inventory_id)
    .eq("box_id", session.boxId)
    .single();

  if (itemError || !item) throw new Error(itemError?.message ?? "Producto no encontrado");
  const nextQuantity = Number(item.quantity ?? 0) - Number(request.quantity ?? 1);
  if (nextQuantity < 0) throw new Error("No hay suficiente inventario para aprobar este fiado");

  const now = new Date().toISOString();
  const { error: inventoryError } = await supabase
    .from("inventory")
    .update({ quantity: nextQuantity })
    .eq("id", request.inventory_id)
    .eq("box_id", session.boxId);
  if (inventoryError) throw new Error(inventoryError.message);

  const { error: saleError } = await supabase.from("sales").insert({
    box_id: session.boxId,
    date: now.slice(0, 10),
    product: request.product,
    quantity: request.quantity,
    unit_price: request.unit_price,
    total: request.total,
    method: "Fiado",
    notes: `Fiado aprobado por ${session.fullName}`
  });
  if (saleError) throw new Error(saleError.message);

  const { error } = await supabase
    .from("credit_requests")
    .update({ status: "approved", approved_by: session.userId, approved_at: now })
    .eq("id", id)
    .eq("box_id", session.boxId);
  if (error) throw new Error(error.message);

  revalidatePath("/credit");
  revalidatePath("/sales");
  revalidatePath("/inventory");
}

export async function rejectCreditRequest(id: string) {
  const session = await getAppSession();
  assertBoxAccess(session);
  if (!session.isSuperadmin && !canWrite(session.role)) throw new Error("No autorizado");
  if (!session.boxId) throw new Error("Sin box");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("credit_requests")
    .update({ status: "rejected", approved_by: session.userId, approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("box_id", session.boxId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);

  revalidatePath("/credit");
}
