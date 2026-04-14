import Watchlist from "@/screens/Watchlist";
import { requireAuthenticatedPage } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function WatchlistPage() {
  await requireAuthenticatedPage("/watchlist");
  return <Watchlist />;
}
