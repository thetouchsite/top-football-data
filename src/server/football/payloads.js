import { collectCompetitionSummaries } from "@/lib/competitions/catalog";
import { createFixtureDetail } from "@/lib/domain/fixtures";
import { createProviderFreshness } from "@/lib/domain/freshness";
import { createPrematchMatch } from "@/lib/domain/matches";
import { SPORTMONKS_PROVIDER_ID } from "@/lib/providers/sportmonks";
import { FIXTURE_CACHE_TTL_MS, SCHEDULE_CACHE_TTL_MS } from "./contracts";

function enrichPrematchMatches(matches = [], provider, source, updatedAt) {
  return matches.map((match) =>
    createPrematchMatch(match, {
      provider,
      source,
      updatedAt,
      ttlMs: SCHEDULE_CACHE_TTL_MS,
      predictionProvider: match?.prediction_provider || "derived_internal_model",
      oddsProvider: match?.odds_provider || "not_available_with_current_feed",
    })
  );
}

export function compactScheduleRawPayload(rawSchedules = null) {
  if (!rawSchedules || typeof rawSchedules !== "object") {
    return null;
  }

  return {
    window: rawSchedules.window || null,
    scheduleLeagueFilter: rawSchedules.scheduleLeagueFilter || null,
    schedulePagination: rawSchedules.schedulePagination || null,
    fixturesCount: Array.isArray(rawSchedules.fixtures) ? rawSchedules.fixtures.length : 0,
    sampleFixture:
      process.env.NODE_ENV === "development" && Array.isArray(rawSchedules.fixtures)
        ? {
            id: rawSchedules.fixtures[0]?.id ?? null,
            league:
              rawSchedules.fixtures[0]?.league?.name ||
              rawSchedules.fixtures[0]?.league_name ||
              null,
            hasOdds: Array.isArray(rawSchedules.fixtures[0]?.odds)
              ? rawSchedules.fixtures[0].odds.length > 0
              : Boolean(rawSchedules.fixtures[0]?.odds),
            hasPredictions: Array.isArray(rawSchedules.fixtures[0]?.predictions)
              ? rawSchedules.fixtures[0].predictions.length > 0
              : Boolean(rawSchedules.fixtures[0]?.predictions),
          }
        : null,
  };
}

export function buildSchedulePayload({
  matches = [],
  window = null,
  rawSchedules = null,
  provider = SPORTMONKS_PROVIDER_ID,
  source,
  notice = "",
  updatedAt = null,
}) {
  const enrichedMatches = enrichPrematchMatches(matches, provider, source, updatedAt);

  return {
    matches: enrichedMatches,
    competitions: collectCompetitionSummaries(enrichedMatches),
    window,
    rawSchedules,
    provider,
    source,
    isFallback: provider !== SPORTMONKS_PROVIDER_ID || source === "provider_unavailable",
    freshness: createProviderFreshness({
      updatedAt,
      ttlMs: SCHEDULE_CACHE_TTL_MS,
    }),
    notice,
  };
}

export function buildFixturePayload({
  normalizedFixture,
  rawFixture,
  provider = SPORTMONKS_PROVIDER_ID,
  source,
  updatedAt,
  notice = "",
}) {
  const fixture = createFixtureDetail(normalizedFixture, {
    provider,
    source,
    updatedAt,
    ttlMs: FIXTURE_CACHE_TTL_MS,
    predictionProvider: normalizedFixture?.prediction_provider || "derived_internal_model",
    oddsProvider: normalizedFixture?.odds_provider || "not_available_with_current_feed",
  });

  return {
    status: 200,
    body: {
      fixture,
      competition: fixture.competition,
      provider,
      source,
      isFallback: provider !== SPORTMONKS_PROVIDER_ID || source === "provider_unavailable",
      freshness: fixture.freshness,
      rawFixture,
      notice,
    },
  };
}

export function buildEmptyFixturePayload(fixtureId, notice) {
  return {
    status: 404,
    body: {
      error: notice || `Fixture ${fixtureId} non disponibile con il feed corrente.`,
      provider: SPORTMONKS_PROVIDER_ID,
      source: "provider_unavailable",
      isFallback: true,
      freshness: createProviderFreshness({
        updatedAt: null,
        ttlMs: FIXTURE_CACHE_TTL_MS,
      }),
    },
  };
}

function subscriptionHasPaidExtras(subscription) {
  if (!subscription || typeof subscription !== "object") {
    return false;
  }
  const nonempty = (value) => Array.isArray(value) && value.length > 0;
  /** Meta API Sportmonks: add-on, bundle (Odds & Predictions, Pressure & xG), widgets. */
  return (
    nonempty(subscription.add_ons) ||
    nonempty(subscription.bundles) ||
    nonempty(subscription.widgets)
  );
}

export function buildSportmonksPlanNotice(rawPayload, matches = []) {
  const subscription = rawPayload?.raw?.subscription?.[0] || rawPayload?.subscription?.[0] || null;
  const planNames = Array.isArray(subscription?.plans)
    ? subscription.plans.map((plan) => plan?.plan).filter(Boolean)
    : [];
  const hasPaidExtras = subscriptionHasPaidExtras(subscription);
  const hasProviderPredictions = matches.some(
    (match) =>
      match?.prediction_provider === "sportmonks_predictions" ||
      match?.coverage?.hasPredictions
  );
  const hasProviderXg = matches.some(
    (match) => match?.coverage?.hasExpectedGoals
  );
  const hasProviderOdds = matches.some(
    (match) => match?.odds_provider === "sportmonks_pre_match_odds"
  );

  if (!planNames.length || hasPaidExtras || hasProviderPredictions || hasProviderXg) {
    return "";
  }

  if (hasProviderOdds) {
    return `Piano Sportmonks attivo: ${planNames.join(", ")}. Pre-match odds disponibili; predictions e xG provider-driven non risultano abilitati nel feed corrente.`;
  }

  return `Piano Sportmonks attivo: ${planNames.join(", ")}. Add-on predictions/xG/odds non rilevati nel feed corrente.`;
}
