# Football API layer (Next.js) — stato e riferimenti

Documento operativo per chi lavora sul repository: architettura attuale del feed calcio, cosa è già stato fatto, limiti, prossima fase. **Non sostituisce** le roadmap cliente; integra i punti tecnici football-specific.

*Ultimo aggiornamento: 2026-04-22*

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

- `src/server/football/service.js` — `getScheduleWindowPayload`, `getFixturePayload`, costanti di mappa provider (dashboard/modelli, dettagli), matrice **fallback policy** e ordine di implementazione documentati come export (riferimento per contratti e scope).

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

**Nota su `SPORTMONKS_SCHEDULE_LEAGUE_FILTER_STRICT`:** compare nel **testo informativo** (notice) in `service.js` quando è attivo un filtro leghe via API, ma **non** esiste un `process.env` omonimo letto nel codice al momento. Comportamento reale: filtro attivo se `getSportmonksFixtureLeaguesFilterParam()` produce una stringa `fixtureLeagues:...` (default allowlist; disattivabile solo con override `all`/`global`/`*`).

---

## 5. Limiti attuali e problema aperto principale

- Il feed **7 giorni** è **funzionalmente e policy-corretto** (allowlist, DTO, split core/enrichment, telemetria).
- I **hit caldi** (memory in-process, stesso worker, entro TTL ~60s) vanno bene.
- Il **problema residuo** è **architetturale / performance**: cache solo in memoria per processo, TTL breve, istanze serverless non condividono la Map → **cold path** lento (decine di secondi possibili) su primo hit dopo deploy, altra istanza, o scadenza TTL.
- **Prossima fase prioritaria (football list)** non è ulteriore “API cleanup” del contratto, bensì **performance del feed `days=7`**: store condiviso, SWR, prewarm, come da piano dedicato.

---

## 6. Prossima fase (pianificata, non implementata in questo blocco)

Piano unico: [`.cursor/plans/feed_7_giorni_velocissimo_vfinale.plan.md`](../.cursor/plans/feed_7_giorni_velocissimo_vfinale.plan.md)

In sintesi:

- Snapshot **finale normalizzato** in cache condivisa (non raw Sportmonks).
- **Chiave versionata** per policy/allowlist.
- SWR con stati **fresh / stale / hard-expired**, **anti-stampede** (lock + refresh unico), **stale-if-error**.
- **Prewarm** (cron) che invoca **lo stesso builder** del path runtime.

Nessun impegno a implementare in questo file; solo tracciamento intent.

---

## 7. Puntatori file

| Cosa | Dove |
|------|------|
| Service orchestrazione | `src/server/football/service.js` |
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
| Performance feed 7 giorni (L2, SWR, prewarm) | **NEXT** (piano in `.cursor/plans/feed_7_giorni_velocissimo_vfinale.plan.md`) |
| Refactor UI ampio o cambio allowlist prodotto senza processo | **OUT OF SCOPE** finché non deciso (la allowlist in codice resta la fonte) |

Per stato lavori globale del repo, includere `TODO_SVILUPPO_TOP_FOOTBALL_DATA.txt` nella lettura.
