---
name: area pubblica marketing policy
overview: "Progettare e implementare un’area pubblica completa, conversion-oriented e compliant: header/footer responsive, nuove pagine marketing, funnel Telegram/registrazione/premium e set completo di policy legali."
todos:
  - id: public-shell
    content: Creare shell pubblica con header/footer responsive e CTA principali (Telegram, Guida, Accedi, Registrati).
    status: completed
  - id: lead-modal
    content: Estrarre e riusare il form guida in modale con tracking source su /api/leads.
    status: completed
  - id: public-marketing-pages
    content: "Implementare pagine pubbliche marketing: Funzioni piattaforma, Come funziona, Telegram, Premium, FAQ."
    status: completed
  - id: live-coming-soon-copy
    content: "Allineare copy pubblico: Dati Live sempre mostrato come In Arrivo."
    status: completed
  - id: legal-pages-pack
    content: "Pubblicare pacchetto policy completo: Privacy, Cookie, Termini, Disclaimer, Abbonamenti/Rimborsi, Telegram Policy."
    status: completed
  - id: conversion-hooks
    content: Preparare hook/event point per CTA funnel (telegram, guida, registrazione, premium).
    status: completed
  - id: responsive-qa
    content: Eseguire QA responsive/accessibilità/lint/build e chiudere regressioni.
    status: completed
isProject: false
---

# Piano area pubblica marketing + policy

## Obiettivi
- Aumentare conversione su 3 azioni chiave: Telegram, registrazione, Premium.
- Rendere l’area pubblica coerente con lo stato prodotto attuale (Dati Live non attivo => “In Arrivo”).
- Pubblicare il pacchetto policy minimo-completo per essere operativi.

## Baseline tecnica da riusare
- Landing corrente in [src/screens/Landing.jsx](c:/Users/ET/Downloads/Works/top-football-data/src/screens/Landing.jsx) (hero, form lead su `/api/leads`, preview dati).
- Feature flag live in [src/lib/feature-flags.js](c:/Users/ET/Downloads/Works/top-football-data/src/lib/feature-flags.js) e redirect route in [src/middleware.js](c:/Users/ET/Downloads/Works/top-football-data/src/middleware.js).
- Telegram URL già gestito via `NEXT_PUBLIC_TELEGRAM_URL` (uso in schermate app).

## Architettura pubblica proposta
- Layout pubblico unico con Header + Footer condivisi.
- Route pubbliche:
  - `/`
  - `/funzioni-piattaforma`
  - `/come-funziona`
  - `/telegram`
  - `/premium`
  - `/faq`
  - `/privacy`
  - `/cookie`
  - `/termini`
  - `/disclaimer`
  - `/abbonamenti-rimborsi`
  - `/telegram-policy`

```mermaid
flowchart LR
  publicHeader[PublicHeader] --> primaryCta[PrimaryCTA Telegram]
  publicHeader --> secondaryCta[SecondaryCTA Registrazione]
  publicHeader --> guideCta[GuideModalCTA]
  guideCta --> leadsApi[/api/leads]

  homePage[Landing] --> featuresPage[FunzioniPiattaforma]
  homePage --> telegramPage[Telegram]
  homePage --> premiumPage[Premium]
  homePage --> faqPage[FAQ]

  legalFooter[PublicFooter] --> privacyPage[Privacy]
  legalFooter --> termsPage[Termini]
  legalFooter --> cookiePage[Cookie]
  legalFooter --> disclaimerPage[Disclaimer]
  legalFooter --> billingPage[AbbonamentiRimborsi]
  legalFooter --> telegramPolicyPage[TelegramPolicy]
```

## Piano implementativo

### 1) Header/Footer responsive e conversione
- Creare componenti condivisi `PublicHeader` e `PublicFooter` (desktop + mobile drawer).
- Header con CTA: Telegram, Scarica Guida (modale), Accedi, Registrati.
- Footer con tutte le pagine legali + contatti/brand.
- Uniformare spacing, breakpoints, focus state tastiera, accessibilità base.

### 2) Modale “Scarica Guida”
- Estrarre il form attuale della landing in componente riusabile (`LeadGuideModal` / `LeadGuideForm`).
- Continuare a usare `/api/leads`, aggiungendo `source` differenziata per tracciamento.
- Stato success/errore chiaro e messaggi coerenti.

### 3) Pagine marketing pubbliche
- **Funzioni piattaforma:** blocchi prodotto (Modelli, Analisi, MultiBet, Dati Live “In Arrivo”).
- **Come funziona:** flusso dati -> modello -> output -> alert Telegram.
- **Telegram:** value proposition canale/bot + CTA unica forte.
- **Premium:** differenze free vs premium, value bullets, CTA upgrade.
- **FAQ:** dubbi chiave (API vs calcoli, affidabilità, live in arrivo, premium).

### 4) “Dati Live” in stato corretto
- In tutte le pagine pubbliche dove citato, mostrare badge e copy “In Arrivo”.
- Evitare CTA che suggeriscono disponibilità immediata.
- Mantenere coerenza col feature flag già presente.

### 5) Policy complete (testi iniziali operativi)
- Scrivere pagine legali con struttura uniforme:
  - Privacy Policy
  - Cookie Policy
  - Termini e Condizioni
  - Disclaimer predizioni/no garanzie
  - Abbonamenti, rinnovi e rimborsi
  - Telegram Policy
- Aggiungere “Ultimo aggiornamento” e riferimenti contatto legale/privacy.
- Collegare tutte dal footer pubblico.

### 6) Analytics readiness (non invasiva)
- Inserire hook/event points per:
  - click CTA Telegram
  - apertura/sottomissione modale guida
  - click registrazione
  - click premium
- Lasciare integrazione provider analytics separabile (se non già attiva).

### 7) QA e hardening finale
- Test responsive: 320/375/768/1024/1280.
- Verifica keyboard navigation, contrasto, focus ring, overlay modale.
- Controllo coerenza claim marketing vs stato reale feature.
- Lint/build puliti e smoke test navigazione pubblica completa.

## File target principali
- [src/screens/Landing.jsx](c:/Users/ET/Downloads/Works/top-football-data/src/screens/Landing.jsx)
- `src/components/public/*` (nuovi componenti header/footer/cta/modal)
- `src/app/<nuove-route>/page.jsx` (nuove pagine pubbliche)
- `src/screens/public/*` (template pagine marketing/legali)
- eventuale aggiornamento linking in layout/root navigation

## Criteri di done
- Header e footer pubblici completamente responsive e consistenti.
- Funnel Telegram/registrazione/premium visibile e tracciabile in ogni pagina chiave.
- Dati Live rappresentato ovunque come “In Arrivo”.
- Tutte le pagine legali pubblicate e linkate nel footer.
- Nessun regressione su landing/form lead esistente.