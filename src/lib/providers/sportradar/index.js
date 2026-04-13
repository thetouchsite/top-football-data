import {
  buildLiveProbabilityMap,
  fetchSportradarCompetitionFutures,
  fetchSportradarLiveData,
  fetchSportradarLiveProbabilities,
  fetchSportradarOddsCompetitions,
  fetchSportradarScheduleWindow,
  fetchSportradarSportEventBundle,
  mergeLiveMatchWithProbabilities,
  normalizeSportradarFixture,
  normalizeSportradarFuturesMarket,
  normalizeSportradarLiveMatch,
  normalizeSportradarOddsCompetition,
  normalizeSportradarScheduleMatch,
  SPORTRADAR_DEFAULT_SCHEDULE_DAYS,
  SPORTRADAR_DEFAULT_SOCCER_SPORT_ID,
} from "@/lib/sportradar";

export const SPORTRADAR_PROVIDER_ID = "sportradar";

export function getSportradarProviderReadiness() {
  const hasApiKey = Boolean(process.env.SPORTRADAR_API_KEY);

  return {
    provider: SPORTRADAR_PROVIDER_ID,
    configured: hasApiKey,
    ready: hasApiKey,
    accessLevel: process.env.SPORTRADAR_ACCESS_LEVEL || "trial",
    hasLive: hasApiKey,
    hasProbabilities: Boolean(
      process.env.SPORTRADAR_PROBABILITIES_API_KEY || process.env.SPORTRADAR_API_KEY
    ),
    hasOdds: Boolean(
      process.env.SPORTRADAR_ODDS_API_KEY || process.env.SPORTRADAR_API_KEY
    ),
  };
}

export {
  buildLiveProbabilityMap,
  fetchSportradarCompetitionFutures,
  fetchSportradarLiveData,
  fetchSportradarLiveProbabilities,
  fetchSportradarOddsCompetitions,
  fetchSportradarScheduleWindow,
  fetchSportradarSportEventBundle,
  mergeLiveMatchWithProbabilities,
  normalizeSportradarFixture,
  normalizeSportradarFuturesMarket,
  normalizeSportradarLiveMatch,
  normalizeSportradarOddsCompetition,
  normalizeSportradarScheduleMatch,
  SPORTRADAR_DEFAULT_SCHEDULE_DAYS,
  SPORTRADAR_DEFAULT_SOCCER_SPORT_ID,
};
