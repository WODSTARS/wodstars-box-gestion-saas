import { approveCreditRequest, rejectCreditRequest } from "@/lib/data/actions";
import { assertBoxAccess, canWrite, getAppSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type CreditRow = {
  id: string;
  product: string;
  quantity: number;
  unit_price: number;
  total: number;
  status: string;
  created_at: string;
  members?: { name: string | null } | Array<{ name: string | null }> | null;
  profiles?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

const statusCopy: Record<string, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  rejected: "Rechazado"
};

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value || 0);
}

function relatedName(value: CreditRow["members"]) {
  if (Array.isArray(value)) return value[0]?.name ?? "";
  return value?.name ?? "";
}

function relatedFullName(value: CreditRow["profiles"]) {
  if (Array.isArray(value)) return value[0]?.full_name ?? "";
  return value?.full_name ?? "";
}

export default async function CreditPage() {
  const session = await getAppSession();
  assertBoxAccess(session);
  const supabase = await createSupabaseServerClient();
  const writable = session.isSuperadmin || canWrite(session.role);

  const { data, error } = session.boxId
    ? await supabase
        .from("credit_requests")
        .select("id, product, quantity, unit_price, total, status, created_at, members(name), profiles(full_name)")
        .eq("box_id", session.boxId)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };

  const rows = (data ?? []) as unknown as CreditRow[];
  const pending = rows.filter((row) => row.status === "pending");
  const history = rows.filter((row) => row.status !== "pending");

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Tienda y aprobaciones</p>
        <h1 className="text-3xl font-black">Fiados</h1>
        <p className="mt-1 text-wod-muted">Solicitudes de productos tomadas por atletas sin pago inmediato.</p>
      </div>

      {error ? (
        <Card>
          <CardBody>
            <p className="font-black text-red-200">Falta aplicar la migracion 005 en Supabase.</p>
            <p className="mt-1 text-sm text-wod-muted">{error.message}</p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-black">Pendientes</h2>
          <span className="text-sm text-wod-muted">{pending.length} por aprobar</span>
        </CardHeader>
        <CardBody className="grid gap-3">
          {pending.length ? pending.map((row) => (
            <div key={row.id} className="grid gap-3 rounded-md border border-wod-line bg-black/20 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[.16em] text-wod-gold">{relatedName(row.members) || "Socio"}</p>
                <h3 className="mt-1 text-xl font-black">{row.product}</h3>
                <p className="text-sm text-wod-muted">
                  {row.quantity} pza · {money(Number(row.unit_price ?? 0))} c/u · Total {money(Number(row.total ?? 0))}
                </p>
              </div>
              {writable ? (
                <div className="flex flex-wrap gap-2">
                  <form action={approveCreditRequest.bind(null, row.id)}>
                    <Button variant="primary">Aprobar y descontar</Button>
                  </form>
                  <form action={rejectCreditRequest.bind(null, row.id)}>
                    <Button variant="danger">Rechazar</Button>
                  </form>
                </div>
              ) : null}
            </div>
          )) : (
            <p className="rounded-md border border-wod-line bg-black/20 p-4 text-wod-muted">No hay fiados pendientes.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-black">Historial</h2>
          <span className="text-sm text-wod-muted">{history.length} registros</span>
        </CardHeader>
        <CardBody className="overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-wod-line text-left text-wod-gold">
                <th className="p-3 uppercase">Fecha</th>
                <th className="p-3 uppercase">Socio</th>
                <th className="p-3 uppercase">Producto</th>
                <th className="p-3 uppercase">Cantidad</th>
                <th className="p-3 uppercase">Total</th>
                <th className="p-3 uppercase">Estado</th>
                <th className="p-3 uppercase">Autorizo</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id} className="border-b border-wod-line/60">
                  <td className="p-3">{row.created_at?.slice(0, 10)}</td>
                  <td className="p-3">{relatedName(row.members)}</td>
                  <td className="p-3">{row.product}</td>
                  <td className="p-3">{row.quantity}</td>
                  <td className="p-3">{money(Number(row.total ?? 0))}</td>
                  <td className="p-3">{statusCopy[row.status] ?? row.status}</td>
                  <td className="p-3">{relatedFullName(row.profiles)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
