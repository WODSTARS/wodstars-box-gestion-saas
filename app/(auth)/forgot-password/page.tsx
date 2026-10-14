"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsSubmitting(true);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { error: requestError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin
      });

      if (requestError) {
        setError("No se pudo enviar el correo. Intenta de nuevo en unos minutos.");
      } else {
        setMessage("Si el correo pertenece a una cuenta, recibirás un enlace para restablecer la contraseña.");
      }
    } catch {
      setError("No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
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
            <h1 className="mt-2 text-3xl font-black">Recuperar contraseña</h1>
            <p className="mt-2 text-wod-muted">Te enviaremos un enlace seguro para crear una contraseña nueva.</p>
          </div>

          {message ? <p role="status" className="mb-4 rounded-md border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm text-emerald-100">{message}</p> : null}
          {error ? <p role="alert" className="mb-4 rounded-md border border-wod-red bg-wod-red/10 p-3 text-sm text-red-100">{error}</p> : null}

          <form onSubmit={handleSubmit} className="grid gap-3">
            <label className="grid gap-2 text-sm font-bold" htmlFor="recovery-email">
              Email de tu cuenta
              <input
                id="recovery-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <Button variant="primary" className="mt-2" disabled={isSubmitting}>
              {isSubmitting ? "Enviando…" : "Enviar enlace de recuperación"}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <Link href="/login" className="font-semibold text-wod-gold underline-offset-4 hover:underline">Volver al acceso</Link>
          </div>
        </CardBody>
      </Card>
    </main>
  );
}
