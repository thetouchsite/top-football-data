import { getCompetitionConfig } from "@/lib/competitions/catalog";
import { createOddsContext } from "@/lib/domain/odds";
import {
  createProviderFreshness,
  isFallbackSource,
  toIsoDate,
} from "@/lib/domain/freshness";

/**
 * @typedef {Object} PrematchMatch
 * @property {string} provider
 * @property {string} source
 * @property {boolean} isFallback
 * @property {import('@/lib/domain/freshness').ProviderFreshness|Object} freshness
 * @property {Object} competition
 * @property {string} prediction_provider
 * @property {string} odds_provider
 */

export function createPrematchMatch(match, context = {}) {
  const provider = context.provider || match?.provider || "sportmonks";
  const oddsContext = createOddsContext({
    bestOdds: match?.bestOdds ?? null,
    bestBookmaker: match?.bestBookmaker ?? null,
    movement: match?.movement ?? null,
    provider: context.oddsProvider || "not_available_with_current_feed",
  });

  return {
    ...match,
    provider,
    source: context.source || "unknown",
    isFallback: isFallbackSource(context.source),
    freshness: createProviderFreshness({
      updatedAt: context.updatedAt,
      ttlMs: context.ttlMs,
    }),
    competition: getCompetitionConfig(match?.competition?.name || match?.league),
    prediction_provider:
      context.predictionProvider || match?.prediction_provider || "derived_internal_model",
    odds_provider: oddsContext.provider,
    generated_at: context.generatedAt || toIsoDate(context.updatedAt),
    model_version: context.modelVersion || match?.model_version || "sportmonks-first-v1",
    bestOdds: oddsContext.bestOdds,
    bestBookmaker: oddsContext.bestBookmaker,
    movement: oddsContext.movement,
    provider_ids:
      match?.provider_ids ||
      (provider === "sportmonks" && match?.id
        ? { sportmonks_fixture_id: String(match.id) }
        : {}),
  };
}
