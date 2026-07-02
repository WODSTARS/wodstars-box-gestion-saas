import { CrudPage } from "@/components/crud/crud-page";
import { modules } from "@/lib/data/tables";

export default function TasksPage() {
  return <CrudPage config={modules.tasks} />;
}
