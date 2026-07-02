import { Sidebar } from "@/components/layout/sidebar";
import { getAppSession, assertBoxAccess } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();
  assertBoxAccess(session);

  return (
    <div className="flex min-h-screen">
      <Sidebar session={session} />
      <main className="min-w-0 flex-1 p-6">
        {session.box?.status === "past_due" ? (
          <div className="mb-4 rounded-lg border border-yellow-400/50 bg-yellow-400/10 p-4 text-yellow-100">
            <strong>Tu suscripción está vencida.</strong> Regulariza tu pago para evitar suspensión.
          </div>
        ) : null}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Sistema operativo del box</p>
            <h2 className="text-3xl font-black">WodStars Box Gestión</h2>
          </div>
          <Badge tone={session.box?.status === "active" ? "green" : "gold"}>{session.box?.status}</Badge>
        </div>
        {children}
      </main>
    </div>
  );
}
