import { getCompetitionConfig } from "@/lib/competitions/catalog";
import { createOddsContext } from "@/lib/domain/odds";
import { normalizeLineupStatus } from "@/lib/domain/lineups";
import {
  createProviderFreshness,
  isFallbackSource,
  toIsoDate,
} from "@/lib/domain/freshness";

/**
 * @typedef {Object} LiveMatch
 * @property {string} provider
 * @property {string} source
 * @property {boolean} isFallback
 * @property {Object} freshness
 * @property {Object} competition
 * @property {string} lineup_status
 */

export function createLiveMatch(match, context = {}) {
  const provider = context.provider || match?.provider || "sportmonks";
  const oddsContext = createOddsContext({
    bestOdds: match?.bestOdds ?? null,
    bestBookmaker: match?.bestBookmaker ?? null,
    movement: match?.movement ?? null,
    provider: context.oddsProvider || "derived_live_model",
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
    lineup_status: normalizeLineupStatus(match?.lineup_status),
    prediction_provider:
      context.predictionProvider ||
      match?.prediction_provider ||
      (match?.liveProbabilities ? "sportmonks_predictions" : "derived_live_model"),
    odds_provider: oddsContext.provider,
    generated_at: context.generatedAt || toIsoDate(context.updatedAt),
    model_version: context.modelVersion || match?.model_version || "sportmonks-live-v1",
    bestOdds: oddsContext.bestOdds,
    bestBookmaker: oddsContext.bestBookmaker,
    movement: oddsContext.movement,
    provider_ids:
      match?.provider_ids ||
      (provider === "sportmonks" && match?.id
        ? { sportmonks_fixture_id: String(match.id) }
        : provider === "sportradar" && (match?.sportEventId || match?.id)
          ? { sportradar_sport_event_id: String(match?.sportEventId || match?.id) }
          : {}),
  };
}
