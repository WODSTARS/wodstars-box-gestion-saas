import { createRecord, deleteRecord } from "@/lib/data/actions";
import type { ModuleConfig, ModuleKey } from "@/lib/data/tables";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppSession, canWrite } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type Row = Record<string, string | number | boolean | null>;

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

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Módulo operativo</p>
        <h1 className="text-3xl font-black">{config.title}</h1>
        <p className="mt-1 text-wod-muted">{config.description}</p>
      </div>

      {error ? <div className="rounded-md border border-wod-red bg-wod-red/10 p-3 text-red-100">{error.message}</div> : null}

      {writable ? (
        <Card>
          <CardHeader><h2 className="font-black">Nuevo registro</h2></CardHeader>
          <CardBody>
            <form action={createRecord.bind(null, config.key as ModuleKey)} className="grid gap-3 md:grid-cols-2">
              {config.fields.map((field) => (
                <label key={field.name} className={field.type === "textarea" ? "grid gap-2 text-sm font-bold md:col-span-2" : "grid gap-2 text-sm font-bold"}>
                  {field.label}
                  {field.type === "textarea" ? (
                    <textarea name={field.name} required={field.required} />
                  ) : field.type === "select" ? (
                    <select name={field.name} required={field.required}>
                      {(field.options ?? []).map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <input name={field.name} type="checkbox" className="h-5 w-5" />
                  ) : (
                    <input name={field.name} type={field.type} required={field.required} />
                  )}
                </label>
              ))}
              <Button variant="primary" className="md:col-span-2">Guardar</Button>
            </form>
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
                {config.columns.map((column) => <th key={column} className="p-3 uppercase">{column}</th>)}
                {writable ? <th className="p-3 uppercase">Acciones</th> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)} className="border-b border-wod-line/60">
                  {config.columns.map((column) => <td key={column} className="p-3">{String(row[column] ?? "")}</td>)}
                  {writable ? (
                    <td className="p-3">
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
