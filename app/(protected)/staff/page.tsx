import { CrudPage } from "@/components/crud/crud-page";
import { modules } from "@/lib/data/tables";

export default function StaffPage() {
  return <CrudPage config={modules.staff} />;
}
