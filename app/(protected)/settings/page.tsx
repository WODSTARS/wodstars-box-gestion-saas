import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import { createManualBackup } from "@/lib/data/actions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const session = await getAppSession();
  const supabase = await createSupabaseServerClient();
  const { data: backups } = session.boxId
    ? await supabase
        .from("backups")
        .select("id, label, created_at")
        .eq("box_id", session.boxId)
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Configuración</p>
        <h1 className="text-3xl font-black">Ajustes del box</h1>
      </div>
      <Card>
        <CardHeader>
          <h2 className="font-black">Datos actuales</h2>
        </CardHeader>
        <CardBody className="grid gap-3 text-wod-muted">
          <p><strong className="text-wod-text">Box:</strong> {session.box?.name}</p>
          <p><strong className="text-wod-text">Plan:</strong> {session.box?.plan}</p>
          <p><strong className="text-wod-text">Estado:</strong> {session.box?.status}</p>
        </CardBody>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-black">Respaldos</h2>
        </CardHeader>
        <CardBody className="grid gap-4">
          <form action={createManualBackup}>
            <Button>Generar copia de seguridad</Button>
          </form>
          <div className="grid gap-2 text-sm text-wod-muted">
            {(backups ?? []).length === 0 ? <p>No hay respaldos todavía.</p> : null}
            {(backups ?? []).map((backup) => (
              <div key={backup.id} className="flex items-center justify-between rounded-md border border-wod-line bg-wod-panel2 px-3 py-2">
                <span className="font-bold text-wod-text">{backup.label}</span>
                <span>{new Date(backup.created_at).toLocaleString("es-MX")}</span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
