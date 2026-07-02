import { BarChart3 } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PrintButton } from "@/components/reports/print-button";
import { getAppSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function currency(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value || 0);
}

function mode(values: string[]) {
  const counts = new Map<string, number>();
  values.filter(Boolean).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Sin datos";
}

export default async function ReportsPage() {
  const session = await getAppSession();
  const supabase = await createSupabaseServerClient();
  const boxId = session.boxId;
  const month = new Date().toISOString().slice(0, 7);

  const [members, payments, sales, expenses, attendance, classes] = await Promise.all([
    supabase.from("members").select("id,plan,status,start_date,end_date").eq("box_id", boxId),
    supabase.from("payments").select("amount,date,method").eq("box_id", boxId),
    supabase.from("sales").select("total,date,method").eq("box_id", boxId),
    supabase.from("expenses").select("amount,date,category").eq("box_id", boxId),
    supabase.from("attendance").select("date,class_id").eq("box_id", boxId),
    supabase.from("classes").select("id,name,time").eq("box_id", boxId)
  ]);

  const memberRows = members.data ?? [];
  const paymentRows = payments.data ?? [];
  const saleRows = sales.data ?? [];
  const expenseRows = expenses.data ?? [];
  const attendanceRows = attendance.data ?? [];
  const classRows = classes.data ?? [];
  const income = paymentRows.filter((p) => p.date?.startsWith(month)).reduce((sum, p) => sum + Number(p.amount), 0);
  const salesIncome = saleRows.filter((s) => s.date?.startsWith(month)).reduce((sum, s) => sum + Number(s.total), 0);
  const costs = expenseRows.filter((e) => e.date?.startsWith(month)).reduce((sum, e) => sum + Number(e.amount), 0);
  const active = memberRows.filter((m) => m.status === "active").length;
  const retention = memberRows.length ? Math.round((active / memberRows.length) * 100) : 0;
  const mostSoldPlan = mode(memberRows.map((m) => String(m.plan ?? "")));
  const busiestClassId = mode(attendanceRows.map((a) => String(a.class_id ?? "")));
  const busiestClass = classRows.find((item) => item.id === busiestClassId);
  const busiestHour = mode(classRows.map((c) => String(c.time ?? "").slice(0, 5)));

  const metrics = [
    ["Ingresos", currency(income + salesIncome)],
    ["Gastos", currency(costs)],
    ["Utilidad", currency(income + salesIncome - costs)],
    ["Retencion", `${retention}%`],
    ["Socios activos", active],
    ["Asistencias", attendanceRows.length],
    ["Plan mas vendido", mostSoldPlan],
    ["Hora mas ocupada", busiestHour],
    ["Clase con mas asistencia", busiestClass?.name ?? "Sin datos"]
  ];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Business intelligence</p>
          <h1 className="text-4xl font-black">Reportes</h1>
          <p className="mt-1 text-wod-muted">Indicadores de ingresos, asistencia, retencion y operacion.</p>
        </div>
        <PrintButton />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([label, value]) => (
          <Card key={String(label)}>
            <CardBody>
              <BarChart3 className="mb-4 text-wod-gold" size={22} />
              <strong className="block text-2xl font-black text-wod-gold">{value}</strong>
              <p className="mt-2 text-sm text-wod-muted">{label}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><h2 className="font-black">Resumen ejecutivo {month}</h2></CardHeader>
        <CardBody className="grid gap-3 text-wod-muted">
          <p>El box genero {currency(income + salesIncome)} este mes, con utilidad estimada de {currency(income + salesIncome - costs)}.</p>
          <p>La retencion actual es de {retention}% y el plan mas vendido es {mostSoldPlan}.</p>
          <p>La hora mas ocupada registrada es {busiestHour}. Usa este dato para ajustar staff, cupos y horarios.</p>
        </CardBody>
      </Card>
    </div>
  );
}
