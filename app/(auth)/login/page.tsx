import { signIn } from "@/lib/data/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardBody>
          <div className="mb-6 text-center">
            <img
              src="/wodstar-logo-transparent.png"
              alt="WODSTARS Gestion"
              className="mx-auto mb-4 h-28 w-28 object-contain drop-shadow-[0_16px_32px_rgba(244,196,48,.22)]"
            />
            <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">WodStars Box Gestión</p>
            <h1 className="mt-2 text-3xl font-black">Acceso al box</h1>
            <p className="mt-2 text-wod-muted">Login en la nube con Supabase Auth.</p>
          </div>
          {params.error ? <div className="mb-4 rounded-md border border-wod-red bg-wod-red/10 p-3 text-sm text-red-100">{params.error}</div> : null}
          <form action={signIn} className="grid gap-3">
            <label className="grid gap-2 text-sm font-bold">
              Email
              <input name="email" type="email" required />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Contraseña
              <input name="password" type="password" required />
            </label>
            <Button variant="primary" className="mt-2">Entrar</Button>
          </form>
        </CardBody>
      </Card>
    </main>
  );
}
