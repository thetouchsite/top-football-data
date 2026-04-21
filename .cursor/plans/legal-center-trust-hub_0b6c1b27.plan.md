---
name: legal-center-trust-hub
overview: Progetterò una sezione Legal/Trust Center premium e modulare su App Router con content model locale versionato, hub `/legal`, sottopagine `/legal/*`, componenti riusabili, entry point cookie preferences e pagina richieste privacy con backend stub pronto a evolvere.
todos:
  - id: design-content-model
    content: Definire content model legale versionato in src/content/legal con document registry, processors e changelog.
    status: completed
  - id: build-legal-components
    content: Creare componenti riusabili in src/components/legal per hero, cards, sidebar, meta, table, accordion, badges e cookie button.
    status: completed
  - id: implement-legal-routes
    content: Implementare hub /legal e tutte le sottoroute /legal/* con rendering dinamico dei contenuti e layout premium coerente.
    status: completed
  - id: privacy-requests-flow
    content: Implementare pagina /legal/contact con form validato e API stub dedicata /api/legal/requests.
    status: completed
  - id: cookie-entrypoint
    content: Aggiungere entry point gestione cookie riusabile e integrazione in pagina cookie + footer.
    status: completed
  - id: wire-navigation-seo-a11y
    content: Aggiornare footer/nav, metadata SEO per ogni pagina e hardening accessibilità.
    status: completed
  - id: legacy-compat-cleanup
    content: Mappare route legacy legali a redirect canonici /legal/* e verificare assenza regressioni.
    status: completed
  - id: final-qa-docs
    content: Eseguire lint/build/responsive QA e aggiornare TODO/documentazione con punti legali da validare.
    status: completed
isProject: false
---

# Legal Center Premium Plan

## Assunzioni Operative (default)
- Le nuove route canoniche saranno sotto `/legal/*`.
- Le route legacy attuali (`/privacy`, `/cookie`, ecc.) verranno mantenute come compatibilità tramite redirect verso le nuove route canoniche.
- Le richieste privacy useranno una nuova API dedicata (`/api/legal/requests`) con validazione e persistenza base, separata da `/api/leads`.

## 1) Architettura e Content Model
- Creare un modello contenuti legali locale in `[src/content/legal](src/content/legal)` con:
  - metadati documento (`title`, `slug`, `summary`, `version`, `effectiveDate`, `updatedAt`, `owner`, `status`, `tags`, `lastReviewedBy`, `requiresLegalReview`).
  - sezioni modulari renderizzabili (intro, blocchi, liste, tabelle, FAQ, contatti, note legali da validare).
- Aggiungere un registry centralizzato in `[src/content/legal/index.js](src/content/legal/index.js)` per documenti, processors e changelog.
- Definire helper in `[src/lib/legal](src/lib/legal)` per query, ricerca testuale, quick links e timeline changelog.

## 2) UI Foundation (riusabile)
- Creare componenti in `[src/components/legal](src/components/legal)`:
  - `LegalHero`, `LegalDocumentCard`, `LegalSidebarNav`, `LegalSection`, `LegalMetaBar`, `LegalBadge`, `LegalAccordion`, `LegalTable`, `LegalChangelogTimeline`, `CookiePreferencesButton`, `PrivacyRequestForm`, `TelegramPolicyHighlights`, `DocumentStatusPill`.
- Riutilizzare componenti base esistenti (`Accordion`, `Card`, `Badge`, `Table`, `Button`, `Input`) per coerenza stile/accessibilità.
- Introdurre pattern sticky nav/anchor per pagine lunghe con offset corretto e focus states.

## 3) Route e Pagine `/legal`
- Creare:
  - `[src/app/legal/page.jsx](src/app/legal/page.jsx)` (hub Trust Center)
  - `[src/app/legal/privacy/page.jsx](src/app/legal/privacy/page.jsx)`
  - `[src/app/legal/cookies/page.jsx](src/app/legal/cookies/page.jsx)`
  - `[src/app/legal/terms/page.jsx](src/app/legal/terms/page.jsx)`
  - `[src/app/legal/premium/page.jsx](src/app/legal/premium/page.jsx)`
  - `[src/app/legal/telegram-bot/page.jsx](src/app/legal/telegram-bot/page.jsx)`
  - `[src/app/legal/processors/page.jsx](src/app/legal/processors/page.jsx)`
  - `[src/app/legal/disclaimer/page.jsx](src/app/legal/disclaimer/page.jsx)`
  - `[src/app/legal/contact/page.jsx](src/app/legal/contact/page.jsx)`
  - `[src/app/legal/changelog/page.jsx](src/app/legal/changelog/page.jsx)`
- Per layout, usare `PublicShell` e frame pubblico esistente (coerenza dark premium).
- Nel hub `/legal` includere:
  - hero + rassicurazione trasparenza
  - cards documenti con status/version/date
  - ricerca interna
  - quick links
  - accesso gestione cookie
  - accesso contatti privacy
  - blocco trasparenza piattaforma

## 4) Cookie UX e Integration Point
- Implementare `CookiePreferencesButton` globale riusabile con API locale evento (es. `window.dispatchEvent(new CustomEvent('open-cookie-preferences'))`) e fallback UI.
- Nella pagina `/legal/cookies` modellare categorie (`necessari`, `analytics`, `marketing`, `preferenze`) con stato/descrizione e placeholder integrazione CMP/Consent Mode.
- Inserire callout espliciti “Da validare con consulente legale/privacy”.

## 5) Telegram Bot e Premium Legal
- `/legal/telegram-bot`: struttura con intro, tabella trattamento dati/uso, FAQ bot, contatti/revoca, collegamenti ad altre policy.
- `/legal/premium`: struttura contrattuale non definitiva su abbonamento/rinnovi/recesso/fatturazione/sospensione/uso corretto/limiti responsabilità, con badge “Draft/Review/Active”.
- Entrambe con blocco metadata documento + versione + punti pending legal review.

## 6) Processors, Contact e Changelog dinamici
- `/legal/processors`: tabella dinamica da config (servizio, ruolo, categoria, finalità, area, link, note).
- `/legal/contact`: form richieste privacy con validazione client/server, selezione tipo richiesta, consenso invio, stati submit.
- Nuova API: `[src/app/api/legal/requests/route.js](src/app/api/legal/requests/route.js)` con schema Zod + persistenza base + risposta strutturata.
- `/legal/changelog`: timeline dinamica collegata ai documenti/versioni (major/minor/review badge).

## 7) Navigazione, SEO e Accessibilità
- Aggiornare footer pubblico (`[src/components/public/PublicFooter.jsx](src/components/public/PublicFooter.jsx)`) con link canonici `/legal/*` + azione “Gestisci cookie”.
- Aggiungere metadata per ogni pagina legale (`title`, `description`, OG base, canonical coerente).
- Verificare semantica heading, keyboard navigation, aria-label per elementi interattivi, tabelle accessibili, contrasti focus.

## 8) Compatibilità e Pulizia
- Convertire le route legacy attuali in redirect verso `/legal/*` per evitare link rotti.
- Eseguire pass completo lint/build e rifinitura UI responsive (mobile/tablet/desktop).
- Aggiornare documentazione operativa/TODO con nuova architettura legale e punti da validare con consulente.

## 9) Deliverable finali
- Elenco file creati/modificati.
- Mappa rotte legali finali.
- Content model adottato.
- Componenti riusabili creati.
- Checklist esplicita “Richiede revisione legale finale” per ciascun documento.