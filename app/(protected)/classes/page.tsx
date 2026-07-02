import { CrudPage } from "@/components/crud/crud-page";
import { modules } from "@/lib/data/tables";

export default function ClassesPage() {
  return <CrudPage config={modules.classes} />;
}
