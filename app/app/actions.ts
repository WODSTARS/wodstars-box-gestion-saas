"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

function backToApp(email: string, status: string): never {
  redirect(`/app?email=${encodeURIComponent(email)}&status=${encodeURIComponent(status)}`);
}

function isMembershipCurrent(member: { status: string; end_date?: string | null }) {
  const today = new Date().toISOString().slice(0, 10);
  if (member.status === "paused" || member.status === "expired") return false;
  if (member.end_date && member.end_date < today) return false;
  return true;
}

export async function reserveClass(formData: FormData) {
  const memberId = String(formData.get("member_id") || "");
  const classId = String(formData.get("class_id") || "");
  const date = String(formData.get("date") || "");
  const time = String(formData.get("time") || "");
  const email = String(formData.get("email") || "");

  if (!memberId || !classId || !date || !time || !email) {
    backToApp(email, "missing");
  }

  const supabase = createSupabaseAdminClient();

  const { data: member } = await supabase
    .from("members")
    .select("id, box_id, status, end_date")
    .eq("id", memberId)
    .single();

  if (!member || !isMembershipCurrent(member)) {
    backToApp(email, "inactive");
  }

  const { data: classRow } = await supabase
    .from("classes")
    .select("id, box_id, capacity")
    .eq("id", classId)
    .single();

  if (!classRow || classRow.box_id !== member.box_id) {
    backToApp(email, "invalid");
  }

  const { data: existing } = await supabase
    .from("attendance")
    .select("id")
    .eq("member_id", memberId)
    .eq("class_id", classId)
    .eq("date", date)
    .maybeSingle();

  if (existing) {
    backToApp(email, "already");
  }

  const { count } = await supabase
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("class_id", classId)
    .eq("date", date);

  if ((count ?? 0) >= Number(classRow.capacity ?? 0)) {
    backToApp(email, "full");
  }

  const { error } = await supabase.from("attendance").insert({
    box_id: member.box_id,
    member_id: memberId,
    class_id: classId,
    date,
    time
  });

  if (error) {
    backToApp(email, "error");
  }

  backToApp(email, "reserved");
}

export async function requestCredit(formData: FormData) {
  const memberId = String(formData.get("member_id") || "");
  const inventoryId = String(formData.get("inventory_id") || "");
  const email = String(formData.get("email") || "");
  const quantity = Math.max(1, Number(formData.get("quantity") || 1));

  if (!memberId || !inventoryId || !email) {
    backToApp(email, "credit_missing");
  }

  const supabase = createSupabaseAdminClient();
  const { data: member } = await supabase
    .from("members")
    .select("id, box_id, status, end_date")
    .eq("id", memberId)
    .single();

  if (!member || !isMembershipCurrent(member)) {
    backToApp(email, "inactive");
  }

  const { data: item } = await supabase
    .from("inventory")
    .select("id, box_id, equipment, quantity, estimated_cost")
    .eq("id", inventoryId)
    .single();

  if (!item || item.box_id !== member.box_id) {
    backToApp(email, "credit_invalid");
  }

  if (Number(item.quantity ?? 0) < quantity) {
    backToApp(email, "credit_stock");
  }

  const unitPrice = Number(item.estimated_cost ?? 0);
  const { error } = await supabase.from("credit_requests").insert({
    box_id: member.box_id,
    member_id: member.id,
    inventory_id: item.id,
    product: item.equipment,
    quantity,
    unit_price: unitPrice,
    total: unitPrice * quantity,
    status: "pending"
  });

  if (error) {
    backToApp(email, "credit_error");
  }

  backToApp(email, "credit_requested");
}

export async function submitPersonalRecord(formData: FormData) {
  const memberId = String(formData.get("member_id") || "");
  const email = String(formData.get("email") || "");
  const movement = String(formData.get("movement") || "").trim();
  const value = Number(formData.get("value") || 0);
  const unit = String(formData.get("unit") || "kg").trim() || "kg";
  const recordDate = String(formData.get("record_date") || new Date().toISOString().slice(0, 10));
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!memberId || !email || !movement || !Number.isFinite(value) || value <= 0) {
    backToApp(email, "pr_missing");
  }

  const supabase = createSupabaseAdminClient();
  const { data: member } = await supabase
    .from("members")
    .select("id, box_id, status, end_date")
    .eq("id", memberId)
    .single();

  if (!member || !isMembershipCurrent(member)) {
    backToApp(email, "inactive");
  }

  const { error } = await supabase.from("personal_records").insert({
    box_id: member.box_id,
    member_id: member.id,
    movement,
    value,
    unit,
    record_date: recordDate,
    notes
  });

  if (error) {
    backToApp(email, "pr_error");
  }

  backToApp(email, "pr_saved");
}
