# Validazione cache schedule window (L1 / L2 / SWR)

Riferimento implementazione: `src/server/football/schedule.js`, `schedule-snapshot-l2.js`, `schedule-window-builder.js`.

Documento per check **manuali** o staging (non eseguito in CI senza Redis e token Sportmonks).

**Prewarm Vercel (Hobby):** in [vercel.json](../vercel.json) è configurato un cron **1 volta al giorno** (orario in UTC) sulla route `/api/cron/prewarm-schedule-window` — adatto a test/integrazione su piano Hobby, non sostituisce il prewarm ogni 5 min (vedi [vercel-cron-pro.example.json](vercel-cron-pro.example.json) e `docs/football-api-layer.md`).

## Esito validazione eseguita (locale, 2026-04-23)

Validazione manuale completata su endpoint `GET /api/football/schedules/window?days=7` con Redis Upstash reale.

- **L2 hit dopo cold process:** confermato (`layer=L2`, `source=l2_cache`, latenza bassa).
- **SWR (3-15m e 15m-6h):** confermato (`ref=swr_async`, risposta veloce da cache + refresh async provider).
- **Expired (>6h):** confermato rebuild sincrono (`cache=miss`, `layer=provider`, `ref=rebuild_ok`, latenza alta attesa).
- **stale-if-error:** confermato (`cacheState=stale-hit`, `refreshState=stale_if_error`) con errore provider simulato.
- **Fix applicata e verificata:** in `schedule-snapshot-l2.js` la lettura L2 gestisce sia payload stringa JSON sia oggetto deserializzato.

Nota operativa locale: in questa sessione `next dev` (Turbopack) ha mostrato 404 intermittenti sulle route `/api/*`; i test sono stati eseguiti in modo stabile con `npx next dev --webpack`.

---

## Body pubblico `GET /api/football/schedules/window?days=7`

La risposta JSON è costruita da `buildSchedulePayload` / builder + `getScheduleWindowPayload` e **non** include metadati interni di telemetria (es. `cacheLayer`, `policyVersion`): quelle informazioni restano su proprietà non enumerabili lato service e **non** entrano in `NextResponse.json`.

**Chiavi JSON di primo livello** (stesso set di prima della cache L2, salvo variazioni di *valore* in `matches`, `notice`, `freshness` coerenti con i dati):

| Chiave | Ruolo |
|--------|--------|
| `matches` | Array DTO (normalize + enrich) |
| `competitions` | Riassunti competizioni |
| `window` | Finestra tempi |
| `rawSchedules` | Riepilogo compatto (se presente) |
| `provider` | Es. `sportmonks` |
| `source` | Es. `sportmonks_cache`, `sportmonks_api`, `sportmonks_inflight`, `provider_unavailable` |
| `isFallback` | boolean |
| `freshness` | oggetto freshness (TTL interno vedi `SCHEDULE_CACHE_TTL_MS` in contratti) |
| `notice` | stringa |

Nessun campo aggiuntivo *enumerabile* è stato introdotto rispetto al percorso basato su `buildSchedulePayload`.

**Verifica rapida in Node (dev, dopo `npm run dev`):**

```text
# Solo chiavi (devono corrispondere a elenco sopra, niente meta cache)
curl -s "http://localhost:3000/api/football/schedules/window?days=7" | node -e "const d=require('fs').readFileSync(0,'utf8'); console.log(Object.keys(JSON.parse(d)).sort().join(', '))"
```

---

## Prerequisiti condivisi (test con L2 reale)

- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` impostati
- `SPORTMONKS_API_TOKEN` valido
- (Opzionale) `CRON_PREWARM_SECRET` se si usa l’endpoint prewarm con auth in produzione

Confrontare log `[football][summary]` e, se abilitato, `DEBUG_FOOTBALL_TELEMETRY=1` e `[football][service]`.

| # | Scenario | Precondizione | Cosa fare | Atteso (indicatori) |
|---|----------|----------------|----------|------------------------|
| **1** | Cold miss completo | L1 e L2 vuoti per quella `policyVersion` (nuovo env o chiave diversa) | `GET /api/.../window?days=7` | `cacheState=miss` o equivalente, `source=provider_fetch` nel summary, `e2eMs` alto, prima richiesta scrive L2. Seconda hit entro 3m: L1. |
| **2** | L2 hit (Redis) | Dopo 1) o prewarm, oppure stesso deploy con Redis già popolato; svuotare L1 istanza (es. altra istanza / cold worker) o attendere e colpire istanza senza L1 | `GET` da istanza che non ha L1 o dopo deploy | `layer=L2` nel summary (o `l2_cache` come `source` derivata), `e2eMs` basso, `ageMs` plausibile. In Redis, chiave `football:schedule:window:7:policy:*:data` presente. |
| **3** | Stale servito + refresh in background | Snapshot con `fetchedAt` tra 3m e 6h (o ridurre in dev aspettando) | `GET` | `refreshState=swr_async` (o tier soft/hard in meta log), stesso `matches` al volo, eventualmente SWR in log dopo qualche istante. |
| **4** | Stale-if-error | Un envelope in L2 con età &lt; 6h, poi simulare errore provider (es. `SPORTMONKS_API_KEY` errato in env temporaneo) | `GET` | Risposta 200 con `isFallback: true` e notice errore, `stale_cache` o simile, **nessun** L2 sovrascritto con corpo fallito. Ripristinare token e verificare che il rebuild torni ok. |

**Esito in questo repo:** i test non sono eseguiti in pipeline automatica; usare la tabella come **checklist** su staging/PR preview con Redis.

---

## Rischi residui (short)

- Senza Upstash, solo L1 per processo: cold cross-istanza come prima.
- Hobby: nessun cron Vercel integrato; prewarm solo on-demand, esterno o post-upgrade Pro.
- Lock Redis scaduto durante rebuild molto lenti: secondo processo potrebbe duplicare fetch (bassa probabilità).
