import Following from "@/screens/Following";
import { requireAuthenticatedPage } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function FollowingPage() {
  await requireAuthenticatedPage("/seguiti");
  return <Following />;
}
