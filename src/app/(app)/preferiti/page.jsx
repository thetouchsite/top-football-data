import Favorites from "@/screens/Favorites";
import { requireAuthenticatedPage } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  await requireAuthenticatedPage("/preferiti");
  return <Favorites />;
}
