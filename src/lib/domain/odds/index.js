/**
 * @typedef {Object} OddsContext
 * @property {string|null} bestOdds
 * @property {string|null} bestBookmaker
 * @property {string|null} movement
 * @property {string} provider
 */

export function createOddsContext({
  bestOdds = null,
  bestBookmaker = null,
  movement = null,
  provider = "not_available_with_current_feed",
} = {}) {
  return {
    bestOdds,
    bestBookmaker,
    movement,
    provider,
  };
}
