import { CalendarDays, CheckCircle2, Clock3, CreditCard, Dumbbell, MapPin, QrCode, ShieldCheck, ShoppingBag, Sparkles, Users } from "lucide-react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requestCredit, reserveClass } from "./actions";

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

type InventoryProduct = {
  id: string;
  equipment: string;
  category: string | null;
  quantity: number | null;
  estimated_cost: number | null;
  status: string | null;
};

type CreditRequest = {
  id: string;
  product: string;
  quantity: number;
  total: number;
  status: string;
};

type AppTab = "inicio" | "reservas" | "wod" | "tienda" | "checkin";

const statusCopy: Record<string, string> = {
  reserved: "Reserva confirmada. Te esperamos en clase.",
  already: "Ya tenias reservada esta clase.",
  full: "La clase ya no tiene lugares disponibles.",
  inactive: "Tu membresia esta vencida o pausada. Realiza tu pago en recepcion para volver a reservar.",
  invalid: "No pudimos validar esta clase.",
  missing: "Faltan datos para reservar.",
  error: "No se pudo guardar la reserva. Intenta de nuevo."
  ,
  credit_requested: "Solicitud de fiado enviada. Un coach o recepcion debe aprobarla.",
  credit_missing: "Faltan datos para pedir el producto.",
  credit_invalid: "No pudimos validar ese producto.",
  credit_stock: "No hay suficiente inventario disponible.",
  credit_error: "No se pudo guardar el fiado. Revisa que la migracion 005 este aplicada en Supabase."
};

const memberStatusCopy: Record<string, string> = {
  active: "Activo",
  expired: "Vencido",
  expiring: "Proximo a vencer",
  paused: "Pausado"
};

const creditStatusCopy: Record<string, string> = {
  approved: "Aprobado",
  pending: "Pendiente",
  rejected: "Rechazado"
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

function isAppTab(value: string): value is AppTab {
  return ["inicio", "reservas", "wod", "tienda", "checkin"].includes(value);
}

function isMembershipCurrent(member: Member) {
  const today = new Date().toISOString().slice(0, 10);
  if (member.status === "expired" || member.status === "paused") return false;
  if (member.end_date < today) return false;
  return member.status === "active" || member.status === "expiring";
}

export default async function MobileAppPage({ searchParams }: { searchParams?: Promise<Search> }) {
  const params = (await searchParams) ?? {};
  const email = single(params.email)?.trim() ?? "";
  const status = single(params.status) ?? "";
  const requestedTab = single(params.tab) ?? "inicio";
  const tab: AppTab = isAppTab(requestedTab) ? requestedTab : "inicio";
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
  let products: InventoryProduct[] = [];
  let creditRequests: CreditRequest[] = [];

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
    const [{ data: classData }, { data: attendanceData }, { data: wodData }, { data: productData }, { data: creditData }] = await Promise.all([
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
        .maybeSingle<WodRow>(),
      supabase
        .from("inventory")
        .select("id, equipment, category, quantity, estimated_cost, status")
        .eq("box_id", box.id)
        .gt("quantity", 0)
        .order("equipment", { ascending: true })
        .limit(20),
      supabase
        .from("credit_requests")
        .select("id, product, quantity, total, status")
        .eq("box_id", box.id)
        .eq("member_id", member.id)
        .order("created_at", { ascending: false })
        .limit(6)
    ]);

    classes = (classData ?? []) as ClassRow[];
    attendance = (attendanceData ?? []) as AttendanceRow[];
    wod = wodData ?? null;
    products = (productData ?? []) as InventoryProduct[];
    creditRequests = (creditData ?? []) as CreditRequest[];
  }

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
  const clock = mexicoClock();
  const checkinSession = sessions.find((item) => {
    if (!item.isReserved || item.date !== clock.date) return false;
    const classMinutes = timeToMinutes(item.time);
    return clock.minutes >= classMinutes - 20 && clock.minutes <= classMinutes;
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://wodstars-box-gestion-saas.vercel.app";
  const checkinUrl = member && checkinSession
    ? `${appUrl}/app/checkin?member=${encodeURIComponent(member.id)}&email=${encodeURIComponent(email)}&class=${encodeURIComponent(checkinSession.id)}&date=${encodeURIComponent(checkinSession.date)}&time=${encodeURIComponent(checkinSession.time)}`
    : "";
  const qrUrl = checkinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=12&data=${encodeURIComponent(checkinUrl)}`
    : "";
  const canReserve = member ? isMembershipCurrent(member) : false;
  const tabHref = (target: AppTab) => `/app?email=${encodeURIComponent(email)}&tab=${target}`;
  const tabs: Array<{ key: AppTab; label: string; icon: typeof CalendarDays }> = [
    { key: "inicio", label: "Inicio", icon: CreditCard },
    { key: "reservas", label: "Reservas", icon: CalendarDays },
    { key: "wod", label: "WOD", icon: Dumbbell },
    { key: "tienda", label: "Tienda", icon: ShoppingBag },
    { key: "checkin", label: "Check-in", icon: CheckCircle2 }
  ];

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
                <span className="rounded-full bg-[#183b2d] px-3 py-1 text-xs font-black text-[#8cf0bd]">{memberStatusCopy[member.status] ?? member.status}</span>
              </div>
            </div>

            {status ? (
              <div className="mb-4 rounded-lg border border-[#f4c430]/40 bg-[#f4c430]/10 p-3 text-sm font-bold text-[#ffe58a]">
                {statusCopy[status] ?? statusCopy.error}
              </div>
            ) : null}

            {!canReserve ? (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-4">
                <p className="font-black text-red-100">Membresia vencida o pausada</p>
                <p className="mt-1 text-sm text-[#ffd6d6]">
                  Para reservar clases debes realizar tu pago o pedir a recepcion que reactive tu membresia.
                </p>
              </div>
            ) : null}

            <div className="mb-4 grid grid-cols-5 gap-2 rounded-lg border border-[#272b35] bg-[#11141a] p-2">
              {tabs.map((item) => (
                <a
                  key={item.key}
                  className={`grid min-h-14 place-items-center rounded-md px-1 text-center text-[11px] font-black transition ${tab === item.key ? "bg-[#f4c430] text-black" : "text-[#aab0bd] hover:bg-[#1a1e27] hover:text-[#f4c430]"}`}
                  href={tabHref(item.key)}
                >
                  <item.icon size={16} />
                  {item.label}
                </a>
              ))}
            </div>

            {tab === "inicio" ? (
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
                  <p className="mt-1 text-xl font-black">{checkinSession ? "QR listo" : "Bloqueado"}</p>
                  <a className="mt-2 block text-xs font-bold text-[#f4c430]" href={tabHref("checkin")}>
                    {checkinSession ? "Mostrar codigo" : "Ver regla"}
                  </a>
                </div>
                <a href={tabHref("reservas")} className="rounded-lg border border-[#272b35] bg-[#11141a] p-4 transition hover:border-[#f4c430]">
                  <CalendarDays className="mb-3 text-[#8cf0bd]" size={20} />
                  <p className="text-xs font-black uppercase tracking-[.16em] text-[#aab0bd]">Reservas</p>
                  <p className="mt-1 text-xl font-black">{sessions.filter((item) => item.isReserved).length}</p>
                  <p className="text-xs text-[#aab0bd]">Clases apartadas</p>
                </a>
                <a href={tabHref("tienda")} className="rounded-lg border border-[#272b35] bg-[#11141a] p-4 transition hover:border-[#f4c430]">
                  <ShoppingBag className="mb-3 text-[#f4c430]" size={20} />
                  <p className="text-xs font-black uppercase tracking-[.16em] text-[#aab0bd]">Tienda</p>
                  <p className="mt-1 text-xl font-black">{products.length}</p>
                  <p className="text-xs text-[#aab0bd]">Productos disponibles</p>
                </a>
              </div>
            ) : null}

            {tab === "wod" ? (
            <div id="wod" className="mb-4 scroll-mt-4 rounded-lg border border-[#272b35] bg-[#11141a] p-4">
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
            ) : null}

            {tab === "checkin" ? (
            <div id="qr-checkin" className="mb-4 scroll-mt-4 rounded-lg border border-[#272b35] bg-[#11141a] p-4 text-center">
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#f4c430]">Check-in rapido</p>
              {checkinSession ? (
                <>
                  <h3 className="mt-1 text-xl font-black">Escanea al llegar</h3>
                  <p className="mt-1 text-sm text-[#aab0bd]">
                    Disponible para {checkinSession.name} de {checkinSession.time.slice(0, 5)}. Se activa solo 20 minutos antes.
                  </p>
                  <div className="mx-auto my-4 grid w-fit place-items-center rounded-lg bg-white p-3">
                    <img alt="QR de check-in" className="h-52 w-52" src={qrUrl} />
                  </div>
                  <p className="text-xs text-[#aab0bd]">Recepcion o coach escanea este codigo para registrar asistencia de la clase reservada.</p>
                </>
              ) : (
                <>
                  <h3 className="mt-1 text-xl font-black">QR disponible 20 min antes</h3>
                  <p className="mt-2 text-sm text-[#aab0bd]">
                    Reserva una clase y vuelve dentro de los 20 minutos previos al inicio. Fuera de esa ventana el codigo permanece oculto.
                  </p>
                </>
              )}
            </div>
            ) : null}

            {tab === "tienda" ? (
            <div id="tienda" className="mb-4 scroll-mt-4 rounded-lg border border-[#272b35] bg-[#11141a] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="text-[#f4c430]" size={20} />
                  <h3 className="font-black">Tienda del box</h3>
                </div>
                <span className="text-xs font-bold text-[#aab0bd]">{products.length} productos</span>
              </div>

              {creditRequests.length ? (
                <div className="mb-3 grid gap-2">
                  {creditRequests.map((request) => (
                    <div key={request.id} className="rounded-md border border-[#272b35] bg-black/20 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <strong>{request.product}</strong>
                        <span className="rounded-full bg-[#303541] px-2 py-1 text-xs font-black text-[#f8f3e6]">
                          {creditStatusCopy[request.status] ?? request.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[#aab0bd]">{request.quantity} pza · {money(Number(request.total ?? 0))}</p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="grid gap-3">
                {products.length ? products.map((product) => (
                  <article key={product.id} className="rounded-md border border-[#272b35] bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">{product.equipment}</p>
                        <p className="text-sm text-[#aab0bd]">{product.category ?? "Producto"} · {Number(product.quantity ?? 0)} disponibles</p>
                      </div>
                      <p className="font-black text-[#f4c430]">{Number(product.estimated_cost ?? 0) > 0 ? money(Number(product.estimated_cost)) : "Precio en recepcion"}</p>
                    </div>
                    <form action={requestCredit} className="mt-3 grid grid-cols-[76px_1fr] gap-2">
                      <input type="hidden" name="member_id" value={member.id} />
                      <input type="hidden" name="inventory_id" value={product.id} />
                      <input type="hidden" name="email" value={email} />
                      <input className="min-h-11 rounded-md border border-[#272b35] bg-[#050506] px-3 text-center font-black" min="1" max={Number(product.quantity ?? 1)} name="quantity" type="number" defaultValue="1" />
                      <button className="min-h-11 rounded-md border border-[#f4c430] bg-[#f4c430] font-black text-black" type="submit">
                        Pedir fiado
                      </button>
                    </form>
                  </article>
                )) : (
                  <p className="rounded-md border border-[#272b35] bg-black/20 p-3 text-sm text-[#aab0bd]">
                    Aun no hay productos con inventario disponible.
                  </p>
                )}
              </div>
            </div>
            ) : null}

            {tab === "reservas" ? (
            <>
            <div id="reservas" className="mb-3 flex scroll-mt-4 items-center justify-between">
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
                      disabled={!canReserve || item.isReserved || item.spotsLeft <= 0}
                      type="submit"
                    >
                      {!canReserve ? "Paga tu membresia para reservar" : item.isReserved ? "Reservada" : item.spotsLeft <= 0 ? "Clase llena" : "Reservar lugar"}
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
            ) : null}
          </>
        )}

        <nav className="sticky bottom-0 -mx-5 mt-auto grid grid-cols-3 gap-2 border-t border-[#272b35] bg-[#050506]/95 px-5 py-3 text-center text-xs font-bold text-[#aab0bd] backdrop-blur">
          <a className={`rounded-md py-2 transition hover:bg-[#11141a] hover:text-[#f4c430] ${tab === "reservas" ? "text-[#f4c430]" : ""}`} href={tabHref("reservas")}>
            <CalendarDays className="mx-auto mb-1" size={16} />
            Reservas
          </a>
          <a className={`rounded-md py-2 transition hover:bg-[#11141a] hover:text-[#f4c430] ${tab === "tienda" ? "text-[#f4c430]" : ""}`} href={tabHref("tienda")}>
            <ShoppingBag className="mx-auto mb-1" size={16} />
            Tienda
          </a>
          <a className={`rounded-md py-2 transition hover:bg-[#11141a] hover:text-[#f4c430] ${tab === "checkin" ? "text-[#f4c430]" : ""}`} href={tabHref("checkin")}>
            <CheckCircle2 className="mx-auto mb-1" size={16} />
            Check-in
          </a>
        </nav>
      </section>
    </main>
  );
}
