import { signIn } from "@/lib/data/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import Link from "next/link";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; passwordUpdated?: string }> }) {
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
          {params.passwordUpdated === "1" ? <div className="mb-4 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-100">Contraseña actualizada. Ya puedes iniciar sesión.</div> : null}
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
          <div className="mt-4 text-center text-sm">
            <Link href="/forgot-password" className="font-semibold text-wod-gold underline-offset-4 hover:underline">
              ¿Olvidaste tu contraseña?
            </Link>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
