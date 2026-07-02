export type ModuleKey =
  | "members"
  | "payments"
  | "attendance"
  | "classes"
  | "wods"
  | "staff"
  | "inventory"
  | "tasks"
  | "sales"
  | "expenses";

export type FieldType = "text" | "email" | "number" | "date" | "time" | "textarea" | "select" | "checkbox";

export type FieldConfig = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
};

export type ModuleConfig = {
  key: ModuleKey;
  title: string;
  table: string;
  description: string;
  columns: string[];
  fields: FieldConfig[];
};

export const modules: Record<ModuleKey, ModuleConfig> = {
  members: {
    key: "members",
    title: "Socios",
    table: "members",
    description: "Membresías, vencimientos, contactos y notas.",
    columns: ["name", "phone", "email", "plan", "monthly_amount", "end_date", "status"],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "phone", label: "Teléfono", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "photo_url", label: "Foto URL", type: "text" },
      { name: "plan", label: "Plan", type: "text", required: true },
      { name: "monthly_amount", label: "Monto mensual", type: "number" },
      { name: "start_date", label: "Inicio", type: "date", required: true },
      { name: "end_date", label: "Vencimiento", type: "date", required: true },
      { name: "status", label: "Estado", type: "select", options: ["active", "paused", "expired", "expiring"] },
      { name: "emergency_contact", label: "Emergencia", type: "text" },
      { name: "notes", label: "Notas", type: "textarea" }
    ]
  },
  payments: {
    key: "payments",
    title: "Pagos",
    table: "payments",
    description: "Mensualidades, drop-ins, métodos de pago y notas.",
    columns: ["date", "concept", "amount", "method", "notes"],
    fields: [
      { name: "date", label: "Fecha", type: "date", required: true },
      { name: "concept", label: "Concepto", type: "text", required: true },
      { name: "amount", label: "Monto", type: "number", required: true },
      { name: "method", label: "Método", type: "select", options: ["Efectivo", "Tarjeta", "Transferencia", "Mercado Pago", "Fiado", "Otro"] },
      { name: "notes", label: "Notas", type: "textarea" }
    ]
  },
  sales: {
    key: "sales",
    title: "Ventas",
    table: "sales",
    description: "Productos del box: aguas, suplementos, snacks y mercancía.",
    columns: ["date", "product", "quantity", "unit_price", "total", "method"],
    fields: [
      { name: "date", label: "Fecha", type: "date", required: true },
      { name: "product", label: "Producto", type: "text", required: true },
      { name: "quantity", label: "Cantidad", type: "number", required: true },
      { name: "unit_price", label: "Precio unitario", type: "number", required: true },
      { name: "total", label: "Total", type: "number", required: true },
      { name: "method", label: "Método", type: "select", options: ["Efectivo", "Tarjeta", "Transferencia", "Mercado Pago", "Fiado", "Otro"] },
      { name: "notes", label: "Notas", type: "textarea" }
    ]
  },
  expenses: {
    key: "expenses",
    title: "Gastos",
    table: "expenses",
    description: "Gastos operativos, salarios, mantenimiento, compras e insumos.",
    columns: ["date", "category", "concept", "amount", "method"],
    fields: [
      { name: "date", label: "Fecha", type: "date", required: true },
      { name: "category", label: "Categoría", type: "select", options: ["Operativo", "Salarios", "Mantenimiento", "Inventario", "Renta", "Servicios", "Otro"] },
      { name: "concept", label: "Concepto", type: "text", required: true },
      { name: "amount", label: "Monto", type: "number", required: true },
      { name: "method", label: "Método", type: "select", options: ["Efectivo", "Tarjeta", "Transferencia", "Mercado Pago", "Otro"] },
      { name: "notes", label: "Notas", type: "textarea" }
    ]
  },
  attendance: {
    key: "attendance",
    title: "Asistencia",
    table: "attendance",
    description: "Check-ins por fecha, hora, socio y clase.",
    columns: ["date", "time", "member_id", "class_id"],
    fields: [
      { name: "member_id", label: "Socio ID", type: "text", required: true },
      { name: "class_id", label: "Clase ID", type: "text" },
      { name: "date", label: "Fecha", type: "date", required: true },
      { name: "time", label: "Hora", type: "time", required: true }
    ]
  },
  classes: {
    key: "classes",
    title: "Clases",
    table: "classes",
    description: "Horarios, coaches, cupos y ubicación.",
    columns: ["name", "type", "day", "time", "capacity", "location"],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "type", label: "Tipo", type: "text", required: true },
      { name: "day", label: "Día", type: "select", options: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] },
      { name: "time", label: "Hora", type: "time", required: true },
      { name: "capacity", label: "Capacidad", type: "number" },
      { name: "location", label: "Ubicación", type: "text" }
    ]
  },
  wods: {
    key: "wods",
    title: "WODs",
    table: "wods",
    description: "Programación diaria de entrenamientos.",
    columns: ["date", "name", "focus"],
    fields: [
      { name: "date", label: "Fecha", type: "date", required: true },
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "focus", label: "Enfoque", type: "text" },
      { name: "warmup", label: "Calentamiento", type: "textarea" },
      { name: "strength", label: "Fuerza", type: "textarea" },
      { name: "workout", label: "Workout", type: "textarea" },
      { name: "scaling", label: "Scaling", type: "textarea" }
    ]
  },
  staff: {
    key: "staff",
    title: "Staff",
    table: "staff",
    description: "Coaches, roles, certificaciones y tarifas.",
    columns: ["name", "role", "phone", "email", "rate", "active"],
    fields: [
      { name: "name", label: "Nombre", type: "text", required: true },
      { name: "role", label: "Rol", type: "text", required: true },
      { name: "phone", label: "Teléfono", type: "text" },
      { name: "email", label: "Email", type: "email" },
      { name: "certifications", label: "Certificaciones", type: "textarea" },
      { name: "rate", label: "Tarifa", type: "number" },
      { name: "active", label: "Activo", type: "checkbox" }
    ]
  },
  inventory: {
    key: "inventory",
    title: "Inventario",
    table: "inventory",
    description: "Equipo, estado, costos y mantenimiento.",
    columns: ["equipment", "category", "quantity", "estimated_cost", "status", "maintenance_date"],
    fields: [
      { name: "equipment", label: "Equipo", type: "text", required: true },
      { name: "category", label: "Categoría", type: "text" },
      { name: "quantity", label: "Cantidad", type: "number" },
      { name: "estimated_cost", label: "Precio/costo", type: "number" },
      { name: "status", label: "Estado", type: "select", options: ["Bueno", "Revisar", "Comprar", "Comprado", "Fuera de servicio"] },
      { name: "maintenance_date", label: "Mantenimiento", type: "date" },
      { name: "notes", label: "Notas", type: "textarea" }
    ]
  },
  tasks: {
    key: "tasks",
    title: "Tareas",
    table: "tasks",
    description: "Pendientes operativos del box.",
    columns: ["title", "owner", "due_date", "status", "priority"],
    fields: [
      { name: "title", label: "Título", type: "text", required: true },
      { name: "owner", label: "Responsable", type: "text" },
      { name: "due_date", label: "Fecha límite", type: "date" },
      { name: "status", label: "Estado", type: "select", options: ["pending", "in_progress", "completed"] },
      { name: "priority", label: "Prioridad", type: "select", options: ["low", "medium", "high"] }
    ]
  }
};
