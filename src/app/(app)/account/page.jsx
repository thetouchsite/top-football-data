import Account from "@/screens/Account";
import { requireAuthenticatedPage } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  await requireAuthenticatedPage("/account");
  return <Account />;
}
