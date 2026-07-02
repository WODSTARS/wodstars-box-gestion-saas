import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/auth/session";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

function currency(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value || 0);
}

export default async function DashboardPage() {
  const session = await getAppSession();
  const supabase = await createSupabaseServerClient();
  const boxId = session.boxId!;
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const [
    members,
    payments,
    attendance,
    classes,
    inventory,
    tasks
  ] = await Promise.all([
    supabase.from("members").select("id,end_date,status").eq("box_id", boxId),
    supabase.from("payments").select("amount,date").eq("box_id", boxId).gte("date", `${month}-01`),
    supabase.from("attendance").select("id,date").eq("box_id", boxId).eq("date", today),
    supabase.from("classes").select("name,time,day,capacity").eq("box_id", boxId),
    supabase.from("inventory").select("equipment,status,maintenance_date").eq("box_id", boxId).neq("status", "Bueno"),
    supabase.from("tasks").select("title,priority,due_date,status").eq("box_id", boxId).neq("status", "completed")
  ]);

  const memberRows = members.data ?? [];
  const active = memberRows.filter((m) => m.status === "active").length;
  const expired = memberRows.filter((m) => new Date(m.end_date) < new Date(today)).length;
  const expiring = memberRows.filter((m) => {
    const days = Math.ceil((new Date(m.end_date).getTime() - new Date(today).getTime()) / 86400000);
    return days >= 0 && days <= 7;
  }).length;
  const income = (payments.data ?? []).reduce((sum, payment) => sum + Number(payment.amount), 0);
  const todayName = new Intl.DateTimeFormat("es-MX", { weekday: "long" }).format(new Date());
  const todayClasses = (classes.data ?? []).filter((item) => item.day.toLowerCase() === todayName.toLowerCase());

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Socios activos" value={active} detail={`${memberRows.length} socios totales`} />
        <KpiCard label="Vencidas" value={expired} detail="Requieren seguimiento" />
        <KpiCard label="Por vencer" value={expiring} detail="Próximos 7 días" />
        <KpiCard label="Ingresos del mes" value={currency(income)} detail="Pagos registrados" />
        <KpiCard label="Asistencia hoy" value={attendance.data?.length ?? 0} detail="Check-ins del día" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader><h3 className="font-black">Clases de hoy</h3></CardHeader>
          <CardBody className="grid gap-3">
            {todayClasses.length ? todayClasses.map((item) => (
              <div key={item.name + item.time} className="rounded-md border border-wod-line bg-black/20 p-3">
                <strong>{item.time} · {item.name}</strong>
                <p className="text-sm text-wod-muted">{item.capacity} lugares</p>
              </div>
            )) : <p className="text-wod-muted">No hay clases programadas para hoy.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h3 className="font-black">Alertas operativas</h3></CardHeader>
          <CardBody className="grid gap-3">
            {(inventory.data ?? []).map((item) => (
              <div key={item.equipment} className="rounded-md border border-wod-line bg-black/20 p-3">
                <strong>{item.equipment}</strong>
                <p className="text-sm text-wod-muted">{item.status} · mantenimiento {item.maintenance_date ?? "sin fecha"}</p>
              </div>
            ))}
            {(tasks.data ?? []).map((item) => (
              <div key={item.title} className="rounded-md border border-wod-line bg-black/20 p-3">
                <strong>{item.title}</strong>
                <p className="text-sm text-wod-muted">{item.priority} · vence {item.due_date ?? "sin fecha"}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
