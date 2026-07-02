import { CalendarDays } from "lucide-react";
import { CrudPage } from "@/components/crud/crud-page";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getAppSession } from "@/lib/auth/session";
import { modules } from "@/lib/data/tables";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const days = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function cleanDay(value: string | null | undefined) {
  return String(value ?? "")
    .replace("MiÃ©rcoles", "Miercoles")
    .replace("SÃ¡bado", "Sabado")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export default async function ClassesPage() {
  const session = await getAppSession();
  const supabase = await createSupabaseServerClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id,name,type,day,time,capacity,location")
    .eq("box_id", session.boxId)
    .order("time", { ascending: true });

  return (
    <div className="grid gap-5">
      <Card>
        <CardHeader>
          <div>
            <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Calendario semanal</p>
            <h1 className="text-2xl font-black">Clases y horarios</h1>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-wod-gold px-3 py-1 text-xs font-black text-black">
            <CalendarDays size={14} /> estilo Google Calendar
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
                    {items.length ? items.map((item) => (
                      <div key={item.id} className="rounded-md border border-wod-line border-l-4 border-l-wod-gold bg-wod-panel2 p-3">
                        <strong>{String(item.time).slice(0, 5)} {item.name}</strong>
                        <p className="mt-1 text-sm text-wod-muted">{item.type} · {item.location ?? "Box"}</p>
                        <span className="mt-2 inline-flex rounded-full bg-wod-blue px-2 py-1 text-xs font-black text-black">{item.capacity} lugares</span>
                      </div>
                    )) : <p className="text-sm text-wod-muted">Sin clases</p>}
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
