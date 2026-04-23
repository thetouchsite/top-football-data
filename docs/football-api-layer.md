# Football API layer (Next.js) — stato e riferimenti

Documento operativo per chi lavora sul repository: architettura attuale del feed calcio, cosa è già stato fatto, limiti, prossima fase. **Non sostituisce** le roadmap cliente; integra i punti tecnici football-specific.

*Ultimo aggiornamento: 2026-04-24*

---

## 1. Stato attuale del layer football

### Superfici API esposte

| Uso prodotto | Endpoint | Note |
|--------------|----------|------|
| **Dashboard, modelli predittivi, feed condiviso** | `GET /api/football/schedules/window?days=7` | Unico “list feed” condiviso; la route **clamp-a** i giorni a massimo **7** (`MAX_SCHEDULE_WINDOW_DAYS` in `src/app/api/football/schedules/window/route.js`). |
| **Dettaglio match** | `GET /api/football/fixtures/[fixtureId]` | Query `view=core` vs default/enrichment. |

Client unificato: `src/api/football.js` (coalescing inflight su stessa URL, nessuna cache browser persistente sul payload).

### List feed vs detail feed

- **List:** unica finestra pre-match, normalizzata a **ScheduleCardDTO** (v2 in mappa service; telemetria route può ancora riferire v1 in un campo — vedi codice), ordinamento con priorità leghe prodotto (`sortMatchesByFeaturedPriority` + `SPORTMONKS_PRIORITY_LEAGUE_IDS`).
- **Detail:** `getFixturePayload(fixtureId, { view })` in `src/server/football/service.js`  
  - **`view=core`:** DTO “core” (probabilità, quote, identità, score, value base, copertura) — policy include/deny in `SPORTMONKS_INCLUDE_POLICY` lato `detail_core`.  
  - **Senza `view` o enrichment:** formazioni, staff, arbitri, classifiche parziali, H2H, ecc. — percorso arricchitivo, include separati, fallimenti parziali non bloccanti dove previsto.

### Allowlist e priorità (policy prodotto)

- **Source of truth:** `src/lib/sportmonks-priority-league-ids.js` — `SPORTMONKS_OFFICIAL_LEAGUE_POLICY` (slug, nome, `sportmonksLeagueId`, `priority` per ordinamento in UI).
- **Filtro API schedule:** su `fixtures/between` si applica `fixtureLeagues` con gli ID ufficiali, salvo override env (vedi sotto). La selezione “quali leghe contano” **non** è più demandata principalmente alla UI: è **lato provider** (parametri richiesta + codice condiviso).

### Catalogo e mapping

- `src/lib/competitions/catalog.js` allinea slug catalogo e ID provider Sportmonks tramite `SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG`.

### Orchestrazione

- `src/server/football/service.js` - entrypoint pubblico: re-export di `getScheduleWindowPayload`, `prewarmScheduleWindowSnapshot`, `getFixturePayload` e contratti.
- `src/server/football/schedule.js` - orchestration calendario (L1/L2, SWR) e re-export prewarm.
- `src/server/football/schedule-window-builder.js` - builder unico `buildScheduleWindowFromProvider`.
- `src/server/football/schedule-snapshot-l2.js` - Redis/Upstash + envelope.
- `src/server/football/schedule-window-policy.js` - `policyVersion` e chiavi.
- `src/server/football/fixture.js` - orchestration dettaglio fixture, core/enrichment e fallback.
- `src/server/football/payloads.js` - builder DTO/payload e notice Sportmonks.
- `src/server/football/runtime.js` - cache inflight/memory e telemetria service.
- `src/server/football/contracts.js` - TTL, mappa provider, fallback policy e contratti DTO.

- `src/lib/providers/sportmonks/index.js` — chiamate HTTP, include per scope (list, detail core, enrichment), denylist include invalidi, normalizzazione, telemetria richieste (tagging purpose/route).

---

## 2. Lavori completati (sintesi tecnica)

Blocchi chiusi o consolidati a aprile 2026 (allineare al commit history se serve dettaglio fine):

- **Telemetria baseline** — log strutturati route + service (`[football][summary]`, `DEBUG_FOOTBALL_TELEMETRY` per dettaglio).
- **Requester tagging** — `route`, `requestPurpose`, `dtoTarget` / `dtoVersion` nelle chiamate provider ove applicabile.
- **Inflight coalescing** — stessa chiave `days` nel service: richieste parallele condividono la stessa Promise (pattern `inflight_shared`).
- **Clamp massimo 7 giorni** — finestra list non oltre 7 in route; provider clamp a 1–7 in `fetchSportmonksScheduleWindow`.
- **Riduzione payload list / core** — include list e percorso core sotto policy; raw compatto in schedule dove definito.
- **ScheduleCardDTO condiviso** — un contratto unico per dashboard e modelli (mappa in `FOOTBALL_API_PROVIDER_MAP`).
- **Split detail core / enrichment** — query `view` e policy include separate (`SPORTMONKS_INCLUDE_POLICY`, denylist per scope).
- **Expected / `expected.type` fuori dal core** — allineato ai contratti DTO in service (enrichment / campi opzionali, non bloccanti per core list/detail minimal).
- **Fallback policy e denylist** — `FOOTBALL_FALLBACK_POLICY_MATRIX` + set di include vietati per scope (`SPORTMONKS_INCLUDE_DENYLIST_BY_SCOPE`).
- **Semantica telemetria** — mappatura `source` lato service vs route (`memory_cache`, `stale_cache`, `provider_fetch`, `inflight_shared`, `fallback_provider`, …).
- **Allowlist campionati ufficiali** — lista in codice, filtro su `fixtures/between` via `getSportmonksFixtureLeaguesFilterParam()`.
- **Priority ordering e mapping catalogo/provider** — stessa lista usata per sort e per catalogo; ID Sportmonks stabili per slug.

Mappa estesa list/detail/endpoint: `.cursor/plans/api_provider_map_list_detail_a327d2f7.plan.md`.

---

## 3. Campionati ufficiali (prodotto)

Il feed schedule è ristretto agli ID definiti in `SPORTMONKS_OFFICIAL_LEAGUE_POLICY`, in linea con questa lista **per competizione** (nomi prodotto):

- Serie A  
- Premier League  
- La Liga  
- Bundesliga  
- Ligue 1  
- Championship  
- Primeira Liga  
- Serie B  
- UEFA Champions League  
- UEFA Europa League  
- UEFA Conference League  
- Brasileirão  
- Liga Profesional Argentina  

**Ordine di priorità in UI** (chi appare prima tra match dello stesso giorno) segue il campo `priority` nel file sorgente (vedi `sportmonks-priority-league-ids.js` — non necessariamente l’ordine alfabetico della lista qui sopra).

**Ruolo del filtro:** il filtro su quali leghe entrano in `fixtures/between` è **lato provider** (parametro `fixtureLeagues` costruito in `getSportmonksFixtureLeaguesFilterParam`). La UI **non** è il livello principale di selezione leghe per il list feed.  
Gli **override** tramite variabili d’ambiente sono **opzionali** (vedi sezione 4).

---

## 4. Variabili d’ambiente (football / Sportmonks, Next)

| Variabile | Ruolo | Default / note |
|-----------|--------|----------------|
| `SPORTMONKS_API_TOKEN` o `SPORTMONKS_API_KEY` | **Obbligatoria** per chiamate API | — |
| `SPORTMONKS_BASE_URL` | Base API | Default `https://api.sportmonks.com/v3` |
| `SPORTMONKS_SCHEDULE_DAYS` | Default giorni richiesta interna (env globale) | In `sportmonks/index.js` default numerico per `SPORTMONKS_DEFAULT_SCHEDULE_DAYS` è **7** (clamp 1–30 a livello env read); la **route** schedule clamp-a comunque a **max 7** query param. |
| `SPORTMONKS_SCHEDULE_LEAGUE_IDS` | **Override opzionale** filtro leghe: CSV di ID, oppure `all` / `global` / `*` per calendario globale (nessun `fixtureLeagues` string). | Se **non** impostata: si usano gli ID di `SPORTMONKS_OFFICIAL_ALLOWLIST_LEAGUE_IDS` (allowlist ufficiale). **Meccanismo principale = codice+allowlist**, non la UI. |
| `SPORTMONKS_SCHEDULE_MAX_PAGES` | Massimo pagine paginate su `fixtures/between` | Default **80** (clamp 1–200 nel codice). Aumenta il costo e il volume risposta. |
| `SPORTMONKS_MEDIA_BASE_URL` | Base CDN immagini | Default `https://cdn.sportmonks.com` |
| `DEBUG_FOOTBALL_TELEMETRY` | Log dettagliato route/football | `1` / `true` / `yes` |

**Cache L2 (Upstash Redis) — feed schedule `days=7` (produzione consigliata):**

| Variabile | Ruolo | Note |
|-----------|--------|------|
| `UPSTASH_REDIS_REST_URL` | **Obbligatoria** se si usa L2 | URL REST fornita da Upstash. |
| `UPSTASH_REDIS_REST_TOKEN` | **Obbligatoria** se si usa L2 | Token read/write. |
| `CRON_PREWARM_SECRET` o `SCHEDULE_PREWARM_CRON_SECRET` o `CRON_SECRET` | **Per proteggere** le chiamate a `GET /api/cron/prewarm-schedule-window` in produzione | In produzione, senza nessun secret impostato → **401**. Vercel invia `Authorization: Bearer <valore>` usando la variabile **`CRON_SECRET`** nelle [Cron native](https://vercel.com/docs/cron-jobs) (impostala a un token lungo; la stessa rotta accetta anche `CRON_PREWARM_SECRET` / `SCHEDULE_PREWARM_CRON_SECRET` per allineo manuale). **Non** richiesto per `GET /api/football/schedules/window`. Dev locale: permesso se non `VERCEL`+`production`. |

**Nota su `SPORTMONKS_SCHEDULE_LEAGUE_FILTER_STRICT`:** compare nel **testo informativo** (notice) in `service.js` quando è attivo un filtro leghe via API, ma **non** esiste un `process.env` omonimo letto nel codice al momento. Comportamento reale: filtro attivo se `getSportmonksFixtureLeaguesFilterParam()` produce una stringa `fixtureLeagues:...` (default allowlist; disattivabile solo con override `all`/`global`/`*`).

### Vercel Hobby vs Pro (prewarm e cron)

| Aspetto | **Hobby (piano attuale)** | **Pro (migrazione futura)** |
|--------|----------------------------|------------------------------|
| **Cron in repo** | [vercel.json](../vercel.json) — **1 esecuzione al giorno** (`0 5 * * *` ≈ 05:00 **UTC**), stessa route `/api/cron/prewarm-schedule-window`. Rispetta il **limite Hobby = un run/giorno**; serve a **test/integrazione** reale (route, secret, builder, scrittura L2), **non** sostituisce ancora il prewarm ogni 5 min previsto a regime. | Sostituire il blocco `crons` in `vercel.json` (o sostituire l’`schedule`) con l’esempio in [vercel-cron-pro.example.json](vercel-cron-pro.example.json) — **ogni 5 min**. Stessa route, stessi meccanismi di autenticazione. |
| **Prewarm** | Stessa funzione: no-op se snapshot già *fresh*; con traffico poco frequente, il run giornaliero mantiene comunque Redis “calda” a intervallo largo. | A regime: hit frequenti a snapshot, costo API più prevedibile, UX più allineata al design originale. |
| **Feed schedule** | Invariato: nessun cambio contratti JSON. | Uguale. |

Checklist manuale / staging: [schedule-window-cache-validation.md](schedule-window-cache-validation.md).

---

## 5. Architettura performance feed 7 giorni (implementata)

- **L1** (`Map` per worker): chiave `days:policyVersion` — stesso body JSON pronto.
- **L2** (Upstash Redis, `src/server/football/schedule-snapshot-l2.js`): valore = envelope JSON (snapshot finale + metadati), **non** raw provider.
- **Builder unico** `buildScheduleWindowFromProvider` in `src/server/football/schedule-window-builder.js` — usato da `getScheduleWindowPayload`, SWR, stale-if-error, prewarm.
- **Policy version** (`getScheduleWindowPolicyVersion`): hash SHA-256 16 char di `SPORTMONKS_SCHEDULE_*` (via `getSportmonksFixtureLeaguesFilterParam`) + schema; chiave dato: `football:schedule:window:{days}:policy:{policyVersion}:data`.
- **SWR:** fresh &lt; **3 min**; soft stale **3–15 min** e hard stale **15 min–6 h** servono subito + background refresh (lock SWR o guard locale); oltre **6 h** si forza rebuild (o attesa L2) prima di considerare risposta da solo snapshot.
- **Lock rebuild:** `...:lock` (Redis `SET` NX) ~90s; SWR: `...:lock:swr` ~60s. **Coalescing** in-process: `inflight` sulla stessa chiave rebuild.
- **stale-if-error** se `fetch` fallisce e c’è envelope &lt; 6 h: non sovrascrive con failure.
- **Prewarm** `GET /api/cron/prewarm-schedule-window`: stesso builder; se già *fresh* → skip. In **Hobby** c’è un **cron Vercel giornaliero** in [vercel.json](../vercel.json) (test integrazione, non 5m). In **Pro** sostituire con [vercel-cron-pro.example.json](vercel-cron-pro.example.json) per **ogni 5 min** quando vorrete il target finale.

Telemetria route/ service: `cacheLayer`, `policyVersion`, `snapshotAgeMs`, `refreshState` (meta non serializzata nel body JSON, solo log).

### Esito test manuali (2026-04-23, locale)

Checklist eseguita e superata su endpoint `GET /api/football/schedules/window?days=7`:

- L2 hit dopo restart processo (cold L1) verificato.
- SWR verificato su finestre stale soft/hard (`ref=swr_async`) con refresh provider in background.
- Expired (>6h) verificato con rebuild provider (`ref=rebuild_ok`).
- stale-if-error verificato con errore provider simulato (snapshot servita senza blocco UX).
- Confermata lettura L2 robusta su payload Upstash stringa/oggetto.

Nota operativa locale: in questa macchina `next dev` (Turbopack) ha dato 404 intermittenti su `/api/*`; per test affidabili usare `npx next dev --webpack`. In produzione non cambia l'architettura applicativa descritta sopra.

### Fixture detail (`/api/football/fixtures/[fixtureId]`) — fase 1 ottimizzazione

Implementata una fase 1 leggera (senza L2 Redis) per migliorare latenza e robustezza del dettaglio match:

- **L1 cache per `fixtureId:view`** (`core`/`full`) con TTL dinamico per stato match:
  - prematch: 5m
  - live: 20s
  - finished: 60m
- **Inflight coalescing** per evitare richieste duplicate concorrenti sullo stesso `fixtureId:view`.
- **stale-if-error**: se il provider fallisce e la cache locale è ancora entro finestra di sicurezza, viene servito l'ultimo snapshot disponibile.
- **Telemetria estesa** su summary route: `layer`, `ageMs`, `ref`, `fstate` (oltre a `cache/source`).

Esito test manuali locale: `miss -> L1 hit` confermato, inflight confermato (`inflight_wait`), separazione cache `view=core` e `view=full` confermata.

---

## 6. Piano e documentazione

Piano: [`.cursor/plans/feed_7_giorni_velocissimo_vfinale.plan.md`](../.cursor/plans/feed_7_giorni_velocissimo_vfinale.plan.md) — fase **implementata**.

---

## 7. Puntatori file

| Cosa | Dove |
|------|------|
| Service entrypoint | `src/server/football/service.js` |
| Service calendario, L1/L2 | `src/server/football/schedule.js` |
| Builder list schedule | `src/server/football/schedule-window-builder.js` |
| L2 Upstash / envelope | `src/server/football/schedule-snapshot-l2.js` |
| Policy + chiavi Redis | `src/server/football/schedule-window-policy.js` |
| Constants TTL schedule | `src/server/football/schedule-window-constants.js` |
| Service fixture | `src/server/football/fixture.js` |
| Prewarm (route HTTP) | `src/app/api/cron/prewarm-schedule-window/route.js` |
| Cron Vercel (Hobby: 1x/giorno) | [vercel.json](../vercel.json) (schedule giornaliero UTC) |
| Esempio cron Vercel Pro (5 min) | [vercel-cron-pro.example.json](vercel-cron-pro.example.json) (sostituisce lo `schedule` in `vercel.json`) |
| Payload, cache e contratti service | `src/server/football/payloads.js`, `src/server/football/runtime.js`, `src/server/football/contracts.js` |
| Provider + include policy | `src/lib/providers/sportmonks/index.js` |
| Allowlist e priorità | `src/lib/sportmonks-priority-league-ids.js` |
| Catalogo competizioni | `src/lib/competitions/catalog.js` |
| Client HTTP + coalescing | `src/api/football.js` |
| Route schedule | `src/app/api/football/schedules/window/route.js` |
| Route fixture | `src/app/api/football/fixtures/[fixtureId]/route.js` |
| Filtri / sort | `src/lib/football-filters.js` |

---

## 8. TODO / status (sintesi)

| Area | Stato |
|------|--------|
| Contratti list/detail, allowlist, telemetria, inflight, clamp 7 giorni | **DONE** (manutenzione evolutiva a parte) |
| Performance feed 7 giorni (L2, SWR, prewarm) | **DONE** (L1+L2+builder; Hobby = cron **giornaliero** in `vercel.json`; Pro = sost. con example **5m**) |
| Refactor UI ampio o cambio allowlist prodotto senza processo | **OUT OF SCOPE** finché non deciso (la allowlist in codice resta la fonte) |

---

## 9. Stato operativo prodotto che dipende dal layer football

Aggiornamento 2026-04-24:

- `GET /api/alerts` e `GET /api/performance` sono ormai parte attiva del prodotto:
  - pagina Alert inviati
  - pagina Multi-Bet
  - pagina Performance Storiche

- `/multi-bet` oggi usa:
  - `type=multibet&status=pending` come fonte primaria
  - fallback sugli ultimi multibet salvati se non ci sono pending

- Il backend Telegram/worker usa il layer football e Sportmonks per:
  - scansione fixture
  - generazione candidate markets
  - single alerts
  - multibet alerts
  - settlement
  - performance summary
  - daily post "Top 3 Value Bet del giorno"

- Il layer football frontend e il worker Telegram sono ora coerenti sul concetto di:
  - value bet
  - confidence
  - top value feed

Limite ancora aperto:
- tracking click proprietario `/r/...` non ancora implementato
- player props bookmaker context-aware ancora parziali e dipendenti da copertura feed/provider

Per stato lavori globale del repo, includere `TODO_SVILUPPO_TOP_FOOTBALL_DATA.txt` nella lettura.
