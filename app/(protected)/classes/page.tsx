import { CalendarDays } from "lucide-react";
import { CrudPage } from "@/components/crud/crud-page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import { modules } from "@/lib/data/tables";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const days = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const dayIndexes: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6
};

type ReservationRow = {
  date: string;
  class_id: string | null;
  members?: { name: string | null } | Array<{ name: string | null }> | null;
};

function cleanDay(value: string | null | undefined) {
  return String(value ?? "")
    .replace("Miercoles", "Miercoles")
    .replace("Sabado", "Sabado")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function nextDateForDay(day: string | null | undefined) {
  const target = dayIndexes[cleanDay(day).toLowerCase()] ?? 1;
  const now = new Date();
  const offset = (target - now.getDay() + 7) % 7;
  const date = new Date(now);
  date.setDate(now.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function reservationName(row: ReservationRow) {
  if (Array.isArray(row.members)) return row.members[0]?.name ?? "Socio";
  return row.members?.name ?? "Socio";
}

export default async function ClassesPage() {
  const session = await getAppSession();
  const supabase = await createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data: classes } = await supabase
    .from("classes")
    .select("id,name,type,day,time,capacity,location")
    .eq("box_id", session.boxId)
    .order("time", { ascending: true });
  const { data: reservations } = await supabase
    .from("attendance")
    .select("date,class_id,members(name)")
    .eq("box_id", session.boxId)
    .gte("date", today)
    .order("date", { ascending: true });
  const reservationRows = (reservations ?? []) as unknown as ReservationRow[];

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Calendario semanal</p>
            <h1 className="text-2xl font-black">Clases, cupos y reservas</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-wod-gold px-3 py-1 text-xs font-black text-black">
            <CalendarDays size={14} /> proxima sesion
          </span>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          <div className="grid min-w-[980px] grid-cols-7 gap-3">
            {days.map((day) => {
              const items = (classes ?? []).filter((item) => cleanDay(item.day).toLowerCase() === day.toLowerCase());
              return (
                <section key={day} className="min-h-64 rounded-md border border-wod-line bg-black/20 p-3">
                  <h3 className="mb-3 text-sm font-black uppercase text-wod-gold">{day}</h3>
                  <div className="grid gap-2">
                    {items.length ? items.map((item) => {
                      const nextDate = nextDateForDay(item.day);
                      const classReservations = reservationRows.filter((row) => row.class_id === item.id && row.date === nextDate);
                      const used = classReservations.length;
                      const capacity = Number(item.capacity ?? 0);
                      const available = Math.max(capacity - used, 0);
                      return (
                        <div key={item.id} className="rounded-md border border-wod-line border-l-4 border-l-wod-gold bg-wod-panel2 p-3">
                          <strong>{String(item.time).slice(0, 5)} {item.name}</strong>
                          <p className="mt-1 text-sm text-wod-muted">{item.type} · {item.location ?? "Box"}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex rounded-full bg-wod-blue px-2 py-1 text-xs font-black text-black">{used}/{capacity} usados</span>
                            <span className="inline-flex rounded-full bg-wod-gold px-2 py-1 text-xs font-black text-black">{available} libres</span>
                          </div>
                          <p className="mt-2 text-xs font-bold text-wod-muted">Proxima fecha: {nextDate}</p>
                          {classReservations.length ? (
                            <div className="mt-2 rounded-md border border-wod-line bg-black/20 p-2">
                              <p className="text-xs font-black uppercase tracking-[.14em] text-wod-gold">Reservaron</p>
                              <p className="mt-1 text-sm text-wod-muted">{classReservations.map(reservationName).join(", ")}</p>
                            </div>
                          ) : null}
                        </div>
                      );
                    }) : <p className="text-sm text-wod-muted">Sin clases</p>}
                  </div>
                </section>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <CrudPage config={modules.classes} />
    </div>
  );
}
