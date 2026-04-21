import { MessageCircle, ShieldCheck, Bell, Link2 } from "lucide-react";

const items = [
  {
    icon: MessageCircle,
    title: "Funzione del bot",
    description: "Invio aggiornamenti e messaggi informativi collegati alla piattaforma.",
  },
  {
    icon: ShieldCheck,
    title: "Dati trattati",
    description: "Identificativi e preferenze minime necessarie al servizio, da validare legalmente.",
  },
  {
    icon: Bell,
    title: "Notifiche",
    description: "Logica di frequenza e contenuti prevista con opzioni di revoca.",
  },
  {
    icon: Link2,
    title: "Policy collegate",
    description: "Rimandi diretti a privacy, cookie, termini e contatti.",
  },
];

export default function TelegramPolicyHighlights() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {items.map((item) => (
        <article key={item.title} className="rounded-xl border border-border/40 bg-secondary/10 p-4">
          <div className="flex items-center gap-2">
            <item.icon className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
        </article>
      ))}
    </div>
  );
}
