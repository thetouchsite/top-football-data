# Top Football Pulse

Applicazione React migrata a Next.js, pronta per deploy su Vercel e con API server-side Node.js per MongoDB e integrazione **Sportmonks** (Football API v3) per fixture, calendario, live, odds e contesto dati.

## Stack

- Next.js
- React
- Tailwind CSS
- API routes Node.js
- MongoDB
- Sportmonks Football API per fixture, schedule, livescores, statistiche, quote pre-match (in base al piano)
- **Value bet in UI:** oggi da **modello interno** (`buildDerivedValueBet` in `src/lib/providers/sportmonks/index.js`), non dagli endpoint ufficiali Sportmonks.
- **Value bet Sportmonks (API ufficiale):** richiede add-on **Predictions**; endpoint `GET /v3/football/predictions/value-bets` e `.../value-bets/fixtures/{id}` (fair odd, bookmaker, odd, stake, `is_value`). Documentazione: [Value Bet (Sportmonks)](https://docs.sportmonks.com/v3/tutorials-and-guides/tutorials/odds-and-predictions/predictions/value-bet). **Non ancora integrato** nel repo — backlog prodotto.

## Avvio locale

1. Installa le dipendenze con `npm install`
2. Configura `.env.local`
3. Avvia il progetto con `npm run dev`

## Configurazione

- `MONGODB_URI`: stringa di connessione MongoDB
- `MONGODB_DB`: nome del database applicativo
- `SPORTMONKS_API_TOKEN` (o `SPORTMONKS_API_KEY`): token Football API v3
- Opzionali: `SPORTMONKS_BASE_URL`, `SPORTMONKS_SCHEDULE_DAYS`, `SPORTMONKS_SCHEDULE_LEAGUE_FILTER_STRICT`, `SPORTMONKS_SCHEDULE_LEAGUE_IDS` (vedi codice in `src/lib/providers/sportmonks`)
- `STRIPE_SECRET_KEY`: chiave segreta Stripe per checkout e billing portal
- `STRIPE_PREMIUM_PRICE_ID`: price id Stripe del piano premium mensile
- `NEXT_PUBLIC_APP_URL`: URL base pubblica dell'app, usata nei redirect Stripe
- `NEXT_PUBLIC_FEATURE_DATI_LIVE`: opzionale; imposta a `true` per mostrare la sezione Dati Live (nav, fetch livescore, `/dati-live`). Se assente o diverso da `true`, la funzione è spenta (meno chiamate API livescore). Dopo il cambio su Vercel eseguire un nuovo deploy.

## API disponibili

- `GET /api/health`: verifica rapida runtime/configurazione
- `POST /api/leads`: salva lead dal form landing su MongoDB
- `GET /api/football/fixtures/[fixtureId]`: dettaglio match da Sportmonks
- `GET /api/football/livescores/inplay`: livescore in tempo reale da Sportmonks
- `GET /api/football/schedules/window?days=4`: finestra calendario pre-match da Sportmonks
- `GET /api/football/odds/futures`: placeholder (futures/outrights da integrare su Sportmonks)
- `POST /api/billing/checkout`: crea una Stripe Checkout Session per il piano premium
- `GET /api/billing/session`: verifica una checkout session completata
- `POST /api/billing/portal`: apre il Billing Portal Stripe

## Provider Strategy

- Sportmonks Football API v3: schedule, fixture detail, livescores, dati squadra/classifiche (in base al piano e agli include)
- Probabilita **1X2**: da predizioni API Sportmonks se presenti, altrimenti modello derivato nel normalizer.
- Probabilita **O/U 2.5 e GG/NG** esposte come `ouProb` / `ggProb` sul match normalizzato: ordine di priorita
  (1) percentuali da predizioni API yes/no, (2) percentuali allineate al modello derivato `buildGoalMarkets`
  (stesse basi numeriche delle quote derivate), (3) probabilita implicite dalle quote bookmaker (`100/quota`)
  quando si usano decimali dal bookmaker. Dettaglio implementazione: `src/lib/providers/sportmonks/index.js`
  (`extractPredictionBundle`, `buildGoalMarkets`, `resolveScheduleOuGgProbabilities`).
- **Confidenza match (Sezione A):** usa valore API se il feed lo espone (`confidence_source: sportmonks_api`);
  in assenza API usa fallback composito interno (`confidence_source: composite_internal`) con pesi su
  forza modello, qualita value, coverage dati e reliability lineup.
- **Highlight value in UI:** nel dettaglio match l'evidenziazione segue il mercato/esito value su tutti i casi
  supportati (`1/X/2`, `Over/Under`, `Goal/No Goal`) con la stessa grammatica visiva delle card lista.
- Value bet (attuale): segnale **euristico interno** (`buildDerivedValueBet`), non è l’output dell’API
  **Value bets** di Sportmonks. Quando il contratto includerà l’add-on Predictions, valutare integrazione
  degli endpoint value-bets e uso in UI al posto o accanto al derivato.

## Roadmap e requisiti cliente

- Piano tecnico-prodotto unificato: [`.cursor/plans/roadmap_funzioni_piattaforma_2026.plan.md`](.cursor/plans/roadmap_funzioni_piattaforma_2026.plan.md) (sezioni A–D dal documento cliente, API Sportmonks, infrastruttura notifiche).
- Requisiti testuali versionabili: [`docs/cliente/funzioni-piattaforma.md`](docs/cliente/funzioni-piattaforma.md).
- Mappa operativa API vs calcoli interni: [`TODO_API_E_CALCOLI_FUNZIONI_PIATTAFORMA.txt`](TODO_API_E_CALCOLI_FUNZIONI_PIATTAFORMA.txt).

## Stato attuale

- Il feed dati calcio passa da Sportmonks; nessun fallback Sportradar.
- Il billing premium usa Stripe Checkout e Billing Portal (vedi implementazione auth/billing nel repo).

## Deploy

Il progetto e pronto per Vercel. Imposta su Vercel le stesse variabili ambiente usate in `.env.local`.

# Top Football Pulse

## Auth locale e Google

- `register` e `login` devono funzionare anche in locale.
- Se Mongo Atlas non e raggiungibile in sviluppo, l'auth usa un fallback SQLite locale persistente in `.data/auth-local.sqlite`.
- In produzione il fallback non viene usato: se Mongo non risponde, l'auth fallisce esplicitamente.

### Variabili env Google richieste

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED=false
```

### Google Cloud Console

Usa una credenziale OAuth Web Application con:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

Con queste env attive, login e registrazione mostrano:

- bottone `Continua con Google`
- Google One Tap sulle pagine pubbliche auth solo se `NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED=true`
