import { requireAdmin } from "@/lib/admin";
import { RequestForm } from "@/components/request-form";
export default async function NewRequest() {
  await requireAdmin();
  return <RequestForm type="NEED_BASED" manual />;
}
