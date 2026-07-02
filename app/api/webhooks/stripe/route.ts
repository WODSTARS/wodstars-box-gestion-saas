import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) return NextResponse.json({ error: "Stripe no configurado" }, { status: 500 });

  const stripe = new Stripe(key);
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Sin firma" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    const boxId = subscription.metadata?.box_id;
    if (boxId) {
      const status = subscription.status === "active" ? "active" : subscription.status === "past_due" ? "past_due" : subscription.status === "canceled" ? "cancelled" : "suspended";
      await supabase.from("boxes").update({ subscription_status: status }).eq("id", boxId);
      await supabase
        .from("subscriptions")
        .upsert({
          box_id: boxId,
          provider: "stripe",
          provider_subscription_id: subscription.id,
          provider_customer_id: String(subscription.customer),
          plan: subscription.items.data[0]?.price.nickname ?? "stripe",
          status,
          metadata: { stripe_status: subscription.status, event_id: event.id }
        }, { onConflict: "provider,provider_subscription_id" });
    }
  }

  return NextResponse.json({ received: true });
}
