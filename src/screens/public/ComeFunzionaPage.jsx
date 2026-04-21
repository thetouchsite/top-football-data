import React from "react";
import { Link } from "@/lib/router-compat";
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Crown,
  Gauge,
  Goal,
  LineChart,
  MessageCircle,
  Send,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PublicPageFrame from "@/screens/public/PublicPageFrame";
import { trackConversionEvent } from "@/components/public/conversion-events";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const TELEGRAM_URL = String(process.env.NEXT_PUBLIC_TELEGRAM_URL || "").trim();

const markets = [
  "1X2",
  "Goal / No Goal",
  "Under / Over 1.5",
  "Under / Over 2.5",
  "Under / Over 3.5",
  "xG",
  "Probabilità modello",
  "Confronto quote",
  "Value bet",
];

const functionCards = [
  {
    title: "Dashboard",
    icon: BarChart3,
    text: "Una panoramica ordinata delle partite più interessanti, con i punti chiave già in evidenza.",
    points: [
      "Match in evidenza",
      "Probabilità principali",
      "Indicatori rapidi per priorità",
      "Lettura immediata anche da mobile",
    ],
  },
  {
    title: "Modelli Predittivi",
    icon: Brain,
    text: "Ti aiutano a capire meglio il match con probabilità, quote e segnali ad alto valore informativo.",
    points: [
      "Probabilità modello chiare",
      "Confronto con quote disponibili",
      "Value bet evidenziate",
      "Confidenza sintetica",
    ],
  },
  {
    title: "Analisi Statistica",
    icon: LineChart,
    text: "Approfondisci trend partita e dati giocatori dove disponibili, con una vista pulita e leggibile.",
    points: [
      "Statistiche partita",
      "Trend utili alla lettura",
      "Approfondimenti giocatori",
      "Contesto più completo",
    ],
  },
  {
    title: "Multi-Bet",
    icon: Trophy,
    text: "Una sezione pensata per costruire combinazioni in modo più ragionato e ordinato.",
    points: [
      "Selezioni guidate",
      "Più mercati confrontabili",
      "Visione d’insieme più chiara",
      "Esperienza premium più ampia",
    ],
  },
  {
    title: "Mercati e quote",
    icon: Target,
    text: "Non solo 1X2: puoi consultare diversi mercati in un’unica esperienza coerente.",
    points: [
      "Goal/No Goal",
      "Under/Over 1.5, 2.5, 3.5",
      "Confronto quote più rapido",
      "Lettura value più semplice",
    ],
  },
  {
    title: "xG e insight",
    icon: Gauge,
    text: "Una lettura più completa della partita con metriche e insight che aiutano a contestualizzare.",
    points: [
      "xG squadra",
      "Indicatori sintetici",
      "Focus su ciò che conta",
      "Meno rumore, più chiarezza",
    ],
  },
];

const steps = [
  {
    step: "01",
    title: "Selezioni la partita",
    text: "Apri il match e trovi subito probabilità, mercati e dati principali in una vista ordinata.",
    detail: "L’obiettivo è farti capire rapidamente dove vale la pena approfondire.",
  },
  {
    step: "02",
    title: "Confronti mercati e quote",
    text: "Valuti 1X2, Goal/No Goal, Under/Over e altri indicatori senza cambiare schermata in continuazione.",
    detail: "Tutto è costruito per ridurre tempo perso e confusione.",
  },
  {
    step: "03",
    title: "Leggi i segnali della piattaforma",
    text: "Vedi probabilità modello, differenze quota e insight utili per una lettura più consapevole.",
    detail: "Una sintesi concreta, non una pagina complicata.",
  },
  {
    step: "04",
    title: "Decidi con più chiarezza",
    text: "Hai una visione più completa e puoi concentrarti sulle partite davvero interessanti.",
    detail: "L’idea è aiutarti a scegliere meglio, non riempirti di informazioni inutili.",
  },
];

const benefits = [
  "Trovi subito i match più interessanti",
  "Confronti mercati e probabilità in meno tempo",
  "Leggi meglio 1X2, Goal/No Goal e Under/Over",
  "Hai una vista più ordinata delle partite",
  "Individui value e differenze quota più rapidamente",
  "Ti concentri su ciò che conta davvero",
];

const premiumRows = [
  {
    feature: "Panoramica match",
    free: "Base",
    premium: "Completa",
  },
  {
    feature: "Mercati e segnali",
    free: "Preview",
    premium: "Approfonditi",
  },
  {
    feature: "Probabilità e insight",
    free: "Essenziali",
    premium: "Più ricchi e dettagliati",
  },
  {
    feature: "Strumenti avanzati",
    free: "Limitati",
    premium: "Sbloccati",
  },
];

const faqItems = [
  {
    q: "Cosa posso analizzare dentro la piattaforma?",
    a: "Puoi analizzare partite, probabilità, mercati principali, quote, xG, trend e insight utili in una dashboard ordinata.",
  },
  {
    q: "Sono presenti solo mercati 1X2?",
    a: "No. Oltre al 1X2 puoi consultare Goal/No Goal e Under/Over (1.5, 2.5, 3.5), oltre ad altri indicatori di supporto.",
  },
  {
    q: "Posso vedere Goal/No Goal e Under/Over?",
    a: "Sì, sono inclusi nella lettura partita e sono parte centrale dell’esperienza di analisi.",
  },
  {
    q: "Che tipo di dati e statistiche trovo?",
    a: "Trovi probabilità modello, confronto quote, value bet, xG, statistiche match e insight dove disponibili.",
  },
  {
    q: "Cosa cambia tra Free e Premium?",
    a: "Free ti permette di iniziare con una panoramica base. Premium sblocca maggiore profondità, più segnali e strumenti avanzati.",
  },
  {
    q: "La piattaforma è adatta anche a chi vuole una lettura rapida?",
    a: "Sì. La UI è pensata per essere chiara e veloce anche per chi non vuole passare ore in analisi.",
  },
  {
    q: "Posso accedere anche da mobile?",
    a: "Sì, la piattaforma è responsive e utilizzabile da smartphone e tablet.",
  },
  {
    q: "Come entro nel canale Telegram?",
    a: "Dalla sezione Telegram della pagina trovi il pulsante diretto per entrare nel canale ufficiale.",
  },
];

export default function ComeFunzionaPage() {
  const telegramHref = TELEGRAM_URL || "#telegram";

  return (
    <PublicPageFrame
      title="Come funziona Top Football Data"
      subtitle="Una sola pagina, chiara e completa, per capire subito cosa puoi ottenere dalla piattaforma."
    >
      <section className="mb-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-secondary/20 to-background p-5 md:p-7">
        <div className="grid gap-7 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="font-orbitron text-3xl font-black leading-tight text-foreground md:text-5xl">
              Analizza le partite con dati chiari, modelli previsionali e mercati chiave in un’unica piattaforma.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
              Consulta 1X2, Goal/No Goal, Under/Over, xG, value bet e statistiche in una dashboard ordinata, veloce e facile da leggere.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {markets.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-border/40 bg-secondary/20 px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {item}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <a href="#premium" onClick={() => trackConversionEvent("click_premium_cta", { source: "come_funziona_hero" })}>
                <Button className="font-semibold">Scopri il Premium</Button>
              </a>
              <a href="#funzioni">
                <Button variant="outline" className="font-semibold">Guarda le funzioni</Button>
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/40 p-4 shadow-[0_12px_28px_rgba(0,0,0,0.2)]">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold text-accent">Match in evidenza</span>
              <span className="text-muted-foreground">20:45</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">Inter vs Milan</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg border border-border/40 bg-secondary/25 px-2 py-2">
                <div className="text-muted-foreground">1X2</div>
                <div className="font-semibold text-primary">45 / 28 / 27</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-secondary/25 px-2 py-2">
                <div className="text-muted-foreground">U/O 2.5</div>
                <div className="font-semibold text-primary">57 / 43</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-secondary/25 px-2 py-2">
                <div className="text-muted-foreground">GG/NG</div>
                <div className="font-semibold text-primary">61 / 39</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg border border-border/40 bg-secondary/25 px-2 py-2">
                <div className="text-muted-foreground">xG</div>
                <div className="font-semibold text-foreground">1.74 - 1.28</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-secondary/25 px-2 py-2">
                <div className="text-muted-foreground">Value</div>
                <div className="font-semibold text-accent">+8% 1</div>
              </div>
              <div className="rounded-lg border border-border/40 bg-secondary/25 px-2 py-2">
                <div className="text-muted-foreground">Confidenza</div>
                <div className="font-semibold text-primary">83%</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sticky top-16 z-20 mb-14 border-y border-border/40 bg-background/80 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <a href="#funzioni" className="rounded-full bg-secondary/30 px-3 py-1 text-muted-foreground hover:text-foreground">Funzioni</a>
          <a href="#vantaggi" className="rounded-full bg-secondary/30 px-3 py-1 text-muted-foreground hover:text-foreground">Vantaggi</a>
          <a href="#premium" className="rounded-full bg-secondary/30 px-3 py-1 text-muted-foreground hover:text-foreground">Premium</a>
          <a href="#telegram" className="rounded-full bg-secondary/30 px-3 py-1 text-muted-foreground hover:text-foreground">Telegram</a>
          <a href="#faq" className="rounded-full bg-secondary/30 px-3 py-1 text-muted-foreground hover:text-foreground">FAQ</a>
        </div>
      </section>

      <section id="funzioni" className="scroll-mt-36 mb-16 border-t border-border/30 pt-8 md:mb-20 md:pt-10">
        <h2 className="font-orbitron text-2xl font-bold text-foreground md:text-3xl">Tutto quello che ti serve per analizzare una partita</h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Una vista completa per capire meglio i mercati, confrontare quote e leggere i match con più ordine.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {functionCards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-border/40 bg-secondary/10 p-5">
              <div className="mb-2 flex items-center gap-2">
                <card.icon className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">{card.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{card.text}</p>
              <div className="mt-3 space-y-1.5">
                {card.points.map((item) => (
                  <div key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-16 border-t border-border/30 pt-8 md:mb-20 md:pt-10">
        <h2 className="font-orbitron text-2xl font-bold text-foreground md:text-3xl">Come funziona, in 4 passaggi semplici</h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Una logica lineare e comprensibile: apri il match, leggi i dati giusti, confronti i mercati, prendi una decisione più consapevole.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step) => (
            <article key={step.step} className="rounded-2xl border border-border/40 bg-secondary/10 p-5">
              <div className="mb-2 text-2xl font-black text-primary">{step.step}</div>
              <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              <p className="mt-2 text-xs text-foreground/80">{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="vantaggi" className="scroll-mt-36 mb-16 border-t border-border/30 pt-8 md:mb-20 md:pt-10">
        <h2 className="font-orbitron text-2xl font-bold text-foreground md:text-3xl">Perché usarla</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {benefits.map((item) => (
            <article key={item} className="rounded-xl border border-border/40 bg-secondary/10 px-4 py-3">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{item}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="premium" className="scroll-mt-36 mb-16 border-t border-border/30 pt-8 md:mb-20 md:pt-10">
        <h2 className="font-orbitron text-2xl font-bold text-foreground md:text-3xl">Cosa sblocchi con Premium</h2>
        <p className="mt-2 text-sm text-muted-foreground md:text-base">
          Il piano Free ti dà una base utile. Con Premium hai un’esperienza più completa e strumenti più avanzati.
        </p>
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/40">
          <div className="grid grid-cols-[1.2fr_1fr_1fr] bg-secondary/20 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div>Funzionalità</div>
            <div className="text-center">Free</div>
            <div className="text-center text-primary">Premium</div>
          </div>
          {premiumRows.map((row) => (
            <div key={row.feature} className="grid grid-cols-[1.2fr_1fr_1fr] border-t border-border/30 px-4 py-3 text-sm">
              <div className="text-foreground">{row.feature}</div>
              <div className="text-center text-muted-foreground">{row.free}</div>
              <div className="text-center font-semibold text-primary">{row.premium}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="telegram" className="scroll-mt-36 mb-16 border-t border-border/30 pt-8 md:mb-20 md:pt-10">
        <div className="rounded-2xl border border-border/40 bg-secondary/10 p-6">
        <h2 className="font-orbitron text-2xl font-bold text-foreground md:text-3xl">Resta aggiornato anche su Telegram</h2>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground md:text-base">
          Ricevi aggiornamenti rapidi, novità sulla piattaforma e un collegamento diretto tra esperienza web e community.
        </p>
        <div className="mt-4">
          <a
            href={telegramHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackConversionEvent("click_telegram_cta", { source: "come_funziona_telegram_section" })}
          >
            <Button className="font-semibold">
              <Send className="mr-1 h-4 w-4" />
              Entra nel canale Telegram
            </Button>
          </a>
        </div>
        </div>
      </section>

      <section id="faq" className="scroll-mt-36 mb-16 border-t border-border/30 pt-8 md:mb-20 md:pt-10">
        <h2 className="font-orbitron text-2xl font-bold text-foreground md:text-3xl">FAQ</h2>
        <div className="mt-4 rounded-2xl border border-border/40 bg-secondary/10 px-4 md:px-6">
          <Accordion type="single" collapsible>
            {faqItems.map((item, index) => (
              <AccordionItem key={item.q} value={`faq-${index}`} className="border-border/30">
                <AccordionTrigger className="text-sm text-foreground hover:no-underline">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="scroll-mt-36 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/12 via-secondary/20 to-background p-6 md:p-8">
        <h2 className="font-orbitron text-2xl font-black text-foreground md:text-4xl">
          Vuoi un’esperienza più completa e approfondita?
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-muted-foreground md:text-base">
          Inizia con la piattaforma e passa a Premium quando vuoi più strumenti, più mercati e maggiore profondità di analisi.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="#premium" onClick={() => trackConversionEvent("click_premium_cta", { source: "come_funziona_final_cta" })}>
            <Button className="font-semibold">
              <Crown className="mr-1 h-4 w-4" />
              Scopri il Premium
            </Button>
          </a>
          <Link to="/dashboard" onClick={() => trackConversionEvent("click_dashboard_cta", { source: "come_funziona_final_cta" })}>
            <Button variant="outline" className="font-semibold">
              <Goal className="mr-1 h-4 w-4" />
              Prova la piattaforma
            </Button>
          </Link>
          <a
            href={telegramHref}
            target="_blank"
            rel="noreferrer"
            onClick={() => trackConversionEvent("click_telegram_cta", { source: "come_funziona_final_cta" })}
          >
            <Button variant="secondary" className="font-semibold">
              <MessageCircle className="mr-1 h-4 w-4" />
              Telegram
            </Button>
          </a>
        </div>
      </section>
    </PublicPageFrame>
  );
}

