import { createPlatformUser, updatePlatformUser } from "@/lib/data/actions";
import { assertBoxAccess, canWrite, getAppSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type BoxRow = {
  id: string;
  name: string;
  slug: string;
};

type ProfileRow = {
  id: string;
  box_id: string | null;
  full_name: string;
  role: string;
  active: boolean;
  is_superadmin: boolean;
};

const roles = [
  { value: "owner", label: "Dueño" },
  { value: "admin", label: "Administrador" },
  { value: "reception", label: "Recepcion" },
  { value: "coach", label: "Coach" }
];

function roleLabel(value: string) {
  return roles.find((role) => role.value === value)?.label ?? value;
}

export default async function UsersPage() {
  const session = await getAppSession();
  assertBoxAccess(session);
  const writable = session.isSuperadmin || canWrite(session.role);
  const admin = createSupabaseAdminClient();

  const [{ data: boxes }, { data: profiles }, authUsers] = await Promise.all([
    admin.from("boxes").select("id, name, slug").order("name", { ascending: true }),
    session.isSuperadmin
      ? admin.from("profiles").select("id, box_id, full_name, role, active, is_superadmin").order("created_at", { ascending: false })
      : admin.from("profiles").select("id, box_id, full_name, role, active, is_superadmin").eq("box_id", session.boxId).order("created_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);

  const boxRows = (boxes ?? []) as BoxRow[];
  const rows = ((profiles ?? []) as ProfileRow[]).filter((profile) => !profile.is_superadmin || session.isSuperadmin);
  const emailById = new Map(authUsers.data.users.map((user) => [user.id, user.email ?? ""]));
  const currentBox = session.boxId ? boxRows.find((box) => box.id === session.boxId) : null;

  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-black uppercase tracking-[.18em] text-wod-gold">Accesos y roles</p>
        <h1 className="text-3xl font-black">Usuarios</h1>
        <p className="mt-1 text-wod-muted">
          Crea usuarios para {session.isSuperadmin ? "cualquier box" : currentBox?.name ?? "este box"} y define que pueden hacer.
        </p>
      </div>

      {writable ? (
        <Card>
          <CardBody>
            <details>
              <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-wod-gold bg-wod-gold px-4 text-sm font-black text-black transition hover:bg-[#ffdc5a]">
                Crear usuario
              </summary>
              <form action={createPlatformUser} className="mt-4 grid gap-3 border-t border-wod-line pt-4 md:grid-cols-2">
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
                  <input name="password" type="password" required minLength={6} placeholder="Minimo 6 caracteres" />
                </label>
                <label className="grid gap-2 text-sm font-bold">
                  Rol
                  <select name="role" defaultValue="coach">
                    {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                  </select>
                </label>
                {session.isSuperadmin ? (
                  <label className="grid gap-2 text-sm font-bold md:col-span-2">
                    Box
                    <select name="box_id" required defaultValue={session.boxId ?? boxRows[0]?.id ?? ""}>
                      {boxRows.map((box) => <option key={box.id} value={box.id}>{box.name} · {box.slug}</option>)}
                    </select>
                  </label>
                ) : (
                  <input type="hidden" name="box_id" value={session.boxId ?? ""} />
                )}
                <Button variant="primary" className="md:col-span-2">Crear acceso</Button>
              </form>
            </details>
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-black">Usuarios registrados</h2>
          <span className="text-sm text-wod-muted">{rows.length} resultados</span>
        </CardHeader>
        <CardBody className="grid gap-3">
          {rows.map((profile) => {
            const box = boxRows.find((item) => item.id === profile.box_id);
            return (
              <div key={profile.id} className="rounded-md border border-wod-line bg-black/20 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-black">{profile.full_name}</h3>
                    <p className="text-sm text-wod-muted">{emailById.get(profile.id) || "Sin email visible"} · {box?.name ?? "Sin box"}</p>
                  </div>
                  <Badge tone={profile.active ? "green" : "red"}>{profile.active ? "Activo" : "Bloqueado"}</Badge>
                </div>

                <details className="mt-3">
                  <summary className="inline-flex min-h-10 cursor-pointer items-center rounded-md border border-wod-line bg-wod-panel2 px-3 text-sm font-black transition hover:border-wod-gold hover:text-wod-gold">
                    Editar usuario
                  </summary>
                  <form action={updatePlatformUser.bind(null, profile.id)} className="mt-3 grid gap-3 rounded-md border border-wod-line bg-black/30 p-3 md:grid-cols-2">
                    <label className="grid gap-2 text-sm font-bold">
                      Nombre
                      <input name="full_name" required defaultValue={profile.full_name} />
                    </label>
                    <label className="grid gap-2 text-sm font-bold">
                      Rol
                      <select name="role" defaultValue={profile.role}>
                        {roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                    </label>
                    {session.isSuperadmin ? (
                      <label className="grid gap-2 text-sm font-bold">
                        Box
                        <select name="box_id" required defaultValue={profile.box_id ?? ""}>
                          {boxRows.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.slug}</option>)}
                        </select>
                      </label>
                    ) : (
                      <input type="hidden" name="box_id" value={session.boxId ?? ""} />
                    )}
                    <label className="flex items-center gap-2 self-end text-sm font-bold">
                      <input name="active" type="checkbox" className="h-5 w-5" defaultChecked={profile.active} />
                      Usuario activo
                    </label>
                    <Button variant="primary" className="md:col-span-2">Guardar usuario</Button>
                  </form>
                </details>

                <p className="mt-3 text-xs font-bold uppercase tracking-[.14em] text-wod-gold">{roleLabel(profile.role)}</p>
              </div>
            );
          })}
        </CardBody>
      </Card>
    </div>
  );
}
