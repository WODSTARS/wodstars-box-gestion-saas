import { CrudPage } from "@/components/crud/crud-page";
import { modules } from "@/lib/data/tables";

export default function PaymentsPage() {
  return <CrudPage config={modules.payments} />;
}
