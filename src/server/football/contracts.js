export const SCHEDULE_CACHE_TTL_MS = 60_000;
export const FIXTURE_CACHE_TTL_MS = 300_000;

export const FOOTBALL_API_PROVIDER_MAP = {
  dashboard: {
    internalEndpoint: "/api/football/schedules/window?days=7",
    serviceMethod: "getScheduleWindowPayload",
    providerEndpoint: "fixtures/between/{from}/{to}",
    dtoTarget: "ScheduleCardDTO",
    dtoVersion: "v2",
  },
  modelliPredittivi: {
    internalEndpoint: "/api/football/schedules/window?days=7",
    serviceMethod: "getScheduleWindowPayload",
    providerEndpoint: "fixtures/between/{from}/{to}",
    dtoTarget: "ScheduleCardDTO",
    dtoVersion: "v2",
  },
  matchDetailCore: {
    internalEndpoint: "/api/football/fixtures/[fixtureId]?view=core",
    serviceMethod: "getFixturePayload(view=core)",
    providerEndpoint: "fixtures/{fixtureId}",
    dtoTarget: "MatchDetailCoreDTO",
    dtoVersion: "v1",
  },
  matchDetailEnrichment: {
    internalEndpoint: "/api/football/fixtures/[fixtureId]?view=enrichment",
    serviceMethod: "getFixturePayload(view=enrichment)",
    providerEndpoint: "fixtures/{fixtureId}, standings/seasons/{seasonId}, squads/teams/{teamId}",
    dtoTarget: "MatchDetailEnrichedDTO",
    dtoVersion: "v1",
  },
};

export const FOOTBALL_FALLBACK_POLICY_MATRIX = {
  list: {
    allowed: ["memory_cache", "stale_cache", "provider_unavailable_list_safe"],
    denied: ["deep_include_fallback", "detail_payload_backfill"],
  },
  detailCore: {
    allowed: ["memory_cache", "stale_cache", "odds_only_fallback", "provider_unavailable_core_safe"],
    denied: ["enrichment_blocking_retry_chain"],
  },
  enrichment: {
    allowed: ["partial_failure_non_blocking", "all_settled"],
    denied: ["blocking_core_response", "speculative_include_retry"],
  },
};

export const FOOTBALL_API_PROVIDER_IMPLEMENTATION_ORDER = [
  "step_1_contracts_and_explicit_list_detail_map",
  "step_2_split_detail_core_vs_enrichment",
  "step_3_fallback_policy_and_include_hardening",
];

export const MATCH_DETAIL_CORE_DTO_CONTRACT = {
  required: [
    "id",
    "sportEventId",
    "kickoff_at",
    "status",
    "state",
    "home",
    "away",
    "league",
    "competition",
    "prob",
    "odds",
    "confidence",
    "scores",
    "valueBet",
    "prediction_provider",
    "odds_provider",
    "provider_ids",
    "coverage",
    "apiLoaded",
  ],
  optional: ["xg", "ou", "gg", "badges", "reliability_score", "bestOdds", "bestBookmaker", "movement"],
  forbidden: ["expected", "expected.type", "standings", "teamSquads", "h2h", "staff"],
};

export const MATCH_DETAIL_ENRICHMENT_DTO_CONTRACT = {
  required: ["lineups", "formations", "coaches", "referees"],
  optional: ["standings", "teamSquads", "h2h", "events", "metadata"],
  forbidden: ["blocking_core_dependency", "expected", "expected.type"],
};
