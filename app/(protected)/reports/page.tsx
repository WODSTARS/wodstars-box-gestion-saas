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
    supabase.from("payments").select("amount,date,method,concept,notes").eq("box_id", boxId).order("date", { ascending: false }),
    supabase.from("sales").select("total,date,method,product,quantity").eq("box_id", boxId).order("date", { ascending: false }),
    supabase.from("expenses").select("amount,date,category,concept,method").eq("box_id", boxId).order("date", { ascending: false }),
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
  const monthlyPayments = paymentRows.filter((p) => p.date?.startsWith(month));
  const monthlySales = saleRows.filter((s) => s.date?.startsWith(month));
  const monthlyExpenses = expenseRows.filter((e) => e.date?.startsWith(month));
  const expenseByCategory = [...monthlyExpenses.reduce((map, item) => {
    const key = String(item.category ?? "Sin categoria");
    map.set(key, (map.get(key) ?? 0) + Number(item.amount ?? 0));
    return map;
  }, new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]);

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

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-black">Gastos por categoria</h2>
            <span className="text-sm text-wod-muted">{currency(costs)} total</span>
          </CardHeader>
          <CardBody className="grid gap-3">
            {expenseByCategory.length ? expenseByCategory.map(([category, amount]) => (
              <div key={category} className="rounded-md border border-wod-line bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong>{category}</strong>
                  <span className="font-black text-wod-gold">{currency(amount)}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-wod-line">
                  <div className="h-full rounded-full bg-wod-gold" style={{ width: `${Math.min(100, Math.round((amount / Math.max(costs, 1)) * 100))}%` }} />
                </div>
              </div>
            )) : <p className="text-wod-muted">Sin gastos registrados este mes.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-black">Corte financiero</h2>
            <span className="text-sm text-wod-muted">{month}</span>
          </CardHeader>
          <CardBody className="grid gap-3">
            {[
              ["Pagos de mensualidad", income],
              ["Ventas de productos", salesIncome],
              ["Gastos", costs],
              ["Utilidad estimada", income + salesIncome - costs]
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-md border border-wod-line bg-black/20 p-3">
                <span className="text-wod-muted">{label}</span>
                <strong className="text-wod-gold">{currency(Number(value))}</strong>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-black">Detalle de gastos</h2>
          <span className="text-sm text-wod-muted">{monthlyExpenses.length} registros</span>
        </CardHeader>
        <CardBody className="overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-wod-line text-left text-wod-gold">
                <th className="p-3 uppercase">Fecha</th>
                <th className="p-3 uppercase">Categoria</th>
                <th className="p-3 uppercase">Concepto</th>
                <th className="p-3 uppercase">Metodo</th>
                <th className="p-3 uppercase">Monto</th>
              </tr>
            </thead>
            <tbody>
              {monthlyExpenses.map((expense, index) => (
                <tr key={`${expense.date}-${expense.concept}-${index}`} className="border-b border-wod-line/60">
                  <td className="p-3">{expense.date}</td>
                  <td className="p-3">{expense.category ?? ""}</td>
                  <td className="p-3">{expense.concept ?? ""}</td>
                  <td className="p-3">{expense.method ?? ""}</td>
                  <td className="p-3 font-black">{currency(Number(expense.amount ?? 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <h2 className="font-black">Pagos recibidos</h2>
            <span className="text-sm text-wod-muted">{monthlyPayments.length} registros</span>
          </CardHeader>
          <CardBody className="grid gap-2">
            {monthlyPayments.slice(0, 12).map((payment, index) => (
              <div key={`${payment.date}-${payment.concept}-${index}`} className="rounded-md border border-wod-line bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong>{payment.concept ?? "Pago"}</strong>
                  <span className="font-black text-wod-gold">{currency(Number(payment.amount ?? 0))}</span>
                </div>
                <p className="mt-1 text-sm text-wod-muted">{payment.date} · {payment.method ?? "Sin metodo"}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-black">Ventas de productos</h2>
            <span className="text-sm text-wod-muted">{monthlySales.length} registros</span>
          </CardHeader>
          <CardBody className="grid gap-2">
            {monthlySales.slice(0, 12).map((sale, index) => (
              <div key={`${sale.date}-${sale.product}-${index}`} className="rounded-md border border-wod-line bg-black/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <strong>{sale.product ?? "Venta"}</strong>
                  <span className="font-black text-wod-gold">{currency(Number(sale.total ?? 0))}</span>
                </div>
                <p className="mt-1 text-sm text-wod-muted">{sale.date} · {sale.quantity ?? 1} pza · {sale.method ?? "Sin metodo"}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
