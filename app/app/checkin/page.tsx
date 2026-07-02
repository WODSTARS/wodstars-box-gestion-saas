import { CheckCircle2, CircleAlert, Dumbbell } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type Search = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function currentTime() {
  return new Date().toTimeString().slice(0, 8);
}

export default async function CheckinPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const params = (await searchParams) ?? {};
  const memberId = single(params.member) ?? "";
  const email = single(params.email) ?? "";
  const today = new Date().toISOString().slice(0, 10);
  const supabase = createSupabaseAdminClient();

  let title = "Check-in no valido";
  let detail = "No encontramos los datos necesarios para registrar asistencia.";
  let ok = false;

  if (memberId) {
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
    } else {
      const { data: existing } = await supabase
        .from("attendance")
        .select("id")
        .eq("member_id", member.id)
        .eq("date", today)
        .is("class_id", null)
        .maybeSingle();

      if (existing) {
        ok = true;
        title = "Check-in ya registrado";
        detail = `${member.name} ya tenia check-in general registrado hoy.`;
      } else {
        const { error } = await supabase.from("attendance").insert({
          box_id: member.box_id,
          member_id: member.id,
          class_id: null,
          date: today,
          time: currentTime()
        });

        if (error) {
          title = "No se pudo registrar";
          detail = error.message;
        } else {
          ok = true;
          title = "Check-in listo";
          detail = `${member.name} quedo registrado para hoy.`;
        }
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
