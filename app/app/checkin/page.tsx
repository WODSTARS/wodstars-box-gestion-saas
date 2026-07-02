import { CheckCircle2, CircleAlert, Dumbbell } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Search = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function currentTime() {
  return new Date().toTimeString().slice(0, 8);
}

function mexicoClock() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return {
    date: `${value("year")}-${value("month")}-${value("day")}`,
    minutes: Number(value("hour")) * 60 + Number(value("minute"))
  };
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export default async function CheckinPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const params = (await searchParams) ?? {};
  const memberId = single(params.member) ?? "";
  const email = single(params.email) ?? "";
  const classId = single(params.class) ?? "";
  const date = single(params.date) ?? "";
  const time = single(params.time) ?? "";
  const clock = mexicoClock();
  const supabase = createSupabaseAdminClient();

  let title = "Check-in no valido";
  let detail = "No encontramos los datos necesarios para registrar asistencia.";
  let ok = false;

  if (memberId && classId && date && time) {
    const { data: member } = await supabase
      .from("members")
      .select("id, box_id, name, status")
      .eq("id", memberId)
      .single();

    if (!member) {
      detail = "El atleta no existe o fue eliminado.";
    } else if (member.status !== "active") {
      title = "Membresia inactiva";
      detail = `${member.name} no tiene una membresia activa.`;
    } else if (date !== clock.date || clock.minutes < timeToMinutes(time) - 20 || clock.minutes > timeToMinutes(time)) {
      title = "QR fuera de horario";
      detail = "El check-in solo se habilita durante los 20 minutos previos a la clase reservada.";
    } else {
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("member_id", member.id)
        .eq("class_id", classId)
        .eq("date", date)
        .maybeSingle();

      if (!existing) {
        title = "Clase no reservada";
        detail = "Primero reserva la clase desde la app para poder generar check-in.";
      } else {
        const { error } = await supabase
          .from("attendance")
          .update({ time: currentTime() })
          .eq("id", existing.id);

        ok = !error;
        title = error ? "No se pudo registrar" : "Check-in listo";
        detail = error ? error.message : `${member.name} quedo registrado para la clase reservada.`;
      }
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#050506] px-5 text-[#f8f3e6]">
      <section className="w-full max-w-sm rounded-lg border border-[#272b35] bg-[#11141a] p-6 text-center">
        <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-[#f4c430] text-black">
          {ok ? <CheckCircle2 size={30} /> : <CircleAlert size={30} />}
        </div>
        <p className="text-xs font-black uppercase tracking-[.2em] text-[#f4c430]">WODSTARS check-in</p>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        <p className="mt-3 text-[#aab0bd]">{detail}</p>
        <a
          className="mt-6 grid min-h-12 place-items-center rounded-md bg-[#f4c430] font-black text-black"
          href={`/app${email ? `?email=${encodeURIComponent(email)}` : ""}`}
        >
          <span className="inline-flex items-center gap-2"><Dumbbell size={18} /> Volver a la app</span>
        </a>
      </section>
    </main>
  );
}
