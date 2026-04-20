import { getCompetitionConfig } from "@/lib/competitions/catalog";
import { createOddsContext } from "@/lib/domain/odds";
import { deriveLineupStatusFromFixture } from "@/lib/domain/lineups";
import {
  createProviderFreshness,
  isFallbackSource,
  toIsoDate,
} from "@/lib/domain/freshness";

const EMPTY_MEDIA = { imageUrl: null, thumbUrl: null };

/**
 * @typedef {Object} FixtureDetail
 * @property {string} provider
 * @property {string} source
 * @property {boolean} isFallback
 * @property {Object} freshness
 * @property {Object} competition
 * @property {string} lineup_status
 */

export function createFixtureDetail(fixture, context = {}) {
  const provider = context.provider || fixture?.provider || "sportmonks";
  const oddsContext = createOddsContext({
    bestOdds: fixture?.bestOdds ?? null,
    bestBookmaker: fixture?.bestBookmaker ?? null,
    movement: fixture?.movement ?? null,
    provider: context.oddsProvider || "not_available_with_current_feed",
  });

  return {
    ...fixture,
    home_media: fixture?.home_media ?? EMPTY_MEDIA,
    away_media: fixture?.away_media ?? EMPTY_MEDIA,
    league_media: fixture?.league_media ?? EMPTY_MEDIA,
    provider,
    source: context.source || "unknown",
    isFallback: isFallbackSource(context.source),
    freshness: createProviderFreshness({
      updatedAt: context.updatedAt,
      ttlMs: context.ttlMs,
    }),
    competition: getCompetitionConfig(fixture?.competition?.name || fixture?.league),
    lineup_status: deriveLineupStatusFromFixture(fixture),
    prediction_provider:
      context.predictionProvider || fixture?.prediction_provider || "derived_internal_model",
    odds_provider: oddsContext.provider,
    generated_at: context.generatedAt || toIsoDate(context.updatedAt),
    model_version: context.modelVersion || fixture?.model_version || "sportmonks-first-v1",
    bestOdds: oddsContext.bestOdds,
    bestBookmaker: oddsContext.bestBookmaker,
    movement: oddsContext.movement,
    provider_ids:
      fixture?.provider_ids ||
      (provider === "sportmonks" && fixture?.id
        ? { sportmonks_fixture_id: String(fixture.id) }
        : {}),
  };
}
