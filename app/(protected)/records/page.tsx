import { Trophy } from "lucide-react";
import { congratulateRecord } from "@/lib/data/actions";
import { assertBoxAccess, getAppSession } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";

type RecordRow = {
  id: string;
  movement: string;
  value: number;
  unit: string;
  record_date: string;
  notes: string | null;
  congrats_count: number | null;
  created_at: string;
  members?: { name: string | null } | Array<{ name: string | null }> | null;
  profiles?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};

function relatedMemberName(value: RecordRow["members"]) {
  if (Array.isArray(value)) return value[0]?.name ?? "Atleta";
  return value?.name ?? "Atleta";
}

function relatedCoachName(value: RecordRow["profiles"]) {
  if (Array.isArray(value)) return value[0]?.full_name ?? "";
  return value?.full_name ?? "";
}

export default async function RecordsPage() {
  const session = await getAppSession();
  assertBoxAccess(session);
  const supabase = await createSupabaseServerClient();

  const { data, error } = session.boxId
    ? await supabase
        .from("personal_records")
        .select("id, movement, value, unit, record_date, notes, congrats_count, created_at, members(name), profiles(full_name)")
        .eq("box_id", session.boxId)
        .order("created_at", { ascending: false })
        .limit(100)
    : { data: [], error: null };

  const records = (data ?? []) as unknown as RecordRow[];

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Comunidad y progreso</p>
        <h1 className="text-3xl font-black">Records personales</h1>
        <p className="mt-1 text-wod-muted">PRs subidos por atletas para que coaches los revisen y feliciten.</p>
      </div>

      {error ? (
        <Card>
          <CardBody>
            <p className="font-black text-red-200">Falta aplicar la migracion 006 en Supabase.</p>
            <p className="mt-1 text-sm text-wod-muted">{error.message}</p>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-black">Ultimos PRs</h2>
          <span className="text-sm text-wod-muted">{records.length} registros</span>
        </CardHeader>
        <CardBody className="grid gap-3">
          {records.length ? records.map((record) => {
            const lastCoach = relatedCoachName(record.profiles);
            return (
              <article key={record.id} className="grid gap-3 rounded-md border border-wod-line bg-black/20 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[.16em] text-wod-gold">{relatedMemberName(record.members)}</p>
                  <h3 className="mt-1 text-xl font-black">{record.movement}</h3>
                  <p className="text-sm text-wod-muted">
                    {record.value} {record.unit} · {record.record_date}
                  </p>
                  {record.notes ? <p className="mt-2 text-sm text-wod-muted">{record.notes}</p> : null}
                  <p className="mt-2 text-xs font-bold text-wod-green">
                    {Number(record.congrats_count ?? 0)} felicitaciones{lastCoach ? ` · ultima de ${lastCoach}` : ""}
                  </p>
                </div>
                <form action={congratulateRecord.bind(null, record.id)}>
                  <Button variant="primary">
                    <Trophy size={16} /> Felicitar
                  </Button>
                </form>
              </article>
            );
          }) : (
            <p className="rounded-md border border-wod-line bg-black/20 p-4 text-wod-muted">Aun no hay records subidos por atletas.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
