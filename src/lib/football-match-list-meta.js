/**
 * Meta condivisa per righe elenco (schedule): live / finita / pre-match.
 * `match` è il DTO normalizzato (Modelli, Dashboard, Analisi statistica).
 */

const LIVE_STATES = new Set(["LIVE", "HT", "ET", "PEN"]);
const FINISHED_STATES = new Set(["FT"]);
const IRREGULAR_STATES = new Set(["PPD", "CAN"]);

/**
 * @param {string|undefined} shortName
 * @returns {"live"|"finished"|"prematch"|"irregular"}
 */
export function getMatchListPhase(shortName) {
  const s = String(shortName || "").trim().toUpperCase();
  if (!s || s === "PRE") {
    return "prematch";
  }
  if (IRREGULAR_STATES.has(s)) {
    return "irregular";
  }
  if (FINISHED_STATES.has(s)) {
    return "finished";
  }
  if (LIVE_STATES.has(s)) {
    return "live";
  }
  return "prematch";
}

/**
 * @param {{ home?: number, away?: number } | null | undefined} score
 * @returns {string|null}
 */
export function formatCurrentScoreLine(score) {
  if (!score) {
    return null;
  }
  const h = Number(score?.home);
  const a = Number(score?.away);
  if (!Number.isFinite(h) && !Number.isFinite(a)) {
    return null;
  }
  const hs = Number.isFinite(h) ? h : 0;
  const as = Number.isFinite(a) ? a : 0;
  return `${hs}-${as}`;
}

/**
 * Etichetta breve per badge (stato partita).
 * @param {{ shortName?: string, name?: string } | null | undefined} state
 * @param {"live"|"finished"|"prematch"|"irregular"|undefined} [phase] — da getMatchListPhase
 */
export function getMatchStateBadgeLabel(state, phase) {
  const s = String(state?.shortName || "").trim().toUpperCase();
  const p = phase || getMatchListPhase(s);
  if (p === "finished") {
    return "Finita";
  }
  if (p === "live") {
    if (s === "HT") {
      return "Intervallo";
    }
    if (s === "ET") {
      return "Suppl.";
    }
    if (s === "PEN") {
      return "Rigori";
    }
    return "In corso";
  }
  if (p === "irregular") {
    if (s === "PPD") {
      return "Rinviata";
    }
    if (s === "CAN") {
      return "Annullata";
    }
  }
  return null;
}
