import { CrudPage } from "@/components/crud/crud-page";
import { modules } from "@/lib/data/tables";

export default function WodsPage() {
  return <CrudPage config={modules.wods} />;
}
