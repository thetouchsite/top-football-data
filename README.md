# Top Football Pulse

Applicazione React migrata a Next.js, pronta per deploy su Vercel e con API server-side Node.js per MongoDB e integrazione **Sportmonks** (Football API v3) per fixture, calendario, live, odds e contesto dati.

## Stack

- Next.js
- React
- Tailwind CSS
- API routes Node.js
- MongoDB
- Sportmonks Football API per fixture, schedule, livescores, statistiche, quote pre-match (in base al piano)
- Calcolo value bet interno nel progetto

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
- Value bet: calcolo interno usando probabilita modello e quote implied

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
