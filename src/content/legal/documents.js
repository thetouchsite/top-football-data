const commonTags = ["legal-center", "placeholder", "requires-review"];

export const legalDocuments = [
  {
    title: "Privacy Policy",
    slug: "privacy",
    route: "/legal/privacy",
    summary:
      "Come trattiamo i dati personali, finalita, basi giuridiche, tempi di conservazione e diritti dell'utente.",
    version: "v0.9",
    effectiveDate: "2026-04-21",
    updatedAt: "2026-04-21",
    owner: "Privacy Team",
    status: "review",
    tags: ["privacy", "gdpr", ...commonTags],
    lastReviewedBy: "Da assegnare",
    requiresLegalReview: true,
    warning:
      "Bozza strutturata: contenuto da validare con consulente legale/privacy prima della pubblicazione definitiva.",
    sections: [
      {
        id: "overview",
        heading: "Panoramica",
        kind: "paragraphs",
        content: [
          "Abbiamo organizzato questa informativa per spiegare in modo chiaro quali dati possono essere trattati durante l'uso della piattaforma Top Football Data.",
          "Questa versione e un contenitore strutturato pronto per revisione legale finale e non sostituisce un parere professionale.",
        ],
      },
      {
        id: "data-categories",
        heading: "Categorie di dati trattati",
        kind: "bullets",
        items: [
          "Dati account e autenticazione (es. email e identificativi utente).",
          "Dati di utilizzo della piattaforma (accessi, interazioni, preferenze).",
          "Dati forniti volontariamente tramite form di contatto o richieste privacy.",
          "Dati tecnici necessari a sicurezza, log e continuita operativa.",
        ],
      },
      {
        id: "legal-basis",
        heading: "Finalita e basi giuridiche",
        kind: "table",
        columns: ["Finalita", "Base giuridica (placeholder)", "Stato revisione"],
        rows: [
          ["Erogazione del servizio", "Esecuzione del contratto", "Da validare"],
          ["Sicurezza e prevenzione abusi", "Legittimo interesse", "Da validare"],
          ["Comunicazioni operative", "Contratto/legittimo interesse", "Da validare"],
          ["Marketing opzionale", "Consenso", "Da validare"],
        ],
      },
    ],
  },
  {
    title: "Cookie Policy",
    slug: "cookies",
    route: "/legal/cookies",
    summary:
      "Categorie cookie, finalita tecniche, gestione preferenze e punti di integrazione con CMP/Consent Mode.",
    version: "v0.9",
    effectiveDate: "2026-04-21",
    updatedAt: "2026-04-21",
    owner: "Product + Privacy",
    status: "review",
    tags: ["cookie", "consenso", ...commonTags],
    lastReviewedBy: "Da assegnare",
    requiresLegalReview: true,
    warning:
      "Struttura tecnica pronta per CMP: classificazione finale e testi devono essere validati legalmente.",
    sections: [
      {
        id: "cookie-overview",
        heading: "Come usiamo cookie e strumenti simili",
        kind: "paragraphs",
        content: [
          "Utilizziamo cookie tecnici necessari al funzionamento della piattaforma e, previa scelta utente, categorie aggiuntive come analytics, marketing e preferenze.",
          "La logica definitiva di consenso dipende dal CMP scelto e dalla revisione legale finale.",
        ],
      },
      {
        id: "cookie-categories",
        heading: "Categorie previste",
        kind: "table",
        columns: ["Categoria", "Descrizione", "Default", "Richiede consenso"],
        rows: [
          ["Necessari", "Abilitano funzioni essenziali del servizio", "ON", "No"],
          ["Analytics", "Misurano uso e performance", "OFF", "Si"],
          ["Marketing", "Comunicazioni e campagne", "OFF", "Si"],
          ["Preferenze", "Memorizzano scelte personalizzate", "OFF", "Si"],
        ],
      },
    ],
  },
  {
    title: "Termini e Condizioni",
    slug: "terms",
    route: "/legal/terms",
    summary:
      "Regole d'uso della piattaforma, responsabilita, limitazioni e comportamento consentito.",
    version: "v0.9",
    effectiveDate: "2026-04-21",
    updatedAt: "2026-04-21",
    owner: "Legal Ops",
    status: "draft",
    tags: ["terms", "contratto", ...commonTags],
    lastReviewedBy: "Da assegnare",
    requiresLegalReview: true,
    warning: "Clausole contrattuali placeholder: revisione legale obbligatoria.",
    sections: [
      {
        id: "terms-overview",
        heading: "Uso del servizio",
        kind: "paragraphs",
        content: [
          "Questa pagina definisce in modo strutturato le condizioni di accesso e utilizzo della piattaforma.",
          "Le clausole sono placeholder editoriali da approvare prima della pubblicazione ufficiale.",
        ],
      },
      {
        id: "terms-bullets",
        heading: "Punti principali (bozza)",
        kind: "bullets",
        items: [
          "Accesso personale e non trasferibile.",
          "Divieto di uso improprio, scraping non autorizzato o abuso del servizio.",
          "Disponibilita del servizio soggetta a manutenzione e aggiornamenti.",
          "Limitazioni di responsabilita da validare con legale.",
        ],
      },
    ],
  },
  {
    title: "Premium e Abbonamenti",
    slug: "premium",
    route: "/legal/premium",
    summary:
      "Struttura contrattuale del piano Premium: attivazione, rinnovi, disdetta, recesso e pagamenti.",
    version: "v0.8",
    effectiveDate: "2026-04-21",
    updatedAt: "2026-04-21",
    owner: "Billing Team",
    status: "draft",
    tags: ["premium", "billing", ...commonTags],
    lastReviewedBy: "Da assegnare",
    requiresLegalReview: true,
    warning:
      "Contenuto non definitivo: i passaggi su rinnovi, rimborsi, recesso e fatturazione devono essere approvati.",
    sections: [
      {
        id: "premium-scope",
        heading: "Ambito del piano",
        kind: "bullets",
        items: [
          "Accesso alle funzionalita Premium secondo piano attivo.",
          "Rinnovo periodico (placeholder da confermare).",
          "Regole su disdetta, sospensione e revoca accesso da validare.",
        ],
      },
    ],
  },
  {
    title: "Policy Telegram Bot",
    slug: "telegram-bot",
    route: "/legal/telegram-bot",
    summary:
      "Informativa dedicata a bot e canale Telegram: dati trattati, notifiche, limiti e collegamenti alle altre policy.",
    version: "v0.8",
    effectiveDate: "2026-04-21",
    updatedAt: "2026-04-21",
    owner: "Telegram Ops",
    status: "review",
    tags: ["telegram", "bot", ...commonTags],
    lastReviewedBy: "Da assegnare",
    requiresLegalReview: true,
    warning:
      "Bozza tecnica della policy Telegram: basi giuridiche e responsabilita da finalizzare con consulente.",
    sections: [
      {
        id: "telegram-overview",
        heading: "Cosa fa il bot",
        kind: "paragraphs",
        content: [
          "Il bot/canale Telegram supporta notifiche e aggiornamenti informativi collegati alla piattaforma.",
          "Le modalita effettive di trattamento dati dipendono da configurazione, livelli di accesso e policy Telegram.",
        ],
      },
      {
        id: "telegram-data",
        heading: "Dati potenzialmente trattati (placeholder)",
        kind: "table",
        columns: ["Ambito", "Esempi", "Stato"],
        rows: [
          ["Identificativi Telegram", "username, chat id", "Da validare"],
          ["Interazioni", "comandi, preferenze notifiche", "Da validare"],
          ["Contenuti inviati", "alert o messaggi informativi", "Da validare"],
        ],
      },
    ],
  },
  {
    title: "Fornitori e Sub-processors",
    slug: "processors",
    route: "/legal/processors",
    summary: "Elenco servizi terzi, finalita, ruolo e area geografica (struttura dinamica da config).",
    version: "v0.7",
    effectiveDate: "2026-04-21",
    updatedAt: "2026-04-21",
    owner: "Infrastructure Team",
    status: "review",
    tags: ["processors", "vendors", ...commonTags],
    lastReviewedBy: "Da assegnare",
    requiresLegalReview: true,
    warning: "Lista indicativa da allineare a contratti e DPA ufficiali.",
    sections: [],
  },
  {
    title: "Disclaimer Servizio",
    slug: "disclaimer",
    route: "/legal/disclaimer",
    summary:
      "Limiti del servizio, uso informativo della piattaforma e responsabilita (placeholder legale).",
    version: "v0.8",
    effectiveDate: "2026-04-21",
    updatedAt: "2026-04-21",
    owner: "Legal Ops",
    status: "draft",
    tags: ["disclaimer", "liability", ...commonTags],
    lastReviewedBy: "Da assegnare",
    requiresLegalReview: true,
    warning: "Testo in bozza: non rappresenta parere legale definitivo.",
    sections: [
      {
        id: "disclaimer-intro",
        heading: "Uso informativo",
        kind: "paragraphs",
        content: [
          "Top Football Data fornisce strumenti informativi e di analisi. Questa sezione definisce i limiti d'uso in modo trasparente.",
          "Le clausole finali su responsabilita e uso consentito vanno approvate in sede legale.",
        ],
      },
    ],
  },
];
