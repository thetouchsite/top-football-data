---
name: Step 0 — Rimozione Sportradar
parent_plan: top_football_data_roadmap_325cad79.plan.md
status: completed
completed_at: 2026-04-17
---

# Step 0 — Rimozione Sportradar (completato)

## Stato

**Fatto.** Nel progetto non esiste più dipendenza npm, modulo o chiamata runtime a Sportradar.

## Verifica rapida

- `package.json` / `package-lock.json`: nessun `@api/sportradar-soccer`
- `src/`: nessun import o stringa funzionale `sportradar` (verificabile con ricerca)
- [`src/server/football/service.js`](../../src/server/football/service.js): solo Sportmonks + cache su errore
- [`GET /api/football/odds/futures`](../../src/app/api/football/odds/futures/route.js): placeholder JSON (`source: not_implemented`) in attesa di outrights Sportmonks
- [`/api/health`](../../src/app/api/health/route.js): `readiness.providers` senza `sportradar`

## Follow-up opzionale

- Integrare futures/outrights via Sportmonks quando definito il perimetro API
- Rimuovere variabili `SPORTRADAR_*` da eventuali segreti Vercel rimasti a mano
