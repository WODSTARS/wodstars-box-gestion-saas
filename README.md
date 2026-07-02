# WodStars Box Gestión SaaS

Plataforma profesional multi-box para administrar boxes de CrossFit con Next.js, TypeScript, Tailwind CSS, Supabase, Row Level Security, panel superadmin y bloqueo remoto por suscripción.

## Arquitectura

- Frontend y backend web: Next.js App Router.
- Lenguaje: TypeScript.
- UI: Tailwind CSS con estilo premium oscuro, dorado y blanco.
- Autenticación: Supabase Auth.
- Base de datos: Supabase Postgres.
- Seguridad multi-box: todas las tablas operativas usan `box_id` y políticas RLS.
- Roles: dueño, admin, recepción, coach y superadmin WodStars.
- Suscripciones: preparada para Stripe y Mercado Pago.
- Deploy recomendado: Vercel.

## Módulos incluidos

- Login protegido.
- Dashboard ejecutivo.
- Socios y membresías.
- Pagos e ingresos.
- Ventas.
- Gastos operativos.
- Asistencia.
- Clases.
- WODs.
- Staff.
- Inventario.
- Tareas.
- Configuración del box.
- Respaldos manuales y ruta para respaldo automático diario.
- Panel privado de superadmin WodStars.
- Pantalla de bloqueo por falta de pago.
- Exportación CSV, exportación JSON e importación JSON en módulos CRUD.

## Estados de suscripción

- `trial`: acceso completo.
- `active`: acceso completo.
- `past_due`: acceso permitido con aviso amarillo.
- `suspended`: dashboard bloqueado.
- `cancelled`: dashboard bloqueado.

El bloqueo se valida leyendo el estado del box desde Supabase. No depende solo del frontend.

## Instalación local

Requisitos:

- Node.js 20 o superior.
- npm o pnpm.
- Proyecto creado en Supabase.

Instala dependencias:

```bash
pnpm install
```

O con npm:

```bash
npm install
```

Copia variables de entorno:

```bash
cp .env.example .env.local
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Llena `.env.local` con tus claves reales.

## Variables de entorno

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PAYMENT_LINK=
MERCADO_PAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADO_PAGO_PAYMENT_LINK=
NEXT_PUBLIC_SUPPORT_EMAIL=
CRON_SECRET=
```

## Base de datos Supabase

Ejecuta las migraciones en este orden desde Supabase SQL Editor o Supabase CLI:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_seed_demo.sql`
4. `supabase/migrations/004_sales_expenses_backups.sql`

Tablas principales:

- `boxes`
- `profiles`
- `subscriptions`
- `members`
- `payments`
- `sales`
- `expenses`
- `attendance`
- `classes`
- `wods`
- `staff`
- `inventory`
- `tasks`
- `backups`

## Respaldos

Desde `/settings` puedes generar una copia de seguridad manual del box. También existe una ruta lista para Vercel Cron:

```text
GET /api/cron/daily-backup
```

Configura `CRON_SECRET` y llama la ruta con:

```text
Authorization: Bearer TU_CRON_SECRET
```

Ejemplo de `vercel.json` opcional:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-backup",
      "schedule": "0 7 * * *"
    }
  ]
}
```

## Superadmin

El superadmin puede entrar a `/superadmin` y administrar todos los boxes:

- Ver boxes registrados.
- Ver estado de pago.
- Activar, suspender o cancelar boxes.
- Cambiar plan.
- Cambiar fecha de vencimiento.
- Ver usuarios por box.

Para crear un superadmin, registra el usuario en Supabase Auth y cambia su perfil a:

```sql
update profiles
set role = 'superadmin'
where email = 'tu-correo@wodstars.com';
```

## Pagos y webhooks

Stripe:

- Endpoint webhook: `/api/webhooks/stripe`
- Actualiza `boxes.subscription_status`.
- Actualiza `subscriptions.status`.
- Usa `metadata.box_id` en la suscripción de Stripe para vincular el pago al box.

Mercado Pago:

- Endpoint base: `/api/webhooks/mercado-pago`
- La ruta está preparada como punto de entrada.
- Falta conectar el mapeo final según el tipo de preferencia, plan y metadata que uses en Mercado Pago.

## Ejecutar

```bash
pnpm dev
```

O:

```bash
npm run dev
```

Abre:

```text
http://localhost:3000
```

## Verificación realizada

Este proyecto fue verificado con:

```bash
tsc --noEmit
next build
```

Ambas verificaciones pasaron correctamente.

Nota: para que la app corra localmente sin error 500 necesitas `.env.local` con claves reales de Supabase.

## Próximas etapas recomendadas

1. Conectar un proyecto real de Supabase.
2. Crear flujo de alta de box y dueño.
3. Completar integración final con Stripe o Mercado Pago.
4. Agregar app móvil para atletas.
5. Agregar reportes PDF y analítica avanzada.
