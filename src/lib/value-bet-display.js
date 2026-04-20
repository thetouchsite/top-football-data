/**
 * Quota mostrata accanto al value bet derivato, coerente con `buildDerivedValueBet` (1X2, O/U 2.5, GG).
 */
export function getOddsDecimalForValueBet(match) {
  if (!match?.valueBet?.type) {
    return null;
  }
  const t = match.valueBet.type;
  if (t === "1") {
    return match.odds?.home ?? null;
  }
  if (t === "2") {
    return match.odds?.away ?? null;
  }
  if (t === "X") {
    return match.odds?.draw ?? null;
  }
  if (t === "Over 2.5") {
    return match.ou?.over25 ?? null;
  }
  if (t === "Goal") {
    return match.gg?.goal ?? null;
  }
  return null;
}
