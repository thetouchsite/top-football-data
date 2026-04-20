# Top Football Data - Telegram Alert Backend

Backend Python deployabile su Railway per inviare alert Telegram quando Sportmonks espone quote con valore atteso positivo.

## Cosa fa

- Legge il calendario Sportmonks dei prossimi giorni.
- Incrocia predizioni e quote pre-match.
- Calcola:
  - probabilita modello;
  - quota modello `1 / probabilita`;
  - value percentuale;
  - edge/EV `probabilita * quota bookmaker`.
- Invia alert Telegram per singole o multiple quando `EV >= NOTIFICATION_EV_THRESHOLD`.
- Deduplica gli alert per evitare spam a ogni ciclo.

## Deploy Railway

1. Crea un nuovo servizio Railway puntando alla cartella `telegram-alert-backend`.
2. Imposta le variabili d'ambiente usando `env.example` come base.
3. Railway rileva `Procfile` e avvia:

```bash
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

Healthcheck:

```text
GET /health
```

Esecuzione manuale scanner:

```text
POST /run-once
```

Test solo Telegram, senza chiamare Sportmonks:

```text
POST /test-telegram
```

## Variabili principali

- `SPORTMONKS_API_TOKEN` o `SPORTMONKS_API_KEY`: token Sportmonks Football API v3.
- `TELEGRAM_BOT_TOKEN`: token del bot creato con BotFather.
- `TELEGRAM_CHAT_ID`: canale Telegram di destinazione. Per il test usa un canale tuo, esempio `@top_football_data_test`; quando vai in produzione sostituiscilo con il canale del cliente.
- `POLL_INTERVAL_SECONDS`: frequenza scansione, default 300 secondi.
- `CANDIDATE_EDGE_THRESHOLD`: soglia minima evento candidato, default `1.05`.
- `NOTIFICATION_EV_THRESHOLD`: soglia invio alert, default `1.25`.
- `BOOKMAKER_AFFILIATE_LINKS_JSON`: mappa bookmaker/link affiliazione.
- `CTA_LABEL`: testo CTA Telegram. Default `Vedi quota`, evitando "Gioca Ora".

## Setup Telegram di test

1. Crea un bot con `@BotFather` e copia il token in `TELEGRAM_BOT_TOKEN`.
2. Crea un canale Telegram privato o pubblico per i test.
3. Aggiungi il bot come amministratore del canale, con permesso di pubblicare messaggi.
4. Se il canale ha username pubblico, usa `TELEGRAM_CHAT_ID=@nome_canale`.
5. Se il canale e privato, recupera l'id numerico del canale e usalo come `TELEGRAM_CHAT_ID`.

Quando il test funziona, su Railway cambi solo `TELEGRAM_CHAT_ID` e punti al canale del cliente.

## Nota importante sui dati

Il servizio invia alert solo quando nel feed Sportmonks sono presenti sia predizioni sia quote bookmaker compatibili. Per i requisiti completi del cliente servono gli add-on Sportmonks corretti:

- Predictions per probabilita e value-bets.
- Odds pre-match per comparatore.
- Lineups/statistiche/xG per affidabilita, impact player e moduli avanzati.

Senza questi add-on il backend resta acceso, ma non genera alert reali.
