# Step 1 — Feature flag Dati Live (completato)

**Stato:** implementato nel codice (aprile 2026).

## Scopo

Nascondere Dati Live dal prodotto e non chiamare le API livescore in background quando non serve, mantenendo route `/dati-live`, schermo e API pronti per riattivazione via env.

## Implementazione

| Area | File / nota |
|------|----------------|
| Flag | `NEXT_PUBLIC_FEATURE_DATI_LIVE === "true"` → abilitato |
| Helper | [`src/lib/feature-flags.js`](../../src/lib/feature-flags.js) |
| Redirect | [`src/middleware.js`](../../src/middleware.js) → `/dati-live` → `/dashboard` se off |
| UI / fetch | [`Navbar.jsx`](../../src/components/layout/Navbar.jsx), [`Dashboard.jsx`](../../src/screens/Dashboard.jsx), [`ModelliPredittivi.jsx`](../../src/screens/ModelliPredittivi.jsx), [`Landing.jsx`](../../src/screens/Landing.jsx), [`DatiLive.jsx`](../../src/screens/DatiLive.jsx) |
| Doc | [`README.md`](../../README.md), [`TODO_SVILUPPO_TOP_FOOTBALL_DATA.txt`](../../TODO_SVILUPPO_TOP_FOOTBALL_DATA.txt) |

## Vercel

La variabile **non è obbligatoria** se Dati Live resta spento. Per accenderla in produzione: aggiungere `NEXT_PUBLIC_FEATURE_DATI_LIVE` = `true` e fare **redeploy**.

## Piano di lavoro originale

Riferimento dettagliato: [`feature_flag_dati_live_5d1b1ea0.plan.md`](./feature_flag_dati_live_5d1b1ea0.plan.md).
