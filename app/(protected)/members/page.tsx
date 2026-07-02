import { CrudPage } from "@/components/crud/crud-page";
import { modules } from "@/lib/data/tables";

export default function MembersPage() {
  return <CrudPage config={modules.members} />;
}
