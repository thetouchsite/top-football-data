import Admin from "@/screens/Admin";
import { requireAdminPage } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdminPage("/admin");
  return <Admin />;
}
