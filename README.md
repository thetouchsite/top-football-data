# Top Football Pulse

Applicazione Next.js/React per dati calcio, modelli predittivi, comparatore quote e dashboard premium. Il progetto include anche un backend Python separato per Railway che fa da orchestratore alert Telegram, value bet, multibet e performance storiche.

## Architettura

```text
Vercel / Next.js
- sito React
- API route Node.js
- dashboard alert/performance
- lettura MongoDB

Railway / Python
- scanner Sportmonks schedulato
- calcolo value bet e multibet
- invio Telegram
- scrittura MongoDB
- settlement won/lost/void

MongoDB
- betAlerts
- betPerformance
```

Il sito e il bot non si chiamano direttamente tra loro: comunicano tramite MongoDB condiviso. Railway scrive alert e performance, Vercel li legge.

## Stack

- Next.js
- React
- Tailwind CSS
- API routes Node.js
- MongoDB
- Sportmonks Football API v3
- Stripe Checkout e Billing Portal
- Backend Python separato in [`telegram-alert-backend`](telegram-alert-backend)

## Avvio Locale Frontend

1. Installa le dipendenze:

```bash
npm install
```

2. Configura `.env.local`.

3. Avvia il sito:

```bash
npm run dev
```

Verifiche:

```bash
npm run lint
npm run typecheck
```

Nota build locale: `npm run build` puo richiedere una versione Node che supporti `node:sqlite`, usato dal fallback auth locale. Se compare `No such built-in module: node:sqlite`, il problema e nel runtime Node locale, non negli endpoint alert/performance.

## Football API (layer interno)

Dashboard e modelli condividono `GET /api/football/schedules/window?days=7` (massimo 7 giorni in query); il dettaglio match è `GET /api/football/fixtures/[fixtureId]` (core vs enrichment con `view`).  
Allowlist campionati, policy include e stato lavori: **[docs/football-api-layer.md](docs/football-api-layer.md)**.  
Piano prossima fase (cache condivisa / SWR / prewarm, solo design): [`.cursor/plans/feed_7_giorni_velocissimo_vfinale.plan.md`](.cursor/plans/feed_7_giorni_velocissimo_vfinale.plan.md).

## Configurazione Frontend

- `MONGODB_URI`: stringa di connessione MongoDB.
- `MONGODB_DB`: nome database applicativo, default `top-football-pulse`.
- `SPORTMONKS_API_TOKEN` o `SPORTMONKS_API_KEY`: token Sportmonks Football API v3 (**obbligatori** per il feed).
- `SPORTMONKS_BASE_URL`: opzionale, default `https://api.sportmonks.com/v3`.
- `SPORTMONKS_SCHEDULE_DAYS`: opzionale, default lato client provider impostato a 7 (vedi `src/lib/providers/sportmonks/index.js`); la route schedule **non** accetta oltre 7 giorni in query.
- `SPORTMONKS_SCHEDULE_LEAGUE_IDS`: opzionale, **override** elenco leghe (CSV di ID) oppure `all` / `global` / `*` per nessun filtro su `fixtures/between`. Se assente, si usano gli **ID ufficiali** in codice (allowlist prodotto in `src/lib/sportmonks-priority-league-ids.js`). **Non** è più il meccanismo principale filtrare leghe solo dalla UI.
- `SPORTMONKS_SCHEDULE_MAX_PAGES`: opzionale, limite pagine paginazione `fixtures/between` (default 80, max 200 nel codice).
- `SPORTMONKS_MEDIA_BASE_URL`: opzionale, default `https://cdn.sportmonks.com`.
- `DEBUG_FOOTBALL_TELEMETRY`: opzionale (`1` / `true` / `yes`) per log dettagliati su route football.
- `STRIPE_SECRET_KEY`: chiave Stripe server.
- `STRIPE_PREMIUM_PRICE_ID`: price id Stripe del piano premium.
- `NEXT_PUBLIC_APP_URL`: URL pubblico usato nei redirect Stripe.

*Nota:* in alcuni messaggi/notice del feed compare il riferimento testuale a un “filtro stretto leghe”; la **configurazione reale** passa da `SPORTMONKS_SCHEDULE_LEAGUE_IDS` e dalla allowlist in codice (vedi [docs/football-api-layer.md](docs/football-api-layer.md)). Non esiste al momento una variabile `SPORTMONKS_SCHEDULE_LEAGUE_FILTER_STRICT` letta da `process.env`.

Per il collegamento completo, Railway deve usare gli stessi `MONGODB_URI` e `MONGODB_DB` configurati su Vercel.

## API Next Disponibili

- `GET /api/health`: readiness runtime, Mongo, Stripe e provider.
- `POST /api/leads`: salva lead dal form landing.
- `GET /api/football/fixtures/[fixtureId]`: dettaglio match (query `view=core` per soli dati core, default per arricchimenti). Sportmonks Football API v3.
- `GET /api/football/schedules/window?days=7`: calendario pre-match condiviso (dashboard, modelli); `days` al massimo **7**.
- `GET /api/alerts`: alert value/multibet salvati dal backend Python.
- `GET /api/performance`: riepilogo storico ROI dagli alert chiusi.
- `POST /api/billing/checkout`: crea Stripe Checkout.
- `GET /api/billing/session`: verifica checkout completato.
- `POST /api/billing/portal`: apre Billing Portal.

## Alert e Performance

Il backend Python Railway salva:

- `betAlerts`: alert singoli e multibet generati dallo scanner.
- `betPerformance`: risultati chiusi, profit/loss in unita, ROI e hit rate.

La dashboard Next legge `/api/alerts` e `/api/performance` per mostrare segnali persistiti e storico quasi in tempo reale. Telegram riceve gli stessi segnali salvati su MongoDB, con comparatore quote e CTA configurabile.

Allineamento prodotto 2026-04-24:
- `/multi-bet` mostra sia multibet sia single (tab dedicata).
- Le modalita multibet supportate sono solo `algorithmic`, `safe`, `value`.
- La logica `gold` e stata rimossa lato backend generator e lato frontend mapping/UI.

## Provider Strategy

- Sportmonks Football API v3 e la fonte dati principale.
- Probabilita 1X2: da predizioni API Sportmonks se presenti, altrimenti modello derivato nel normalizer.
- Probabilita O/U 2.5 e GG/NG: priorita a predizioni API, poi modello derivato, poi probabilita implicite dalle quote bookmaker quando disponibili.
- Value bet UI match/feed: modello interno Next (`buildDerivedValueBet`) quando il feed non espone value ufficiali.
- Value bet orchestrate: backend Python calcola quota modello, edge/EV, salva alert, manda Telegram e aggiorna ROI.
- Value bet Sportmonks ufficiali: il backend usa `predictions/value-bets/fixtures/{fixtureId}` come fonte primaria quando l'add-on Predictions e attivo.
- Comparatore quote: il backend arricchisce ogni fixture con `odds/pre-match/fixtures/{fixtureId}` quando l'add-on Odds e attivo.

Il worker genera alert reali solo quando Sportmonks restituisce sia probabilita/predizioni sia quote bookmaker compatibili. Senza add-on Predictions/Odds resta attivo, ma puo non produrre segnali.

Pagina performance: `/performance-storiche` mostra ROI, profitto cumulato e storico alert chiusi leggendo `/api/performance`. Quando il worker chiude nuovi alert, invia anche la sintesi del bilancio sul canale Telegram.

## Backend Python Railway

Cartella: [`telegram-alert-backend`](telegram-alert-backend)

Start command Railway:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Variabili Railway principali:

```env
SPORTMONKS_API_TOKEN=...
MONGODB_URI=...
MONGODB_DB=top-football-pulse
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=@canale_test_o_cliente
APP_BASE_URL=https://tuo-sito.vercel.app
POLL_INTERVAL_SECONDS=300
CANDIDATE_EDGE_THRESHOLD=1.05
NOTIFICATION_EV_THRESHOLD=1.25
MULTIBET_MIN_EVENTS=3
MULTIBET_MAX_EVENTS=4
MAX_ALERTS_PER_RUN=8
CTA_LABEL=Vedi quota
BOOKMAKER_AFFILIATE_LINKS_JSON={"Bet365":"https://example.com/bet365"}
```

Test Railway:

```powershell
Invoke-RestMethod -Method Get -Uri "https://TUO-SERVIZIO.up.railway.app/health"
Invoke-RestMethod -Method Post -Uri "https://TUO-SERVIZIO.up.railway.app/test-telegram"
Invoke-RestMethod -Method Post -Uri "https://TUO-SERVIZIO.up.railway.app/demo-pronostici"
Invoke-RestMethod -Method Get -Uri "https://TUO-SERVIZIO.up.railway.app/demo-pronostici"
Invoke-RestMethod -Method Post -Uri "https://TUO-SERVIZIO.up.railway.app/run-once"
```

## Deploy

Frontend:

- Deploy su Vercel dalla root del progetto.
- Imposta su Vercel le stesse variabili di `.env.local`.

Worker:

- Deploy su Railway con root directory `telegram-alert-backend`.
- Imposta su Railway le variabili del backend Python.
- Non committare mai `telegram-alert-backend/.env`.

## Stato Attuale

- Feed calcio: Sportmonks, nessun fallback Sportradar.
- Layer football (endpoint, allowlist, prossime mosse): [docs/football-api-layer.md](docs/football-api-layer.md).
- Coerenza feed/detail migliorata con snapshot versioning e policy cache allineata.
- Telegram test: validato con bot e canale di test.
- MongoDB condiviso: supportato dal worker Python e letto dal sito Next.
- Performance storiche: collection e API pronte; il settlement dipende dalla disponibilita dei risultati finali Sportmonks.
- Generazione alert reali: dipende da chiave Sportmonks valida con copertura Predictions/Odds.
- Immagini Sportmonks: contratto normalizzato `media.imageUrl` / `media.thumbUrl` e componenti UI con fallback.
- Prossima priorita tecnica football (list): performance feed 7 giorni (cache condivisa / SWR / prewarm) — vedi [`.cursor/plans/feed_7_giorni_velocissimo_vfinale.plan.md`](.cursor/plans/feed_7_giorni_velocissimo_vfinale.plan.md); stato operativo: [`TODO_SVILUPPO_TOP_FOOTBALL_DATA.txt`](TODO_SVILUPPO_TOP_FOOTBALL_DATA.txt).

## Roadmap e Requisiti Cliente

- Piano tecnico-prodotto: [`.cursor/plans/roadmap_funzioni_piattaforma_2026.plan.md`](.cursor/plans/roadmap_funzioni_piattaforma_2026.plan.md)
- Requisiti cliente: [`docs/cliente/funzioni-piattaforma.md`](docs/cliente/funzioni-piattaforma.md)
- Mappa API/calcoli: il file `TODO_API_E_CALCOLI_FUNZIONI_PIATTAFORMA.txt` era indicato in roadmap storica; **se manca in working copy**, usare i documenti sotto `docs/` e `.cursor/plans/` piu aggiornati.

## Auth Locale e Google

- `register` e `login` devono funzionare anche in locale.
- Se Mongo Atlas non e raggiungibile in sviluppo, l'auth usa un fallback SQLite locale persistente in `.data/auth-local.sqlite`.
- In produzione il fallback non viene usato: se Mongo non risponde, l'auth fallisce esplicitamente.

Variabili Google:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED=false
```

Google Cloud Console:

- Authorized JavaScript origin: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

Con queste env attive, login e registrazione mostrano il bottone `Continua con Google` e Google One Tap solo se `NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED=true`.
