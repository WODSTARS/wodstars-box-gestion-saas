import { CrudPage } from "@/components/crud/crud-page";
import { modules } from "@/lib/data/tables";

export default function AttendancePage() {
  return <CrudPage config={modules.attendance} />;
}
