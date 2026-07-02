import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) return NextResponse.json({ error: "Mercado Pago no configurado" }, { status: 500 });

  const payload = await request.json();

  // Placeholder intencional: Mercado Pago puede enviar distintos eventos según Checkout Pro,
  // suscripciones o preapproval. Aquí se recibe el evento y se deja el punto único para mapear
  // preapproval_id -> subscriptions -> boxes.subscription_status.
  return NextResponse.json({ received: true, type: payload.type ?? payload.action ?? "unknown" });
}
