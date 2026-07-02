import { CalendarDays, CheckCircle2, Clock3, CreditCard, Dumbbell, MapPin, QrCode, ShieldCheck, Sparkles, Users } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { reserveClass } from "./actions";

type Search = Record<string, string | string[] | undefined>;

type Member = {
  id: string;
  box_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  plan: string;
  monthly_amount: number;
  end_date: string;
  status: string;
};

type ClassRow = {
  id: string;
  box_id: string;
  name: string;
  type: string;
  day: string;
  time: string;
  capacity: number;
  location: string | null;
};

type BoxRow = {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
};

type AttendanceRow = {
  member_id: string;
  class_id: string | null;
  date: string;
};

type WodRow = {
  date: string;
  name: string;
  focus: string | null;
  warmup: string | null;
  strength: string | null;
  workout: string | null;
  scaling: string | null;
};

const statusCopy: Record<string, string> = {
  reserved: "Reserva confirmada. Te esperamos en clase.",
  already: "Ya tenias reservada esta clase.",
  full: "La clase ya no tiene lugares disponibles.",
  inactive: "Tu membresia no esta activa. Contacta a recepcion.",
  invalid: "No pudimos validar esta clase.",
  missing: "Faltan datos para reservar.",
  error: "No se pudo guardar la reserva. Intenta de nuevo."
};

const weekdays = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeDay(value: string | null | undefined) {
  return String(value ?? "")
    .replace("MiÃ©rcoles", "Miercoles")
    .replace("SÃ¡bado", "Sabado")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "2-digit", month: "short" }).format(new Date(`${value}T12:00:00`));
}

function money(value: number) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value || 0);
}

function nextDates(days = 8) {
  const dates: Array<{ date: string; day: string }> = [];
  const now = new Date();

  for (let offset = 0; offset < days; offset += 1) {
    const item = new Date(now);
    item.setDate(now.getDate() + offset);
    dates.push({
      date: item.toISOString().slice(0, 10),
      day: weekdays[item.getDay()]
    });
  }

  return dates;
}

export default async function MobileAppPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const params = (await searchParams) ?? {};
  const email = single(params.email)?.trim() ?? "";
  const status = single(params.status) ?? "";
  const supabase = createSupabaseAdminClient();

  const { data: box } = await supabase
    .from("boxes")
    .select("id, name, slug, subscription_status")
    .eq("slug", "wodstars-hq")
    .single<BoxRow>();

  let member: Member | null = null;
  let classes: ClassRow[] = [];
  let attendance: AttendanceRow[] = [];
  let wod: WodRow | null = null;

  if (box && email) {
    const { data } = await supabase
      .from("members")
      .select("id, box_id, name, email, phone, plan, monthly_amount, end_date, status")
      .eq("box_id", box.id)
      .or(`email.ilike.${email},phone.ilike.${email}`)
      .maybeSingle<Member>();
    member = data ?? null;
  }

  if (box && member) {
    const [{ data: classData }, { data: attendanceData }, { data: wodData }] = await Promise.all([
      supabase
        .from("classes")
        .select("id, box_id, name, type, day, time, capacity, location")
        .eq("box_id", box.id)
        .order("time", { ascending: true }),
      supabase
        .from("attendance")
        .select("member_id, class_id, date")
        .eq("box_id", box.id)
        .gte("date", new Date().toISOString().slice(0, 10)),
      supabase
        .from("wods")
        .select("date, name, focus, warmup, strength, workout, scaling")
        .eq("box_id", box.id)
        .gte("date", new Date().toISOString().slice(0, 10))
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle<WodRow>()
    ]);

    classes = (classData ?? []) as ClassRow[];
    attendance = (attendanceData ?? []) as AttendanceRow[];
    wod = wodData ?? null;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wodstars-box-gestion-saas.vercel.app";
  const checkinUrl = member
    ? `${appUrl}/app/checkin?member=${encodeURIComponent(member.id)}&email=${encodeURIComponent(email)}`
    : "";
  const qrUrl = checkinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(checkinUrl)}`
    : "";

  const dates = nextDates();
  const sessions = dates
    .flatMap((date) =>
      classes
        .filter((item) => normalizeDay(item.day) === normalizeDay(date.day))
        .map((item) => {
          const reservedCount = attendance.filter((row) => row.class_id === item.id && row.date === date.date).length;
          const isReserved = attendance.some((row) => row.member_id === member?.id && row.class_id === item.id && row.date === date.date);

          return {
            ...item,
            date: date.date,
            label: dateLabel(date.date),
            reservedCount,
            spotsLeft: Math.max(Number(item.capacity ?? 0) - reservedCount, 0),
            isReserved
          };
        })
    )
    .slice(0, 18);

  return (
    <main className="min-h-screen bg-[#050506] text-[#f8f3e6]">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[.2em] text-[#f4c430]">WODSTARS app</p>
            <h1 className="mt-1 text-3xl font-black">Reserva tu clase</h1>
          </div>
          <img
            src="/wodstar-logo-transparent.png"
            alt="WODSTARS Gestion"
            className="h-16 w-16 object-contain drop-shadow-[0_12px_28px_rgba(244,196,48,.28)]"
          />
        </div>

        <div className="mb-5 rounded-lg border border-[#272b35] bg-[#11141a] p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-[#69b9ff]" size={20} />
            <div>
              <p className="font-black">{box?.name ?? "WODSTARS HQ"}</p>
              <p className="text-sm text-[#aab0bd]">Reservas, pagos, WOD y check-in desde el telefono.</p>
            </div>
          </div>
        </div>

        {!email ? (
          <form className="grid gap-4 rounded-lg border border-[#272b35] bg-[#11141a] p-4">
            <label className="grid gap-2 text-sm font-bold">
              Email o telefono
              <input name="email" type="text" placeholder="ana@email.com" required />
            </label>
            <button className="min-h-12 rounded-md bg-[#f4c430] font-black text-black" type="submit">
              Entrar a mi app
            </button>
          </form>
        ) : !member ? (
          <div className="grid gap-4 rounded-lg border border-[#272b35] bg-[#11141a] p-4">
            <p className="font-black">No encontramos ese socio</p>
            <p className="text-sm text-[#aab0bd]">Revisa el email/telefono o pide a recepcion que actualice tus datos.</p>
            <a className="grid min-h-12 place-items-center rounded-md bg-[#f4c430] font-black text-black" href="/app">
              Intentar de nuevo
            </a>
          </div>
        ) : (
          <>
            <div className="mb-4 rounded-lg border border-[#272b35] bg-[#11141a] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#aab0bd]">Hola</p>
                  <h2 className="text-2xl font-black">{member.name}</h2>
                  <p className="mt-1 text-sm text-[#aab0bd]">{member.plan} · vence {member.end_date}</p>
                </div>
                <span className="rounded-full bg-[#183b2d] px-3 py-1 text-xs font-black text-[#8cf0bd]">{member.status}</span>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-[#272b35] bg-[#11141a] p-4">
                <CreditCard className="mb-3 text-[#f4c430]" size={20} />
                <p className="text-xs font-black uppercase tracking-[.16em] text-[#aab0bd]">Proximo pago</p>
                <p className="mt-1 text-xl font-black">{money(member.monthly_amount)}</p>
                <p className="text-xs text-[#aab0bd]">Vence {member.end_date}</p>
              </div>
              <div className="rounded-lg border border-[#272b35] bg-[#11141a] p-4">
                <QrCode className="mb-3 text-[#69b9ff]" size={20} />
                <p className="text-xs font-black uppercase tracking-[.16em] text-[#aab0bd]">Check-in</p>
                <p className="mt-1 text-xl font-black">QR listo</p>
                <a className="mt-2 block text-xs font-bold text-[#f4c430]" href="#qr-checkin">Mostrar codigo</a>
              </div>
            </div>

            {status ? (
              <div className="mb-4 rounded-lg border border-[#f4c430]/40 bg-[#f4c430]/10 p-3 text-sm font-bold text-[#ffe58a]">
                {statusCopy[status] ?? statusCopy.error}
              </div>
            ) : null}

            <div className="mb-4 rounded-lg border border-[#272b35] bg-[#11141a] p-4">
              <div className="mb-3 flex items-center gap-2">
                <Dumbbell className="text-[#f4c430]" size={20} />
                <h3 className="font-black">Rutina</h3>
              </div>
              {wod ? (
                <div className="grid gap-2 text-sm">
                  <p className="text-xs font-black uppercase tracking-[.16em] text-[#aab0bd]">{dateLabel(wod.date)}</p>
                  <p className="text-xl font-black">{wod.name}</p>
                  {wod.focus ? <p className="text-[#f4c430]">{wod.focus}</p> : null}
                  {wod.warmup ? <p><strong>Warmup:</strong> {wod.warmup}</p> : null}
                  {wod.strength ? <p><strong>Fuerza:</strong> {wod.strength}</p> : null}
                  {wod.workout ? <p><strong>WOD:</strong> {wod.workout}</p> : null}
                  {wod.scaling ? <p className="text-[#aab0bd]"><strong>Escalamiento:</strong> {wod.scaling}</p> : null}
                </div>
              ) : (
                <p className="text-sm text-[#aab0bd]">Aun no hay WOD publicado para los proximos dias.</p>
              )}
            </div>

            <div id="qr-checkin" className="mb-4 rounded-lg border border-[#272b35] bg-[#11141a] p-4 text-center">
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#f4c430]">Check-in rapido</p>
              <h3 className="mt-1 text-xl font-black">Escanea al llegar</h3>
              <div className="mx-auto my-4 grid w-fit place-items-center rounded-lg bg-white p-3">
                <img alt="QR de check-in" className="h-52 w-52" src={qrUrl} />
              </div>
              <p className="text-xs text-[#aab0bd]">Recepcion o coach escanea este codigo para registrar asistencia de hoy.</p>
            </div>

            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-black">Proximas clases</h3>
              <span className="text-xs font-bold text-[#aab0bd]">{sessions.length} opciones</span>
            </div>

            <div className="grid gap-3 pb-8">
              {sessions.length ? sessions.map((item) => (
                <article key={`${item.id}-${item.date}`} className="rounded-lg border border-[#272b35] bg-[#11141a] p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[.16em] text-[#f4c430]">{item.label}</p>
                      <h4 className="mt-1 text-xl font-black">{item.name}</h4>
                      <p className="text-sm text-[#aab0bd]">{item.type}</p>
                    </div>
                    {item.isReserved ? <CheckCircle2 className="text-[#8cf0bd]" /> : null}
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-2 text-xs text-[#c9ced8]">
                    <span className="flex items-center gap-1"><Clock3 size={14} /> {item.time.slice(0, 5)}</span>
                    <span className="flex items-center gap-1"><Users size={14} /> {item.spotsLeft} libres</span>
                    <span className="flex items-center gap-1"><MapPin size={14} /> {item.location ?? "Box"}</span>
                  </div>

                  <form action={reserveClass}>
                    <input type="hidden" name="member_id" value={member.id} />
                    <input type="hidden" name="class_id" value={item.id} />
                    <input type="hidden" name="date" value={item.date} />
                    <input type="hidden" name="time" value={item.time} />
                    <input type="hidden" name="email" value={email} />
                    <button
                      className="min-h-11 w-full rounded-md bg-[#f4c430] font-black text-black disabled:cursor-not-allowed disabled:bg-[#303541] disabled:text-[#aab0bd]"
                      disabled={item.isReserved || item.spotsLeft <= 0}
                      type="submit"
                    >
                      {item.isReserved ? "Reservada" : item.spotsLeft <= 0 ? "Clase llena" : "Reservar lugar"}
                    </button>
                  </form>
                </article>
              )) : (
                <div className="rounded-lg border border-[#272b35] bg-[#11141a] p-4">
                  <Sparkles className="mb-3 text-[#f4c430]" />
                  <p className="font-black">Aun no hay clases programadas</p>
                  <p className="mt-1 text-sm text-[#aab0bd]">Agrega horarios desde WODSTARS Gestion para que aparezcan aqui.</p>
                </div>
              )}
            </div>
          </>
        )}

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-[#272b35] pt-4 text-center text-xs text-[#aab0bd]">
          <span><CalendarDays className="mx-auto mb-1" size={16} />Reservas</span>
          <span><Dumbbell className="mx-auto mb-1" size={16} />WOD</span>
          <a href="#qr-checkin"><CheckCircle2 className="mx-auto mb-1" size={16} />Check-in</a>
        </div>
      </section>
    </main>
  );
}
