export const DATA_PROVIDERS = {
  predictions: "sportradar_probabilities",
  expectedGoals: "sportradar_soccer",
  lineups: "sportradar_soccer",
  statistics: "sportradar_soccer",
  footballDatabase: "sportradar_soccer",
  bookmakerOdds: "sportradar_odds",
  oddsComparison: "sportradar_odds",
  valueBetContext: "internal_model",
  live: "sportradar_soccer",
};

export function getLiveProviderLabel() {
  return "Sportradar";
}
