import Link from "next/link";
import { Activity, BarChart3, CalendarDays, ClipboardList, Dumbbell, Home, Package, ReceiptText, Settings, Shield, ShoppingCart, Smartphone, Users, WalletCards } from "lucide-react";
import { signOut } from "@/lib/data/actions";
import type { AppSession } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Panel", icon: Home },
  { href: "/members", label: "Socios", icon: Users },
  { href: "/attendance", label: "Asistencia", icon: Activity },
  { href: "/payments", label: "Pagos", icon: WalletCards },
  { href: "/sales", label: "Ventas", icon: ShoppingCart },
  { href: "/expenses", label: "Gastos", icon: ReceiptText },
  { href: "/classes", label: "Clases", icon: CalendarDays },
  { href: "/wods", label: "WODs", icon: Dumbbell },
  { href: "/staff", label: "Staff", icon: Shield },
  { href: "/inventory", label: "Inventario", icon: Package },
  { href: "/tasks", label: "Tareas", icon: ClipboardList },
  { href: "/app", label: "App atletas", icon: Smartphone },
  { href: "/settings", label: "Ajustes", icon: Settings }
];

export function Sidebar({ session }: { session: AppSession }) {
  return (
    <aside className="sticky top-0 h-screen w-72 border-r border-wod-line bg-black/50 p-4 backdrop-blur">
      <div className="mb-6 border-b border-wod-line pb-4">
        <img
          src="/wodstar-logo-transparent.png"
          alt="WODSTARS Gestion"
          className="mb-3 h-16 w-16 object-contain drop-shadow-[0_12px_28px_rgba(244,196,48,.24)]"
        />
        <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">WodStars Box</p>
        <h1 className="mt-1 text-xl font-black">{session.box?.name ?? "Superadmin"}</h1>
        <p className="mt-1 text-sm text-wod-muted">powered by WodStars</p>
      </div>

      <nav className="grid gap-1">
        {nav.map((item) => (
          <Link key={item.href} href={item.href} className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold text-wod-muted transition hover:bg-wod-panel2 hover:text-wod-gold">
            <item.icon size={18} />
            {item.label}
          </Link>
        ))}
        {session.isSuperadmin ? (
          <Link href="/superadmin" className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-bold text-wod-gold transition hover:bg-wod-panel2">
            <BarChart3 size={18} />
            Superadmin
          </Link>
        ) : null}
      </nav>

      <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-wod-line bg-wod-panel p-3">
        <p className="font-black">{session.fullName}</p>
        <p className="mb-3 text-sm text-wod-muted">{session.role}</p>
        <form action={signOut}>
          <Button className="w-full">Cerrar sesión</Button>
        </form>
      </div>
    </aside>
  );
}
