/**
 * Edge numerico positivo (stringhe da JSON / API incluse).
 */
function positiveEdge(raw) {
  const n = typeof raw === "string" ? Number.parseFloat(raw) : Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    return null;
  }
  return n;
}

/**
 * Segnale value per filtri lista (Modelli predittivi): `valueBet` e/o `valueMarkets.primary`
 * (cross-mercato dal provider) con edge coerente.
 */
export function getMatchValueCandidate(match) {
  if (!match) {
    return null;
  }
  const vb = match.valueBet;
  const vbEdge = vb ? positiveEdge(vb.edge) : null;
  if (vb && vbEdge != null) {
    return {
      type: vb.type,
      edge: vbEdge,
      source: match.valueBetSource === "sportmonks_feed_math" ? "math" : "fallback",
    };
  }
  const primary = match.valueMarkets?.primary;
  const pEdge = primary ? positiveEdge(primary.edge) : null;
  if (primary && pEdge != null) {
    return {
      type: primary.type,
      edge: pEdge,
      source: "math",
    };
  }
  return null;
}

export function matchHasValueBetSignal(match) {
  return getMatchValueCandidate(match) != null;
}
