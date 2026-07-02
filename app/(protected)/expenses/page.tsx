import { CrudPage } from "@/components/crud/crud-page";
import { modules } from "@/lib/data/tables";

export default function ExpensesPage() {
  return <CrudPage config={modules.expenses} />;
}
