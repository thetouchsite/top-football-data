# Top Football Data - Telegram Alert Backend

Backend Python deployabile su Railway. Fa da orchestratore per value bet, multibet, alert Telegram e performance storiche.

## Ruolo Nel Progetto

Questo servizio e separato dal sito Next/React. Deve rimanere sempre acceso su Railway, anche quando nessun utente visita il sito.

```text
Sportmonks -> Python Railway -> MongoDB -> Next/Vercel
                         \-> Telegram
```

Il sito legge gli alert da MongoDB tramite:

- `GET /api/alerts`
- `GET /api/performance`

## Cosa Fa

- Legge il calendario Sportmonks dei prossimi giorni.
- Incrocia predizioni e quote pre-match.
- Calcola:
  - probabilita modello;
  - quota modello `1 / probabilita`;
  - value percentuale;
  - edge/EV `probabilita * quota bookmaker`.
- Seleziona candidati con `edge >= CANDIDATE_EDGE_THRESHOLD`.
- Invia alert Telegram per singole o multiple con `EV >= NOTIFICATION_EV_THRESHOLD`.
- Salva ogni alert in MongoDB nella collection `betAlerts`.
- Controlla i match conclusi e aggiorna gli alert come `won`, `lost` o `void`.
- Registra ROI e storico nella collection `betPerformance`.
- Deduplica gli alert per evitare spam a ogni ciclo.

## File Principali

- `app/main.py`: FastAPI, worker schedulato, `/health`, `/run-once`, `/test-telegram`.
- `app/sportmonks.py`: client Sportmonks.
- `app/engine.py`: calcolo value bet e multibet.
- `app/site_feed.py`: demo Telegram dai pronostici gia esposti dal sito Next.
- `app/telegram.py`: invio Telegram.
- `app/mongodb.py`: persistenza `betAlerts` e `betPerformance`.
- `app/results.py`: settlement won/lost/void.
- `app/storage.py`: deduplica locale anti-spam.
- `requirements.txt`: dipendenze Python.
- `Procfile`: start command Railway.
- `env.example`: template variabili ambiente.

## Deploy Railway

1. Crea un nuovo servizio Railway dalla repo.
2. Imposta come root directory:

```text
telegram-alert-backend
```

3. Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Il `Procfile` contiene gia un comando equivalente.

## Variabili Ambiente

```env
SPORTMONKS_API_TOKEN=your_sportmonks_token
SPORTMONKS_BASE_URL=https://api.sportmonks.com/v3/football
SPORTMONKS_SCHEDULE_DAYS=4
SPORTMONKS_TIMEZONE=Europe/Rome

MONGODB_URI=mongodb+srv://...
MONGODB_DB=top-football-pulse
APP_BASE_URL=https://your-next-app.vercel.app

TELEGRAM_BOT_TOKEN=123456:telegram_bot_token
TELEGRAM_CHAT_ID=@top_football_data_test

POLL_INTERVAL_SECONDS=300
CANDIDATE_EDGE_THRESHOLD=1.05
NOTIFICATION_EV_THRESHOLD=1.25
MULTIBET_MIN_EVENTS=3
MULTIBET_MAX_EVENTS=4
MAX_ALERTS_PER_RUN=8
DEMO_MIN_PROBABILITY=0.80
DEMO_MAX_PICKS=5
DEMO_SCHEDULE_DAYS=14

BOOKMAKER_AFFILIATE_LINKS_JSON={"Bet365":"https://example.com/bet365","Snai":"https://example.com/snai"}
CTA_LABEL=Vedi quota
```

Note:

- Puoi usare `SPORTMONKS_API_KEY` al posto di `SPORTMONKS_API_TOKEN`.
- `MONGODB_URI` e `MONGODB_DB` devono essere gli stessi del sito Vercel.
- `APP_BASE_URL` deve puntare al sito Next/Vercel. Serve per la demo Telegram che legge i pronostici gia visibili nel sito.
- `TELEGRAM_CHAT_ID` puo essere `@username_canale` o id numerico.
- `CTA_LABEL` evita formule legalmente sensibili come "Gioca Ora"; default consigliato: `Vedi quota`.

## Endpoint

Healthcheck:

```text
GET /health
```

Risposta indicativa:

```json
{
  "ok": true,
  "sportmonks_configured": true,
  "telegram_configured": true,
  "mongodb_configured": true,
  "mongodb_enabled": true,
  "last_result": {}
}
```

Test Telegram senza Sportmonks:

```text
POST /test-telegram
```

Demo pronostici dal feed del sito, senza Predictions/Odds:

```text
POST /demo-pronostici
GET /demo-pronostici
```

Questo endpoint legge `APP_BASE_URL/api/football/schedules/window` su una finestra di `DEMO_SCHEDULE_DAYS`, filtra i pronostici con probabilita modello almeno `DEMO_MIN_PROBABILITY` e manda un messaggio Telegram. Usa i dati gia visibili nel sito, non genera pronostici casuali. La versione `GET` serve per richiamarlo rapidamente da browser.

Scanner manuale completo:

```text
POST /run-once
```

`/run-once` fa:

- settlement degli alert pending;
- scansione fixture Sportmonks;
- calcolo value bet/multibet;
- salvataggio MongoDB;
- invio Telegram se ci sono nuovi alert sopra soglia.

## Test Locale

Dalla cartella backend:

```powershell
cd telegram-alert-backend
python -m pip install -r requirements.txt
```

Test configurazione:

```powershell
python -c "from app.main import worker; print({'telegram': worker.telegram.configured, 'mongo': worker.repository.enabled, 'sportmonks': bool(worker.settings.resolved_sportmonks_token)})"
```

Test Telegram:

```powershell
python -c "import asyncio; from app.main import worker; asyncio.run(worker.telegram.send_message('Test Top Football Data')); print({'ok': True, 'sent': 1})"
```

Test scanner:

```powershell
python -c "import asyncio; from app.main import worker; print(asyncio.run(worker.run_once()))"
```

Server locale:

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

In un altro terminale:

```powershell
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/health"
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/test-telegram"
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/demo-pronostici"
Invoke-RestMethod -Method Get -Uri "http://127.0.0.1:8000/demo-pronostici"
Invoke-RestMethod -Method Post -Uri "http://127.0.0.1:8000/run-once"
```

## Test Railway

```powershell
Invoke-RestMethod -Method Get -Uri "https://TUO-SERVIZIO.up.railway.app/health"
Invoke-RestMethod -Method Post -Uri "https://TUO-SERVIZIO.up.railway.app/test-telegram"
Invoke-RestMethod -Method Post -Uri "https://TUO-SERVIZIO.up.railway.app/demo-pronostici"
Invoke-RestMethod -Method Get -Uri "https://TUO-SERVIZIO.up.railway.app/demo-pronostici"
Invoke-RestMethod -Method Post -Uri "https://TUO-SERVIZIO.up.railway.app/run-once"
```

## MongoDB

Collection scritte dal worker:

- `betAlerts`
- `betPerformance`

`betAlerts` contiene:

- tipo alert: `single` o `multibet`;
- stato: `pending`, `won`, `lost`, `void`;
- fixture ids;
- quote, bookmaker, comparatore;
- edge/EV;
- timestamp;
- flag `telegramSent`.

`betPerformance` contiene:

- alert chiusi;
- stake unitario;
- quota totale;
- profit/loss in unita;
- ROI;
- legs risolte.

## Setup Telegram

1. Crea un bot con `@BotFather`.
2. Copia il token in `TELEGRAM_BOT_TOKEN`.
3. Crea un canale Telegram di test.
4. Aggiungi il bot come amministratore del canale.
5. Imposta `TELEGRAM_CHAT_ID=@nome_canale`.

Quando il test funziona, cambia solo `TELEGRAM_CHAT_ID` e punta al canale del cliente.

Nota sicurezza: se un token Telegram viene incollato in chat o condiviso, rigenerarlo con `/revoke` prima della produzione.

## Requisiti Sportmonks

Il servizio genera alert reali solo quando Sportmonks restituisce predizioni e quote bookmaker compatibili.

Per coprire pienamente i requisiti cliente servono gli add-on corretti:

- Predictions per probabilita e value-bets.
- Odds pre-match per comparatore.
- Lineups/statistiche/xG per reliability score, impact player e moduli avanzati.

Senza questi add-on il backend resta acceso, ma puo non generare alert.

## Stato Verificato

- Bot Telegram e canale test: validati.
- Salvataggio MongoDB: implementato.
- API Next `/api/alerts` e `/api/performance`: implementate nel sito.
- Lint frontend: OK.
- Typecheck frontend: OK.
- Compile Python: OK.
- Generazione alert reale: dipende da chiave Sportmonks valida con copertura Predictions/Odds.
