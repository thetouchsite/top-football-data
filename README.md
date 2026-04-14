# Top Football Pulse

Applicazione React migrata a Next.js, pronta per deploy su Vercel e con API server-side Node.js per MongoDB e integrazione centrata su Sportradar.

## Stack

- Next.js
- React
- Tailwind CSS
- API routes Node.js
- MongoDB
- Sportradar Soccer API per fixture, live, lineups, statistiche e database calcistico
- Sportradar Probabilities per prediction e contesto probabilistico
- Sportradar Odds / Odds Comparison per quote bookmaker e comparazione quote
- Calcolo value bet interno nel progetto

## Avvio locale

1. Installa le dipendenze con `npm install`
2. Configura `.env.local`
3. Avvia il progetto con `npm run dev`

## Configurazione

- `MONGODB_URI`: stringa di connessione MongoDB
- `MONGODB_DB`: nome del database applicativo
- `SPORTRADAR_API_KEY`: API key per Soccer API
- `SPORTRADAR_ACCESS_LEVEL`: livello accesso Soccer API, default `trial`
- `SPORTRADAR_LANGUAGE_CODE`: lingua feed, default `it`
- `SPORTRADAR_FORMAT`: formato risposta, default `json`
- `SPORTRADAR_SCHEDULE_DAYS`: finestra calendario live/schedule, default `4`
- `SPORTRADAR_ODDS_API_KEY`: opzionale, per feed odds/comparison se separato dalla Soccer API
- `SPORTRADAR_PROBABILITIES_API_KEY`: opzionale, per feed probabilities se separato dalla Soccer API
- `SPORTRADAR_SOCCER_SPORT_ID`: sport id per odds futures, default `sr:sport:1`
- `SPORTRADAR_FUTURES_COMPETITION_ID`: opzionale, forza una competition specifica per il modulo futures
- `STRIPE_SECRET_KEY`: chiave segreta Stripe per checkout e billing portal
- `STRIPE_PREMIUM_PRICE_ID`: price id Stripe del piano premium mensile
- `NEXT_PUBLIC_APP_URL`: URL base pubblica dell'app, usata nei redirect Stripe

## API disponibili

- `GET /api/health`: verifica rapida runtime/configurazione
- `POST /api/leads`: salva lead dal form landing su MongoDB
- `GET /api/football/fixtures/[fixtureId]`: dettaglio match da Sportradar
- `GET /api/football/livescores/inplay`: livescore in tempo reale da Sportradar
- `GET /api/football/schedules/window?days=4`: finestra calendario pre-match da Sportradar
- `GET /api/football/odds/futures`: futures/outrights da Sportradar Odds Comparison Futures
- `POST /api/billing/checkout`: crea una Stripe Checkout Session per il piano premium
- `GET /api/billing/session`: verifica una checkout session completata
- `POST /api/billing/portal`: apre il Billing Portal Stripe

## Provider Strategy

- Sportradar Soccer API: fixture, live, lineups, statistiche, database calcistico
- Sportradar Probabilities: prediction e probabilita pre-match/live
- Sportradar Odds / Odds Comparison: quote bookmaker e comparazione bookmaker
- Value bet: calcolo interno usando probabilita modello e quote implied

## Stato attuale

- Il repo usa gia Sportradar per live, fixture e schedule.
- Le schermate attuali possono restare interamente su Sportradar.
- La parte betting richiede feed Sportradar Odds e/o Probabilities oltre alla sola Soccer API standard.
- Il billing premium ora usa Stripe Checkout e Billing Portal, ma senza auth/webhook resta una base tecnica e non un sistema subscription completo.

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
