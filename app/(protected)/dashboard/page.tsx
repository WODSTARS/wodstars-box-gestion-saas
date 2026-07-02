import Link from "next/link";
import { Activity, AlertTriangle, CalendarDays, Dumbbell, Mail, Plus, Sparkles, Users, WalletCards } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/auth/session";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type MemberRow = {
  id: string;
  name: string;
  photo_url: string | null;
  plan: string;
  monthly_amount: number;
  start_date: string;
  end_date: string;
  status: string;
  email: string | null;
  phone: string | null;
};

function currency(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value || 0);
}

function dayDiff(date: string) {
  const today = new Date().toISOString().slice(0, 10);
  return Math.ceil((new Date(`${date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
}

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function mailto(member: MemberRow) {
  const subject = "Renovacion de membresia WODSTARS";
  const body = `Hola ${member.name}, tu membresia vence el ${member.end_date}. Responde este correo o pasa a recepcion para renovarla.`;
  return `mailto:${member.email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export default async function DashboardPage() {
  const session = await getAppSession();
  const supabase = await createSupabaseServerClient();
  const boxId = session.boxId;

  if (!boxId) {
    return (
      <Card>
        <CardHeader><h3 className="font-black">Sin box asignado</h3></CardHeader>
        <CardBody><p className="text-wod-muted">Tu usuario no tiene un box asignado.</p></CardBody>
      </Card>
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);
  const todayName = new Intl.DateTimeFormat("es-MX", { weekday: "long" }).format(new Date());

  const [members, payments, sales, expenses, attendance, classes, inventory, tasks] = await Promise.all([
    supabase.from("members").select("id,name,photo_url,plan,monthly_amount,start_date,end_date,status,email,phone").eq("box_id", boxId),
    supabase.from("payments").select("amount,date,method").eq("box_id", boxId),
    supabase.from("sales").select("total,date,method").eq("box_id", boxId),
    supabase.from("expenses").select("amount,date,category").eq("box_id", boxId),
    supabase.from("attendance").select("id,date,class_id").eq("box_id", boxId),
    supabase.from("classes").select("id,name,type,day,time,capacity,location").eq("box_id", boxId).order("time", { ascending: true }),
    supabase.from("inventory").select("equipment,status,maintenance_date").eq("box_id", boxId).neq("status", "Bueno"),
    supabase.from("tasks").select("title,priority,due_date,status").eq("box_id", boxId).neq("status", "completed")
  ]);

  const memberRows = (members.data ?? []) as MemberRow[];
  const paymentRows = payments.data ?? [];
  const saleRows = sales.data ?? [];
  const expenseRows = expenses.data ?? [];
  const attendanceRows = attendance.data ?? [];
  const classRows = classes.data ?? [];
  const active = memberRows.filter((m) => m.status === "active").length;
  const expiring = memberRows.filter((m) => dayDiff(m.end_date) >= 0 && dayDiff(m.end_date) <= 7);
  const expired = memberRows.filter((m) => dayDiff(m.end_date) < 0);
  const monthIncome = paymentRows.filter((p) => p.date?.startsWith(month)).reduce((sum, p) => sum + Number(p.amount), 0);
  const monthSales = saleRows.filter((s) => s.date?.startsWith(month)).reduce((sum, s) => sum + Number(s.total), 0);
  const monthExpenses = expenseRows.filter((e) => e.date?.startsWith(month)).reduce((sum, e) => sum + Number(e.amount), 0);
  const totalIncome = monthIncome + monthSales;
  const net = totalIncome - monthExpenses;
  const todayAttendance = attendanceRows.filter((a) => a.date === today).length;
  const todayClasses = classRows.filter((item) => String(item.day ?? "").toLowerCase() === todayName.toLowerCase());
  const attendanceRate = active ? Math.min(100, Math.round((todayAttendance / active) * 100)) : 0;

  const chart = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const key = date.toISOString().slice(0, 7);
    const value =
      paymentRows.filter((p) => p.date?.startsWith(key)).reduce((sum, p) => sum + Number(p.amount), 0) +
      saleRows.filter((s) => s.date?.startsWith(key)).reduce((sum, s) => sum + Number(s.total), 0);
    return { key, label: key.slice(5), value };
  });
  const maxChart = Math.max(...chart.map((item) => item.value), 1);
  const highlighted = [...memberRows].sort((a, b) => dayDiff(a.end_date) - dayDiff(b.end_date)).slice(0, 4);
  const alerts = [
    ...expired.map((m) => `${m.name} tiene membresia vencida.`),
    ...expiring.map((m) => `${m.name} vence en ${dayDiff(m.end_date)} dias.`),
    ...(inventory.data ?? []).map((i) => `Inventario: ${i.equipment} esta en estado ${i.status}.`),
    ...(tasks.data ?? []).slice(0, 3).map((t) => `Tarea: ${t.title} vence ${t.due_date ?? "sin fecha"}.`)
  ].slice(0, 8);

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Socios activos", value: active, detail: `${expiring.length} por vencer`, icon: Users },
          { label: "Ingresos este mes", value: currency(totalIncome), detail: `Neto ${currency(net)}`, icon: WalletCards },
          { label: "Asistencia hoy", value: todayAttendance, detail: `${attendanceRate}% de socios activos`, icon: Activity },
          { label: "Membresias vencidas", value: expired.length, detail: "Requieren seguimiento", icon: AlertTriangle }
        ].map((item) => (
          <Card key={item.label} className="overflow-hidden">
            <CardBody>
              <div className="mb-4 flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-md bg-wod-gold text-black">
                  <item.icon size={20} />
                </div>
                <span className="rounded-full border border-wod-line px-2 py-1 text-xs text-wod-muted">Live</span>
              </div>
              <strong className="block text-3xl font-black text-wod-gold">{item.value}</strong>
              <p className="mt-2 text-sm text-wod-muted">{item.label}</p>
              <div className="mt-4 h-2 rounded-full bg-wod-line">
                <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-wod-gold via-wod-green to-wod-blue" />
              </div>
              <p className="mt-2 text-xs text-wod-muted">{item.detail}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_.6fr]">
        <Card>
          <CardHeader>
            <h3 className="font-black">Pulso financiero</h3>
            <span className="rounded-full bg-wod-gold px-3 py-1 text-xs font-black text-black">Live</span>
          </CardHeader>
          <CardBody>
            <div className="flex min-h-72 items-end gap-3">
              {chart.map((item) => (
                <div key={item.key} className="grid flex-1 content-end gap-2 text-center text-xs text-wod-muted">
                  <div
                    className="min-h-4 rounded-t-md bg-gradient-to-t from-[#8f6f12] to-wod-gold shadow-[0_0_24px_rgba(244,196,48,.18)]"
                    style={{ height: `${Math.max(18, (item.value / maxChart) * 220)}px` }}
                  />
                  <span>{item.label}</span>
                  <small>{currency(item.value)}</small>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-black">IA operativa</h3>
            <Sparkles className="text-wod-gold" size={18} />
          </CardHeader>
          <CardBody className="grid gap-3">
            {[
              ["Retencion", `${active ? Math.round((active / Math.max(memberRows.length, 1)) * 100) : 0}% de socios activos.`],
              ["Riesgo", `${expired.length + expiring.length} socios requieren seguimiento automatico.`],
              ["Hora fuerte", todayClasses[0] ? `${todayClasses[0].name} concentra el primer bloque del dia.` : "Sin clases programadas hoy."],
              ["Siguiente accion", "Enviar recordatorios y revisar planes proximos a vencer."]
            ].map(([title, detail]) => (
              <div key={title} className="rounded-md border border-wod-line bg-black/20 p-3">
                <strong className="text-wod-gold">{title}</strong>
                <p className="mt-1 text-sm text-wod-muted">{detail}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h3 className="font-black">Atletas destacados</h3>
          <Link href="/members" className="rounded-full bg-wod-blue px-3 py-1 text-xs font-black text-black">perfil 360</Link>
        </CardHeader>
        <CardBody className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {highlighted.map((member) => (
            <div key={member.id} className="grid grid-cols-[64px_1fr] gap-3 rounded-md border border-wod-line bg-black/20 p-3">
              <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full border border-wod-gold/50 bg-gradient-to-br from-wod-gold to-wod-blue font-black text-black">
                {member.photo_url ? <img src={member.photo_url} alt={member.name} className="h-full w-full object-cover" /> : initials(member.name)}
              </div>
              <div>
                <strong>{member.name}</strong>
                <p className="text-sm text-wod-muted">{member.plan} · {dayDiff(member.end_date)} dias</p>
                {member.email ? (
                  <a href={mailto(member)} className="mt-2 inline-flex items-center gap-1 text-xs font-black text-wod-gold">
                    <Mail size={13} /> Recordar pago
                  </a>
                ) : null}
              </div>
            </div>
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <Card>
          <CardHeader>
            <h3 className="font-black">Clases de hoy</h3>
            <Link href="/classes" className="rounded-md border border-wod-line bg-wod-panel2 px-3 py-2 text-sm font-black hover:border-wod-gold hover:text-wod-gold">Nueva clase</Link>
          </CardHeader>
          <CardBody className="grid gap-3">
            {todayClasses.length ? todayClasses.map((item) => {
              const used = attendanceRows.filter((a) => a.date === today && a.class_id === item.id).length;
              const pct = Math.min(100, Math.round((used / Math.max(Number(item.capacity ?? 1), 1)) * 100));
              return (
                <div key={item.id} className="rounded-md border border-wod-line bg-black/20 p-3">
                  <strong>{String(item.time).slice(0, 5)} · {item.name}</strong>
                  <p className="mt-1 text-sm text-wod-muted">{item.type} · {item.location ?? "Box"}</p>
                  <div className="mt-3 h-2 rounded-full bg-wod-line"><div className="h-full rounded-full bg-wod-blue" style={{ width: `${pct}%` }} /></div>
                  <p className="mt-1 text-sm text-wod-muted">{used}/{item.capacity} lugares usados</p>
                </div>
              );
            }) : <p className="text-wod-muted">No hay clases programadas para hoy.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-black">Acciones rapidas</h3></CardHeader>
          <CardBody className="grid gap-3">
            <Link href="/attendance" className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-wod-gold bg-wod-gold px-3 text-sm font-black text-black transition hover:bg-[#ffdc5a]">
              <Activity size={16} /> Registrar asistencia
            </Link>
            <Link href="/payments" className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-wod-line bg-wod-panel2 px-3 text-sm font-black transition hover:border-wod-gold hover:text-wod-gold">
              <WalletCards size={16} /> Registrar pago
            </Link>
            <Link href="/wods" className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-wod-line bg-wod-panel2 px-3 text-sm font-black transition hover:border-wod-gold hover:text-wod-gold">
              <Dumbbell size={16} /> Programar WOD
            </Link>
            <Link href="/tasks" className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-wod-line bg-wod-panel2 px-3 text-sm font-black transition hover:border-wod-gold hover:text-wod-gold">
              <Plus size={16} /> Nueva tarea
            </Link>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><h3 className="font-black">Alertas</h3></CardHeader>
        <CardBody className="grid gap-2">
          {alerts.length ? alerts.map((alert) => <p key={alert} className="text-sm text-wod-muted">· {alert}</p>) : <p className="text-wod-muted">Sin alertas criticas.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
