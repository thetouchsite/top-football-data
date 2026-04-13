export const DATA_PROVIDERS = {
  predictions: "sportmonks_predictions",
  expectedGoals: "sportmonks_expected",
  lineups: "sportmonks_football",
  statistics: "sportmonks_football",
  footballDatabase: "sportmonks_football",
  bookmakerOdds: "sportmonks_pre_match_odds",
  oddsComparison: "sportmonks_pre_match_odds",
  valueBetContext: "derived_internal_model",
  live: "sportmonks_football",
};

export function getLiveProviderLabel() {
  return "Sportmonks";
}
