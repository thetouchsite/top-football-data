---
name: api_provider_map_list_detail
overview: Mappa tecnica e piano operativo per riordinare il layer API/provider dei tre settori (dashboard, modelli-predittivi, match-detail) mantenendo invariate le patch già approvate e senza interventi infrastrutturali.
todos:
  - id: map-api-by-sector
    content: Consolidare mappa endpoint interno → service → endpoint Sportmonks per dashboard/modelli/detail con include attuali e criticità.
    status: completed
  - id: define-shared-list-dto
    content: Formalizzare ScheduleCardDTO condiviso (campi obbligatori/extra/vietati) per dashboard+modelli.
    status: completed
  - id: separate-detail-core-enrichment
    content: Disegnare separazione detail core vs enrichment con endpoint ideali, include per blocco e fallback policy.
    status: completed
  - id: fallback-policy-matrix
    content: Definire policy fallback consentiti/vietati per list, detail core, enrichment e denylist include invalidi.
    status: completed
  - id: implementation-order
    content: Stabilire ordine step 1-2-3 file-by-file senza interventi infrastrutturali.
    status: completed
isProject: false
---

# API/Provider Technical Map (Dashboard, Modelli, Match Detail)

## Vincoli Confermati

- Manteniamo invariato quanto già approvato: telemetria baseline, requester tagging, inflight coalescing, clamp max 7 giorni, riduzione payload list/core.
- Nessun lavoro infrastrutturale in questo ciclo: no Redis, worker, read models, SWR/prewarm, polling.
- Nessun refactor UI ampio; solo allineamenti minimi quando indispensabili.

## 1) API Map Per Settore

### Dashboard

- **Endpoint interno**: `/api/football/schedules/window?days=7` (+ livescore opzionale) usato da [c:/Users/ET/Downloads/Works/top-football-data/src/screens/Dashboard.jsx](c:/Users/ET/Downloads/Works/top-football-data/src/screens/Dashboard.jsx)
- **API client/service**:
  - `getScheduleWindow(7, { requester: "Dashboard" })` in [c:/Users/ET/Downloads/Works/top-football-data/src/api/football.js](c:/Users/ET/Downloads/Works/top-football-data/src/api/football.js)
  - `GET` route in [c:/Users/ET/Downloads/Works/top-football-data/src/app/api/football/schedules/window/route.js](c:/Users/ET/Downloads/Works/top-football-data/src/app/api/football/schedules/window/route.js)
  - `getScheduleWindowPayload()` in [c:/Users/ET/Downloads/Works/top-football-data/src/server/football/service.js](c:/Users/ET/Downloads/Works/top-football-data/src/server/football/service.js)
- **Endpoint Sportmonks sottostante**: `fixtures/between/{from}/{to}` in [c:/Users/ET/Downloads/Works/top-football-data/src/lib/providers/sportmonks/index.js](c:/Users/ET/Downloads/Works/top-football-data/src/lib/providers/sportmonks/index.js)
- **Include oggi list**: `league,state,participants,scores,odds,predictions.type,statistics.type` (`SPORTMONKS_SCHEDULE_PREMATCH_INCLUDES`)
- **Include da mantenere**: quelli sopra (list-card critical)
- **Include vietati (list)**: `season`, `stage`, `round`, `venue`, `metadata`, `odds.bookmaker`, player markets, correct score completo, corners deep, nested non card-critical
- **Criticità**: dashboard consuma molte viste diverse (top match, value, confidence, prossimi), quindi il DTO list deve mantenere campi value+confidence+odds senza portare payload detail

### Modelli Predittivi

- **Endpoint interno**: stesso `/api/football/schedules/window?days=7` da [c:/Users/ET/Downloads/Works/top-football-data/src/screens/ModelliPredittivi.jsx](c:/Users/ET/Downloads/Works/top-football-data/src/screens/ModelliPredittivi.jsx)
- **API client/service/provider**: stessa chain dashboard ([c:/Users/ET/Downloads/Works/top-football-data/src/api/football.js](c:/Users/ET/Downloads/Works/top-football-data/src/api/football.js) → [c:/Users/ET/Downloads/Works/top-football-data/src/app/api/football/schedules/window/route.js](c:/Users/ET/Downloads/Works/top-football-data/src/app/api/football/schedules/window/route.js) → [c:/Users/ET/Downloads/Works/top-football-data/src/server/football/service.js](c:/Users/ET/Downloads/Works/top-football-data/src/server/football/service.js) → [c:/Users/ET/Downloads/Works/top-football-data/src/lib/providers/sportmonks/index.js](c:/Users/ET/Downloads/Works/top-football-data/src/lib/providers/sportmonks/index.js))
- **Endpoint Sportmonks**: `fixtures/between/{from}/{to}`
- **Include oggi**: stessi include list ridotti
- **Include da mantenere**: list card + mercati 1X2/OU/GG + prediction type + statistics type
- **Include vietati**: uguali al dashboard (in particolare bookmaker deep, corners deep, correct score completo, metadata)
- **Criticità**: `MatchCard` consuma molti campi; serve governance esplicita per evitare slittamento verso detail

### Match Detail

- **Endpoint interno**: `/api/football/fixtures/[fixtureId]` via [c:/Users/ET/Downloads/Works/top-football-data/src/app/api/football/fixtures/[fixtureId]/route.js](c:/Users/ET/Downloads/Works/top-football-data/src/app/api/football/fixtures/[fixtureId]/route.js) e [c:/Users/ET/Downloads/Works/top-football-data/src/screens/MatchDetail.jsx](c:/Users/ET/Downloads/Works/top-football-data/src/screens/MatchDetail.jsx)
- **Service**: `getFixturePayload()` in [c:/Users/ET/Downloads/Works/top-football-data/src/server/football/service.js](c:/Users/ET/Downloads/Works/top-football-data/src/server/football/service.js)
- **Endpoint Sportmonks sottostanti (oggi)**:
  - `fixtures/{fixtureId}` con fallback include-chain (`SPORTMONKS_FIXTURE_INCLUDE_ATTEMPTS`)
  - `standings/seasons/{seasonId}`
  - `squads/teams/{teamId}` (home/away)
  - integrazione odds dedicata (`odds/pre-match/fixtures/{fixtureId}`) se odds base insufficienti
- **Include oggi**: multi-chain ampia sul detail + standings/squad enrich
- **Include da mantenere**:
  - Core: subset indispensabile a header/prob/odds/value/xg/pressure/scores/bookmaker comparison
  - Enrichment: standings, lineups/formations, squad/staff/referees, h2h
- **Include vietati nel core**: enrichment-only (standings/squad/staff) e retry chain speculative
- **Criticità**: oggi il detail è monolitico (core+enrichment nello stesso request path)

## 2) Dashboard + Modelli: DTO Condiviso List/Card

### DTO condiviso target (`ScheduleCardDTO`)

- **Identità/tempo**: `id`, `sportEventId`, `kickoff_at`, `date`, `time`, `status`, `state`
- **Team/competition/media**: `home`, `away`, `homeShort`, `awayShort`, `league`, `competition`, `home_media`, `away_media`, `league_media`
- **Mercati/probabilità**: `prob`, `odds`, `ou`, `gg`, `ouProb`, `ggProb`, `modelOdds`, `modelOddsOu`, `modelOddsGg`
- **Predittivo/value**: `xg`, `valueBet`, `valueBetSource`, `valueMarkets.primary`, `valueMarkets.modelOdds`, `confidence`, `confidence_source`, `reliability_score`, `scores`, `badges`
- **Meta operativa**: `prediction_provider`, `odds_provider`, `provider_ids`, `coverage`, `apiLoaded`

### Campi comuni Dashboard + Modelli

- team/league/media/time/status
- 1X2 odds + probabilità
- value bet + confidence
- score/probable results
- source/provider/freshness (via payload envelope + chips)

### Campi extra modelli (non richiesti da dashboard base)

- `modelOddsOu`, `modelOddsGg`
- filtri/ordinamenti avanzati su value/xg/odds
- maggiore dettaglio di market presentation in `MatchCard`

### Campi da non far entrare mai nella list

- dataset player-centric (player markets, scorer ladders)
- correct score completo e corners deep
- bookmaker deep tree (raw bookmaker payload)
- metadata generico non visualizzato in card
- qualsiasi nested detail non usato da dashboard/modelli list

## 3) Match Detail: Core Vs Enrichment

### A) Core Detail

- **Use case**: caricamento rapido e stabile della pagina detail
- **Endpoint ideale**: `GET /api/football/fixtures/[fixtureId]?view=core` (internamente può usare stesso route con separazione logica)
- **Dati core**:
  - header match/team/loghi/lega/stato
  - confidence/value bet
  - probabilità + quote base (1X2, O/U, GG)
  - xG pre-match
  - pressure preview
  - risultati probabili
  - comparatore quote (solo struttura necessaria)
- **Include ideali core**:
  - `league,state,participants,scores,odds,predictions.type,statistics.type,expected.type,pressure`
- **Fallback ammessi core**:
  - cache hit/stale cache
  - fallback a odds dedicate solo se odds core mancanti
  - fallback provider_unavailable con payload core-safe
- **Fallback da vietare core**:
  - retry chain multipli su include invalidi non core
  - enrich endpoints che bloccano risposta core

### B) Enrichment Detail

- **Use case**: arricchimenti non bloccanti
- **Endpoint ideale**: `GET /api/football/fixtures/[fixtureId]/enrichment`
- **Dati enrichment**:
  - standings stagione
  - formazioni probabili/ufficiali
  - impact players
  - squad/team data
  - staff/referees
  - h2h
- **Include ideali enrichment**:
  - lineups/formations/events (solo dove utile)
  - standings endpoint dedicato
  - squads endpoint dedicato
  - coaches/referees
- **Fallback ammessi enrichment**:
  - partial success (`Promise.allSettled`-style)
  - se enrichment fallisce, core rimane valido
- **Fallback da vietare enrichment**:
  - catene fallback che degradano il core
  - tentativi ripetuti su include già noti come non supportati dal piano

## 4) Matrice Include Ammessi/Vietati (per settore)

- **Dashboard**
  - Ammessi: `league,state,participants,scores,odds,predictions.type,statistics.type`
  - Vietati: `odds.bookmaker` deep, `metadata`, `season/stage/round/venue`, player markets, correct score completo, corners deep

- **Modelli Predittivi**
  - Ammessi: stessi del dashboard + campi derivati modello già computati nel DTO
  - Vietati: stessi vietati list dashboard; nessun nested detail blob

- **Match Detail Core**
  - Ammessi: core fixture includes per probabilità/quote/value/xg/pressure/comparatore
  - Vietati: standings/squad/staff/h2h nel path bloccante core

- **Match Detail Enrichment**
  - Ammessi: standings/squads/lineups/formations/coaches/referees/h2h dedicated
  - Vietati: retry speculative su include invalidi, deep payload non renderizzato

## 5) Fallback Policy Target

### List (Dashboard/Modelli)

- **Consentiti**: memory cache hit, stale cache controllata, provider_unavailable con payload list-safe
- **Da eliminare**: fallback che riintroducono include deep o payload non list

### Detail Core

- **Consentiti**: cache, fallback odds mirato, provider_unavailable core-safe
- **Da eliminare**: fallback cascata multi-attempt non selettiva

### Enrichment

- **Consentiti**: partial failure non bloccante
- **Da eliminare**: enrich che bloccano risposta core

### Include invalidi da non riprovare

- Qualsiasi include non supportato dal piano/entitlement corrente deve entrare in denylist operativa (no retry loop).

## 6) Ordine Di Implementazione Consigliato (solo API/provider)

- **Step 1 — Contratti e mappa esplicita list/detail**
  - Formalizzare `ScheduleCardDTO` list condiviso e set include consentiti/vietati per dashboard/modelli.
  - File focus: [c:/Users/ET/Downloads/Works/top-football-data/src/lib/providers/sportmonks/index.js](c:/Users/ET/Downloads/Works/top-football-data/src/lib/providers/sportmonks/index.js), [c:/Users/ET/Downloads/Works/top-football-data/src/server/football/service.js](c:/Users/ET/Downloads/Works/top-football-data/src/server/football/service.js)

- **Step 2 — Split logico detail core/enrichment**
  - Separare flusso core da enrich nel service (anche mantenendo route unica inizialmente).
  - Limitare include-chain core e isolare standings/squad/h2h/staff in blocco enrichment non bloccante.

- **Step 3 — Policy fallback e hardening include**
  - Applicare fallback policy per settore, con denylist include invalidi e stop retry inutili.
  - Confermare coerenza telemetria (`dtoTarget`, `dtoVersion`, `includeSet`, `fallbackTriggered`) senza cambiare baseline log format.

## File-by-file primari (per lavori successivi)

- [c:/Users/ET/Downloads/Works/top-football-data/src/lib/providers/sportmonks/index.js](c:/Users/ET/Downloads/Works/top-football-data/src/lib/providers/sportmonks/index.js)
- [c:/Users/ET/Downloads/Works/top-football-data/src/server/football/service.js](c:/Users/ET/Downloads/Works/top-football-data/src/server/football/service.js)
- [c:/Users/ET/Downloads/Works/top-football-data/src/app/api/football/schedules/window/route.js](c:/Users/ET/Downloads/Works/top-football-data/src/app/api/football/schedules/window/route.js)
- [c:/Users/ET/Downloads/Works/top-football-data/src/app/api/football/fixtures/[fixtureId]/route.js](c:/Users/ET/Downloads/Works/top-football-data/src/app/api/football/fixtures/[fixtureId]/route.js)
- [c:/Users/ET/Downloads/Works/top-football-data/src/screens/Dashboard.jsx](c:/Users/ET/Downloads/Works/top-football-data/src/screens/Dashboard.jsx)
- [c:/Users/ET/Downloads/Works/top-football-data/src/screens/ModelliPredittivi.jsx](c:/Users/ET/Downloads/Works/top-football-data/src/screens/ModelliPredittivi.jsx)
- [c:/Users/ET/Downloads/Works/top-football-data/src/screens/MatchDetail.jsx](c:/Users/ET/Downloads/Works/top-football-data/src/screens/MatchDetail.jsx)
