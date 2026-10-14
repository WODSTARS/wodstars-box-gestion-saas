"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) setHasRecoverySession(Boolean(data.session));
    });
    return () => { isMounted = false; };
  }, [supabase]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setIsSubmitting(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("El enlace venció o ya se utilizó. Solicita uno nuevo e inténtalo otra vez.");
      setIsSubmitting(false);
      return;
    }

    await supabase.auth.signOut();
    router.replace("/login?passwordUpdated=1");
    router.refresh();
  }

  return (
    <main className="grid min-h-screen place-items-center p-4">
      <Card className="w-full max-w-md">
        <CardBody>
          <div className="mb-6 text-center">
            <img
              src="/wodstar-logo-transparent.png"
              alt="WODSTARS Gestión"
              className="mx-auto mb-4 h-28 w-28 object-contain drop-shadow-[0_16px_32px_rgba(244,196,48,.22)]"
            />
            <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">WodStars Box Gestión</p>
            <h1 className="mt-2 text-3xl font-black">Crea una contraseña nueva</h1>
          </div>

          {hasRecoverySession === false ? (
            <div className="grid gap-4 text-center">
              <p role="alert" className="rounded-md border border-wod-red bg-wod-red/10 p-3 text-sm text-red-100">
                El enlace no es válido o venció. Solicita uno nuevo para continuar.
              </p>
              <Link href="/forgot-password" className="font-semibold text-wod-gold underline-offset-4 hover:underline">Solicitar otro enlace</Link>
            </div>
          ) : hasRecoverySession === null ? (
            <p role="status" className="text-center text-sm text-wod-muted">Validando el enlace…</p>
          ) : (
            <>
              {error ? <p role="alert" className="mb-4 rounded-md border border-wod-red bg-wod-red/10 p-3 text-sm text-red-100">{error}</p> : null}
              <form onSubmit={handleSubmit} className="grid gap-3">
                <label className="grid gap-2 text-sm font-bold" htmlFor="new-password">
                  Nueva contraseña
                  <input
                    id="new-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>
                <label className="grid gap-2 text-sm font-bold" htmlFor="confirm-password">
                  Confirmar contraseña
                  <input
                    id="confirm-password"
                    name="confirmation"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                  />
                </label>
                <Button variant="primary" className="mt-2" disabled={isSubmitting}>
                  {isSubmitting ? "Actualizando…" : "Guardar contraseña nueva"}
                </Button>
              </form>
            </>
          )}
        </CardBody>
      </Card>
    </main>
  );
}
