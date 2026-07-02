import { createRecord, deleteRecord, updateRecord } from "@/lib/data/actions";
import type { ModuleConfig, ModuleKey } from "@/lib/data/tables";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppSession, canWrite } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Row = Record<string, string | number | boolean | null>;

const columnLabels: Record<string, string> = {
  active: "Activo",
  amount: "Monto",
  capacity: "Cupo",
  category: "Categoria",
  class_id: "Clase",
  concept: "Concepto",
  date: "Fecha",
  day: "Dia",
  due_date: "Vencimiento",
  email: "Email",
  end_date: "Vencimiento",
  equipment: "Producto/equipo",
  focus: "Enfoque",
  location: "Ubicacion",
  maintenance_date: "Mantenimiento",
  member_id: "Socio",
  method: "Metodo",
  monthly_amount: "Monto mensual",
  name: "Nombre",
  notes: "Notas",
  owner: "Responsable",
  phone: "Telefono",
  plan: "Plan",
  priority: "Prioridad",
  product: "Producto",
  quantity: "Cantidad",
  rate: "Tarifa",
  role: "Rol",
  status: "Estado",
  time: "Hora",
  title: "Tarea",
  total: "Total",
  type: "Tipo",
  unit_price: "Precio unitario"
};

const valueLabels: Record<string, string> = {
  active: "Activo",
  approved: "Aprobado",
  completed: "Completada",
  expired: "Vencido",
  expiring: "Proximo a vencer",
  false: "Inactivo",
  high: "Alta",
  in_progress: "En proceso",
  low: "Baja",
  medium: "Media",
  paused: "Pausado",
  pending: "Pendiente",
  rejected: "Rechazado",
  true: "Activo"
};

function displayLabel(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const key = String(value);
  return valueLabels[key] ?? key;
}

function headerLabel(column: string) {
  return columnLabels[column] ?? column.replaceAll("_", " ");
}

function fieldControl(field: ModuleConfig["fields"][number], row?: Row) {
  const value = row?.[field.name];

  if (field.type === "textarea") {
    return <textarea name={field.name} required={field.required} defaultValue={String(value ?? "")} />;
  }

  if (field.type === "select") {
    return (
      <select name={field.name} required={field.required} defaultValue={String(value ?? field.options?.[0] ?? "")}>
        {(field.options ?? []).map((option) => <option key={option} value={option}>{displayLabel(option)}</option>)}
      </select>
    );
  }

  if (field.type === "checkbox") {
    return <input name={field.name} type="checkbox" className="h-5 w-5" defaultChecked={Boolean(value)} />;
  }

  return <input name={field.name} type={field.type} required={field.required} defaultValue={String(value ?? "")} />;
}

function daysUntil(date: string | number | boolean | null) {
  if (!date) return 9999;
  const today = new Date().toISOString().slice(0, 10);
  return Math.ceil((new Date(`${date}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
}

function renewalMailto(row: Row) {
  const email = String(row.email ?? "");
  const name = String(row.name ?? "atleta");
  const endDate = String(row.end_date ?? "");
  const subject = `Renovacion de membresia WODSTARS`;
  const body = `Hola ${name}, tu membresia vence el ${endDate}. Responde este correo o pasa a recepcion para renovarla.`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export async function CrudPage({ config }: { config: ModuleConfig }) {
  const session = await getAppSession();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from(config.table)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as Row[];
  const writable = session.isSuperadmin || canWrite(session.role) || config.key === "attendance" || config.key === "wods" || config.key === "tasks";
  const expiringMembers = config.key === "members"
    ? rows.filter((row) => {
        const days = daysUntil(row.end_date);
        return days <= 7 || row.status === "expired" || row.status === "expiring";
      })
    : [];
  const bulkEmails = expiringMembers.map((row) => String(row.email ?? "")).filter(Boolean).join(",");
  const bulkMailto = `mailto:?bcc=${encodeURIComponent(bulkEmails)}&subject=${encodeURIComponent("Renovacion de membresia WODSTARS")}&body=${encodeURIComponent("Hola, tu membresia esta por vencer o vencida. Responde este correo o pasa a recepcion para renovarla.")}`;

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Módulo operativo</p>
        <h1 className="text-3xl font-black">{config.title}</h1>
        <p className="mt-1 text-wod-muted">{config.description}</p>
      </div>

      {error ? <div className="rounded-md border border-wod-red bg-wod-red/10 p-3 text-red-100">{error.message}</div> : null}

      {config.key === "members" && expiringMembers.length ? (
        <Card>
          <CardHeader>
            <h2 className="font-black">Socios por vencer</h2>
            {bulkEmails ? (
              <a className="rounded-md border border-wod-line bg-wod-panel2 px-3 py-2 text-sm font-black hover:border-wod-gold hover:text-wod-gold" href={bulkMailto}>
                Enviar correos
              </a>
            ) : null}
          </CardHeader>
          <CardBody className="grid gap-3">
            {expiringMembers.slice(0, 8).map((row) => (
              <div key={String(row.id)} className="rounded-md border border-wod-line bg-black/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>{String(row.name ?? "")}</strong>
                    <p className="text-sm text-wod-muted">
                      Plan {String(row.plan ?? "")} vence {String(row.end_date ?? "")} · {String(row.phone ?? "")}
                    </p>
                  </div>
                  {row.email ? (
                    <a className="rounded-md border border-wod-line bg-wod-panel2 px-3 py-2 text-sm font-black hover:border-wod-gold hover:text-wod-gold" href={renewalMailto(row)}>
                      Correo
                    </a>
                  ) : null}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      {writable ? (
        <Card>
          <CardBody>
            <details>
              <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-wod-gold bg-wod-gold px-4 text-sm font-black text-black transition hover:bg-[#ffdc5a]">
                Agregar {config.title.toLowerCase()}
              </summary>
              <form action={createRecord.bind(null, config.key as ModuleKey)} className="mt-4 grid gap-3 border-t border-wod-line pt-4 md:grid-cols-2">
                {config.fields.map((field) => (
                  <label key={field.name} className={field.type === "textarea" ? "grid gap-2 text-sm font-bold md:col-span-2" : "grid gap-2 text-sm font-bold"}>
                    {field.label}
                    {fieldControl(field)}
                  </label>
                ))}
                <Button variant="primary" className="md:col-span-2">Guardar</Button>
              </form>
            </details>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-black">Registros</h2>
          <span className="text-sm text-wod-muted">{rows.length} resultados</span>
        </CardHeader>
        <CardBody className="overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-wod-line text-left text-wod-gold">
                {config.columns.map((column) => <th key={column} className="p-3 uppercase">{headerLabel(column)}</th>)}
                {writable ? <th className="p-3 uppercase">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)} className="border-b border-wod-line/60">
                  {config.columns.map((column) => <td key={column} className="p-3">{displayLabel(row[column])}</td>)}
                  {writable ? (
                    <td className="p-3 align-top">
                      <details className="mb-2">
                        <summary className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-wod-line bg-wod-panel2 px-3 text-sm font-black text-wod-text transition hover:border-wod-gold hover:text-wod-gold">
                          Editar
                        </summary>
                        <form action={updateRecord.bind(null, config.key as ModuleKey, String(row.id))} className="mt-3 grid min-w-[320px] gap-3 rounded-md border border-wod-line bg-black/30 p-3 md:grid-cols-2">
                          {config.fields.map((field) => (
                            <label key={field.name} className={field.type === "textarea" ? "grid gap-2 text-sm font-bold md:col-span-2" : "grid gap-2 text-sm font-bold"}>
                              {field.label}
                              {fieldControl(field, row)}
                            </label>
                          ))}
                          <Button variant="primary" className="md:col-span-2">Guardar cambios</Button>
                        </form>
                      </details>
                      <form action={deleteRecord.bind(null, config.key as ModuleKey, String(row.id))}>
                        <Button variant="danger">Borrar</Button>
                      </form>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
