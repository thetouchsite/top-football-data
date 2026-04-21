import PublicShell from "@/components/public/PublicShell";
import LegalTelegramBotPage from "@/screens/public/legal/LegalTelegramBotPage";

export const metadata = {
  title: "Policy Telegram Bot | Top Football Data",
  description:
    "Informativa dedicata al bot Telegram: dati trattati, notifiche, limiti servizio e collegamenti policy.",
  openGraph: {
    title: "Policy Telegram Bot | Top Football Data",
    description: "Pagina dedicata alla trasparenza sul bot e canale Telegram.",
    url: "/legal/telegram-bot",
  },
  alternates: {
    canonical: "/legal/telegram-bot",
  },
};

export default function LegalTelegramBotRoute() {
  return (
    <PublicShell>
      <LegalTelegramBotPage />
    </PublicShell>
  );
}
