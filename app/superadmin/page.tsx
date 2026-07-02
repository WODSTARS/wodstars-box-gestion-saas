import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/auth/session";
import { createBox, createPlatformUser, deletePlatformUser, updateBoxStatus, updatePlatformUser } from "@/lib/data/actions";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const statuses = [
  { value: "trial", label: "Prueba" },
  { value: "active", label: "Activo" },
  { value: "past_due", label: "Pago pendiente" },
  { value: "suspended", label: "Suspendido" },
  { value: "cancelled", label: "Cancelado" }
];

const roles = [
  { value: "owner", label: "Dueno" },
  { value: "admin", label: "Administrador" },
  { value: "reception", label: "Recepcion" },
  { value: "coach", label: "Coach" }
];

const statusLabels: Record<string, string> = {
  active: "Activo",
  cancelled: "Cancelado",
  past_due: "Pago pendiente",
  suspended: "Suspendido",
  trial: "Prueba"
};

export default async function SuperadminPage() {
  const session = await getAppSession();
  if (!session.isSuperadmin) redirect("/dashboard");

  const supabase = await createSupabaseServerClient();
  const admin = createSupabaseAdminClient();

  const [{ data: boxes }, { data: profiles }, authUsers] = await Promise.all([
    supabase.from("boxes").select("id,name,slug,plan,subscription_status,subscription_due_date,created_at"),
    supabase.from("profiles").select("id,box_id,full_name,role,active,is_superadmin"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);
  const emailById = new Map(authUsers.data.users.map((user) => [user.id, user.email ?? ""]));

  return (
    <main className="min-h-screen p-6">
      <div className="mb-6">
        <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">WodStars Control Center</p>
        <h1 className="text-4xl font-black">Superadmin</h1>
        <p className="mt-2 text-wod-muted">Control remoto de boxes, pagos, planes y bloqueos.</p>
      </div>

      <div className="grid gap-5">
        <Card>
          <CardBody>
            <details>
              <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-wod-gold bg-wod-gold px-4 text-sm font-black text-black transition hover:bg-[#ffdc5a]">
                Crear CrossFit independiente
              </summary>
              <form action={createBox} className="mt-4 grid gap-3 border-t border-wod-line pt-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-bold">
                  Nombre del box
                  <input name="name" required placeholder="Iron Temple" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Slug
                  <input name="slug" placeholder="iron-temple" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Email
                  <input name="email" type="email" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Telefono
                  <input name="phone" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Plan
                  <input name="plan" defaultValue="starter" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Vencimiento
                  <input name="subscription_due_date" type="date" />
                </label>
                <Button variant="primary" className="md:col-span-2">Crear box</Button>
              </form>
            </details>
          </CardBody>
        </Card>

        {(boxes ?? []).map((box) => {
          const users = (profiles ?? []).filter((profile) => profile.box_id === box.id);
          const tone = box.subscription_status === "active" ? "green" : box.subscription_status === "past_due" ? "gold" : box.subscription_status === "trial" ? "blue" : "red";

          return (
            <Card key={box.id}>
              <CardHeader>
                <div>
                  <h2 className="text-xl font-black">{box.name}</h2>
                  <p className="text-sm text-wod-muted">{box.slug} · {users.length} usuarios</p>
                </div>
                <Badge tone={tone}>{statusLabels[box.subscription_status] ?? box.subscription_status}</Badge>
              </CardHeader>
              <CardBody className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <div className="grid gap-2">
                  <details className="rounded-md border border-wod-line bg-black/20 p-3">
                    <summary className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-wod-gold bg-wod-gold px-3 text-sm font-black text-black transition hover:bg-[#ffdc5a]">
                      Crear usuario para este box
                    </summary>
                    <form action={createPlatformUser} className="mt-3 grid gap-3 border-t border-wod-line pt-3 md:grid-cols-2">
                      <input type="hidden" name="box_id" value={box.id} />
                      <label className="grid gap-2 text-sm font-bold">
                        Nombre
                        <input name="full_name" required placeholder="Coach Valeria" />
                      </label>
                      <label className="grid gap-2 text-sm font-bold">
                        Email
                        <input name="email" type="email" required placeholder="coach@box.com" />
                      </label>
                      <label className="grid gap-2 text-sm font-bold">
                        Contraseña temporal
                        <input name="password" type="password" required minLength={6} />
                      </label>
                      <label className="grid gap-2 text-sm font-bold">
                        Rol
                        <select name="role" defaultValue="owner">
                          {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                        </select>
                      </label>
                      <Button variant="primary" className="md:col-span-2">Crear usuario</Button>
                    </form>
                  </details>

                  {users.map((user) => (
                    <div key={user.id} className="rounded-md border border-wod-line bg-black/20 p-3">
                      <strong>{user.full_name}</strong>
                      <p className="text-sm text-wod-muted">{user.role} · {user.active ? "activo" : "bloqueado"} · {emailById.get(user.id) ?? ""}</p>
                      <details className="mt-3">
                        <summary className="inline-flex min-h-9 cursor-pointer items-center rounded-md border border-wod-line bg-wod-panel2 px-3 text-xs font-black transition hover:border-wod-gold hover:text-wod-gold">
                          Editar usuario
                        </summary>
                        <form action={updatePlatformUser.bind(null, user.id)} className="mt-3 grid gap-3 rounded-md border border-wod-line bg-black/30 p-3 md:grid-cols-2">
                          <input type="hidden" name="box_id" value={box.id} />
                          <label className="grid gap-2 text-sm font-bold">
                            Nombre
                            <input name="full_name" required defaultValue={user.full_name} />
                          </label>
                          <label className="grid gap-2 text-sm font-bold">
                            Email
                            <input name="email" type="email" defaultValue={emailById.get(user.id) ?? ""} />
                          </label>
                          <label className="grid gap-2 text-sm font-bold">
                            Nueva contraseña
                            <input name="password" type="password" minLength={6} placeholder="Dejar vacio para no cambiar" />
                          </label>
                          <label className="grid gap-2 text-sm font-bold">
                            Rol
                            <select name="role" defaultValue={user.role}>
                              {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-sm font-bold">
                            <input name="active" type="checkbox" className="h-5 w-5" defaultChecked={user.active} />
                            Usuario activo
                          </label>
                          <Button variant="primary" className="md:col-span-2">Guardar usuario</Button>
                        </form>
                        {user.id !== session.userId ? (
                          <form action={deletePlatformUser.bind(null, user.id)} className="mt-3">
                            <Button variant="danger">Eliminar usuario</Button>
                          </form>
                        ) : null}
                      </details>
                    </div>
                  ))}
                </div>

                <form action={updateBoxStatus} className="grid gap-3 rounded-md border border-wod-line bg-black/20 p-3">
                  <input type="hidden" name="box_id" value={box.id} />
                  <label className="grid gap-2 text-sm font-bold">
                    Estado
                    <select name="subscription_status" defaultValue={box.subscription_status}>
                      {statuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Plan
                    <input name="plan" defaultValue={box.plan} />
                  </label>
                  <label className="grid gap-2 text-sm font-bold">
                    Vencimiento
                    <input name="subscription_due_date" type="date" defaultValue={box.subscription_due_date ?? ""} />
                  </label>
                  <Button variant="primary">Guardar cambios</Button>
                </form>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
