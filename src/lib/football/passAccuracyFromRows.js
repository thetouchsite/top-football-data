/**
 * Precisione passaggi: usa solo righe la cui chiave indica % (o accuracy pass),
 * escludendo conteggi (accurate_passes, passes) che hanno spesso 100+.
 */

function defaultNormalizeKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .trim();
}

function hasPassContext(key) {
  return /pass|passes/.test(key);
}

function hasPercentOrPassAccuracyContext(key) {
  return /percent|accuracy/.test(key);
}

/**
 * Riconosce una riga "precisione passaggi" e non "passi completati" o "passaggi totali".
 */
export function isPassAccuracyTypeKey(key) {
  if (!key || !hasPassContext(key)) {
    return false;
  }
  if (!hasPercentOrPassAccuracyContext(key)) {
    return false;
  }
  // Escludi conteggi: accurate_passes senza "percent" è già escluso da hasPercent
  if (key === "passes" || key === "total_passes" || key === "key_passes") {
    return false;
  }
  return true;
}

/**
 * Estrae valore 0-100, oppure ratio 0-1. Ignora qualsiasi > 100 (quasi sicuramente conteggio).
 */
export function readPassAccuracyPercentValue(rawValue) {
  const v = Number(rawValue);
  if (!Number.isFinite(v) || v < 0) {
    return null;
  }
  if (v > 0 && v <= 1) {
    return v * 100;
  }
  if (v > 1 && v <= 100) {
    return v;
  }
  return null;
}

/**
 * @param {Array} rows - lineup / statistic details rows
 * @param {function} readNumeric - (row) => number
 * @param {function} [normalizeKey] - (row) => string key
 */
export function readPassAccuracyPercentFromRows(
  rows,
  readNumeric,
  normalizeKey = (row) =>
    defaultNormalizeKey(
      row?.type?.developer_name || row?.type?.code || row?.type?.name || String(row?.type_id ?? ""),
    ),
) {
  let best = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = normalizeKey(row);
    if (!isPassAccuracyTypeKey(key)) {
      continue;
    }
    const n = readNumeric(row);
    const pct = readPassAccuracyPercentValue(n);
    if (pct == null) {
      continue;
    }
    if (pct > best) {
      best = pct;
    }
  }
  return best;
}

/**
 * Duelli vinti %: solo chiavi con contesto "duel" + percentuale, valore 0–100
 * (evita conteggi tipo duels_won o indici mescolati con %).
 */
export function isDuelsWonPercentTypeKey(key) {
  if (!key) {
    return false;
  }
  if (!/duel/.test(key)) {
    return false;
  }
  if (!/percent|percentage|ratio/.test(key)) {
    return false;
  }
  return true;
}

/**
 * Estrae duelli vinti % da righe lineup/statistiche, stesse regole 0–100 di readPassAccuracyPercentValue.
 */
export function readDuelsWonPercentFromRows(
  rows,
  readNumeric,
  normalizeKey = (row) =>
    defaultNormalizeKey(
      row?.type?.developer_name || row?.type?.code || row?.type?.name || String(row?.type_id ?? ""),
    ),
) {
  let best = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const key = normalizeKey(row);
    if (!isDuelsWonPercentTypeKey(key)) {
      continue;
    }
    const n = readNumeric(row);
    const pct = readPassAccuracyPercentValue(n);
    if (pct == null) {
      continue;
    }
    if (pct > best) {
      best = pct;
    }
  }
  return best;
}
