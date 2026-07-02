import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";

export default async function BlockedPage() {
  const session = await getAppSession();
  const paymentLink = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK || process.env.NEXT_PUBLIC_MERCADO_PAGO_PAYMENT_LINK || "#";

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-xl">
        <CardBody>
          <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Acceso bloqueado</p>
          <h1 className="mt-2 text-3xl font-black">{session.box?.name ?? "Box"} está suspendido</h1>
          <p className="mt-3 text-wod-muted">
            El estado de suscripción actual es <strong>{session.box?.status ?? "sin box"}</strong>. Regulariza el pago o contacta a soporte WodStars.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={paymentLink}><Button variant="primary">Pagar suscripción</Button></Link>
            <a href="mailto:soporte@wodstars.mx"><Button>Contactar soporte</Button></a>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
