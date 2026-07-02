"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      className="inline-flex min-h-11 items-center gap-2 rounded-md border border-wod-line bg-wod-panel2 px-4 text-sm font-black hover:border-wod-gold hover:text-wod-gold"
      onClick={() => window.print()}
      type="button"
    >
      <Printer size={18} /> Descargar PDF
    </button>
  );
}
