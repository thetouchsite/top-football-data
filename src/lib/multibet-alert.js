/**
 * Mappa `betAlerts` type multibet (worker Railway) in UI. Quattro modi prodotto:
 * Algorithmic · Safe · Value · Gold (vedi brief cliente).
 * @see telegram-alert-backend/app/mongodb.py — `_multibet_to_doc`
 */

function round2(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) {
    return 0;
  }
  return Math.round(x * 100) / 100;
}

function formatDisplayOdd(n) {
  const x = round2(n);
  if (x % 1 === 0) {
    return String(x);
  }
  return x.toFixed(2);
}

/**
 * Rileva mercati “Gold”: risultato esatto, scorecast, combo avanzate (euristica su testi API).
 * Quando il worker espone altri `market`/`source`, estendere qui o aggiungere `modus: "gold"` in Mongo.
 */
function eventLooksGoldLike(ev) {
  const m = String(ev?.market || "");
  const s = String(ev?.selection || "");
  const blob = `${m} ${s}`.toLowerCase();
  if (/^\s*\d+\s*[-–:]\s*\d+\s*$/.test(s.trim())) {
    return true;
  }
  return /risultat|exact|corrett|scorecast|esatto|correct\s*score|combo\s+score|ht\/ft|half\s*time|corners|cartell/i.test(
    blob
  );
}

function averageValuePercent(events) {
  const list = (events || []).map((e) => Number(e?.valuePercent));
  const fin = list.filter((x) => Number.isFinite(x) && x !== 0);
  if (!fin.length) {
    return 0;
  }
  return fin.reduce((a, b) => a + b, 0) / fin.length;
}

const MODUS_KEYS = new Set(["algorithmic", "safe", "value", "gold"]);

/**
 * Sorgente: campo `multibet.modus` scritto dal worker Python (generazione reale per tab).
 * @param {string|undefined} modus
 * @returns {{ algorithmic: boolean, safe: boolean, value: boolean, gold: boolean } | null}
 */
export function modeFiltersFromServerModus(modus) {
  const m = String(modus || "").toLowerCase();
  if (!MODUS_KEYS.has(m)) {
    return null;
  }
  return {
    algorithmic: m === "algorithmic",
    safe: m === "safe",
    value: m === "value",
    gold: m === "gold",
  };
}

/**
 * Euristica per documenti senza `modus` (dati pre-migrazione). Un solo flag true, priorità gold → safe → value → algorithmic.
 * @param {object} mb — alert.multibet
 */
function inferLegacyModeFilters(mb) {
  if (!mb) {
    return { algorithmic: true, safe: false, value: false, gold: false };
  }
  const events = Array.isArray(mb.events) ? mb.events : [];
  const c = Number(mb.confidenceScore);
  const de = Number(mb.dataEdgePercent);
  const tev = Number(mb.totalEv);
  const nullFlags = { algorithmic: false, safe: false, value: false, gold: false };

  const safe = Number.isFinite(c) && c >= 80;
  const gold = events.some((e) => eventLooksGoldLike(e));
  const avgVp = averageValuePercent(events);
  const anyHighLegValue = events.some((e) => Math.abs(Number(e?.valuePercent) || 0) >= 4);
  const value =
    (Number.isFinite(de) && de >= 10) ||
    (Number.isFinite(tev) && tev >= 1.08) ||
    anyHighLegValue ||
    avgVp >= 3.5;

  if (gold) {
    return { ...nullFlags, gold: true };
  }
  if (safe && !gold) {
    return { ...nullFlags, safe: true };
  }
  if (value) {
    return { ...nullFlags, value: true };
  }
  return { ...nullFlags, algorithmic: true };
}

function tagRiskFromModes(modes) {
  if (modes.gold) {
    return { tag: "Gold", risk: "alto" };
  }
  if (modes.safe) {
    return { tag: "Conservativa", risk: "basso" };
  }
  if (modes.value) {
    return { tag: "Value", risk: "medio" };
  }
  return { tag: "Bilanciata", risk: "medio" };
}

function mapEventToSelection(ev) {
  const p = ev?.modelProbability;
  const conf =
    p != null && Number.isFinite(Number(p))
      ? Math.min(100, Math.max(0, Math.round(Number(p) <= 1 ? Number(p) * 100 : Number(p))))
      : 0;
  return {
    home: String(ev?.home || "Home"),
    away: String(ev?.away || "Away"),
    league: String(ev?.league || "—"),
    league_media: null,
    home_media: null,
    away_media: null,
    market: [ev?.market, ev?.selection].filter(Boolean).join(" · ") || "—",
    odds: formatDisplayOdd(ev?.bestOdd),
    confidence: conf,
    valuePercent: ev?.valuePercent != null ? round2(ev.valuePercent) : null,
    fixtureId: ev?.fixtureId != null ? String(ev.fixtureId) : null,
    comparator: Array.isArray(ev?.comparator) ? ev.comparator : [],
  };
}

function bookmakersFromEvents(events) {
  const first = (events || []).find((e) => Array.isArray(e?.comparator) && e.comparator.length) || null;
  if (!first) {
    return [];
  }
  const rows = [...first.comparator]
    .map((c) => ({
      name: String(c?.bookmaker || "Book"),
      odds: formatDisplayOdd(c?.odd),
      oddNum: round2(c?.odd),
      best: false,
      valueExtra: null,
      valueAmount: null,
      affiliateUrl: c?.affiliateUrl || c?.affiliate_url || null,
    }))
    .filter((r) => r.oddNum > 1)
    .sort((a, b) => b.oddNum - a.oddNum);
  if (rows.length) {
    rows[0].best = true;
  }
  return rows.slice(0, 4);
}

/**
 * @param {object} alert — betAlerts
 */
export function mapMultibetAlertToCombo(alert) {
  if (!alert || alert.type !== "multibet" || !alert.multibet) {
    return null;
  }
  const mb = alert.multibet;
  const events = Array.isArray(mb.events) ? mb.events : [];
  const fromServer = modeFiltersFromServerModus(mb.modus);
  const modeFilters = fromServer || inferLegacyModeFilters(mb);
  const { tag, risk } = tagRiskFromModes(modeFilters);
  const totalOdd = Number(mb.totalOdd);
  const conf = Math.min(
    100,
    Math.max(0, Math.round(Number(mb.confidenceScore) || 0))
  );
  const stake = 100;
  const potentialWin = Math.round(stake * (Number.isFinite(totalOdd) ? totalOdd : 0));

  return {
    id: String(alert._id || alert.alertKey || "mb"),
    alertKey: String(alert.alertKey || ""),
    modeFilters,
    /** Alias retro-compat */
    tabFilters: {
      algoritmiche: modeFilters.algorithmic,
      safe: modeFilters.safe,
      value: modeFilters.value,
      gold: modeFilters.gold,
    },
    type: modeFilters.gold
      ? "gold"
      : modeFilters.safe
        ? "safe"
        : modeFilters.value
          ? "value"
          : "algorithmic",
    tag,
    risk,
    odds: formatDisplayOdd(totalOdd),
    confidence: conf,
    potentialWin,
    selections: events.map(mapEventToSelection),
    bookmakers: bookmakersFromEvents(events),
    dataSource: "orchestrator",
    modus: fromServer ? String(mb.modus).toLowerCase() : null,
    engine: {
      totalEv: mb.totalEv,
      statisticalProbability: mb.statisticalProbability,
      dataEdgePercent: mb.dataEdgePercent,
    },
    telegramSent: Boolean(alert.telegramSent),
    status: alert.status || "pending",
    createdAt: alert.createdAt || null,
  };
}

/**
 * @param {"algorithmic"|"safe"|"value"|"gold"} modeKey
 */
export function filterCombosByMode(combos, modeKey) {
  const list = combos || [];
  if (modeKey === "algorithmic") {
    return list;
  }
  if (modeKey === "safe") {
    return list.filter((c) => c?.modeFilters?.safe || c?.tabFilters?.safe);
  }
  if (modeKey === "value") {
    return list.filter((c) => c?.modeFilters?.value || c?.tabFilters?.value);
  }
  if (modeKey === "gold") {
    return list.filter((c) => c?.modeFilters?.gold || c?.tabFilters?.gold);
  }
  return list;
}
