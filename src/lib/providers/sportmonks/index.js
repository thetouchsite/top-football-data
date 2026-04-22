import "server-only";

import {
  SPORTMONKS_OFFICIAL_ALLOWLIST_LEAGUE_IDS,
  SPORTMONKS_PRIORITY_LEAGUE_IDS,
} from "@/lib/sportmonks-priority-league-ids";

export { SPORTMONKS_PRIORITY_LEAGUE_IDS };

const ROME_TIMEZONE = "Europe/Rome";
const DEFAULT_FORM = ["-", "-", "-", "-", "-"];
const SCORE_CANDIDATES = [
  { score: "0:0", home: 0, away: 0, drawBias: 0.08 },
  { score: "1:0", home: 1, away: 0, drawBias: -0.02 },
  { score: "1:1", home: 1, away: 1, drawBias: 0.12 },
  { score: "2:0", home: 2, away: 0, drawBias: -0.06 },
  { score: "2:1", home: 2, away: 1, drawBias: -0.03 },
  { score: "0:1", home: 0, away: 1, drawBias: -0.02 },
  { score: "1:2", home: 1, away: 2, drawBias: -0.03 },
  { score: "2:2", home: 2, away: 2, drawBias: 0.04 },
];
const EVENT_TYPE_LABELS = {
  goal: "Gol",
  yellow: "Ammonizione",
  red: "Espulsione",
  substitution: "Sostituzione",
  dangerous: "Occasione",
};
const DEBUG_FOOTBALL_TELEMETRY = ["1", "true", "yes"].includes(
  String(process.env.DEBUG_FOOTBALL_TELEMETRY || "").toLowerCase()
);

function mapProviderSource(source, { fallbackTriggered, retryCount, error } = {}) {
  if (source === "sportmonks_cache") {
    return fallbackTriggered ? "stale_cache" : "memory_cache";
  }
  if (source === "sportmonks_api") {
    return "provider_fetch";
  }
  if (source === "provider_unavailable" || source === "route_error") {
    return "fallback_provider";
  }
  if (fallbackTriggered || Number(retryCount || 0) > 0 || error) {
    return "provider_fetch";
  }
  return source || "provider_fetch";
}

function shouldLogVerboseProviderTelemetry(payload = {}) {
  if (DEBUG_FOOTBALL_TELEMETRY) {
    return true;
  }
  return (
    payload.cacheState === "miss" ||
    payload.fallbackTriggered === true ||
    Number(payload.retryCount || 0) > 0 ||
    Boolean(payload.error)
  );
}

function logFootballProviderTelemetry(payload = {}) {
  const nextPayload = {
    ...payload,
    source: mapProviderSource(payload.source, payload),
  };
  if (!shouldLogVerboseProviderTelemetry(nextPayload)) {
    return;
  }
  console.info("[football][provider]", nextPayload);
}

/**
 * Include **unici** per `GET /football/fixtures/between/{start}/{end}` (Modelli predittivi + schedule window).
 * Nessun fallback multiplo: una sola richiesta con questo elenco.
 *
 * Mappatura → UI (`MatchCard`, `FeedMetaPanel`, `DataStatusChips`, filtri):
 * | Include            | Uso in pagina |
 * |--------------------|---------------|
 * | `league`           | Nome competizione, logo (`league_media`) |
 * | `state`            | Stato partita (PRE/LIVE/FT…) |
 * | `participants`     | Nomi squadre, loghi, form abbreviata (`home`/`away`, media) |
 * | `scores`           | Risultato se già disponibile |
 * | `odds`             | Quote 1X2, O/U, GG utili per card/value |
 * | `predictions.type` | Probabilità 1X2 / score modello Sportmonks |
 * | `statistics.type`  | Copertura statistiche (confidence / badge coverage) |
 *
 * Non inclusi qui (peso inutile sulla lista): `season`, `stage`, `round`, `venue`,
 * `lineups`, `formations`, `events`, `pressure`, `metadata`, `odds.bookmaker`.
 *
 * @see https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/fixtures/get-fixtures-by-date-range.md
 */
export const SPORTMONKS_SCHEDULE_PREMATCH_INCLUDES = [
  "league",
  "state",
  "participants",
  "scores",
  "odds",
  "predictions.type",
  "statistics.type",
];

export const SPORTMONKS_INCLUDE_POLICY = {
  listAllowed: [...SPORTMONKS_SCHEDULE_PREMATCH_INCLUDES],
  listForbidden: [
    "season",
    "stage",
    "round",
    "venue",
    "metadata",
    "odds.bookmaker",
    "player_markets",
    "correct_score",
    "corners",
  ],
  detailCoreAllowed: [
    "league",
    "state",
    "participants",
    "scores",
    "odds",
    "predictions.type",
    "statistics.type",
  ],
  detailCoreForbidden: [
    "standings",
    "squads",
    "lineups",
    "formations",
    "staff",
    "h2h",
    "expected",
    "expected.type",
  ],
  detailEnrichmentAllowed: ["lineups", "lineups.details.type", "events.type", "formations", "coaches", "referees"],
  detailEnrichmentForbidden: [
    "expected",
    "expected.type",
    "odds.bookmaker",
    "player_markets",
    "correct_score",
    "corners",
  ],
};

export const SCHEDULE_CARD_DTO_CONTRACT = {
  required: [
    "id",
    "sportEventId",
    "kickoff_at",
    "date",
    "time",
    "status",
    "state",
    "home",
    "away",
    "league",
    "competition",
    "prob",
    "odds",
    "ou",
    "gg",
    "valueBet",
    "confidence",
    "scores",
    "prediction_provider",
    "odds_provider",
    "provider_ids",
    "coverage",
    "apiLoaded",
  ],
  optionalModelFields: ["modelOdds", "modelOddsOu", "modelOddsGg", "xg", "valueMarkets", "ouProb", "ggProb"],
  forbiddenInList: [
    "player_markets",
    "correct_score_deep",
    "corners_deep",
    "odds.bookmaker",
    "metadata",
    "lineups",
    "formations",
    "events",
    "standings",
    "teamSquads",
  ],
};

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

const SPORTMONKS_INCLUDE_DENYLIST_BY_SCOPE = {
  list: new Set(SPORTMONKS_INCLUDE_POLICY.listForbidden),
  detail_core: new Set(SPORTMONKS_INCLUDE_POLICY.detailCoreForbidden),
  detail_enrichment: new Set(SPORTMONKS_INCLUDE_POLICY.detailEnrichmentForbidden),
};

const SPORTMONKS_FIXTURE_CORE_INCLUDE_ATTEMPTS = [
  [
    "league",
    "state",
    "participants",
    "scores",
    "odds",
    "predictions.type",
    "statistics.type",
  ],
  [
    "league",
    "state",
    "participants",
    "scores",
    "odds",
    "predictions.type",
    "statistics.type",
  ],
];

const SPORTMONKS_FIXTURE_ENRICHMENT_INCLUDES = [...SPORTMONKS_INCLUDE_POLICY.detailEnrichmentAllowed];

const SPORTMONKS_LIVE_INCLUDE_ATTEMPTS = [
  [
    "league",
    "season",
    "stage",
    "round",
    "state",
    "participants",
    "venue",
    "scores",
    "periods",
    "events.type",
    "statistics.type",
    "lineups.details.type",
    "predictions.type",
    "expected.type",
    "pressure",
    "referees",
    "coaches",
    "formations",
    "metadata",
  ],
  [
    "league",
    "season",
    "round",
    "state",
    "participants",
    "venue",
    "scores",
    "periods",
    "events.type",
    "statistics.type",
    "lineups.details.type",
    "predictions.type",
    "expected.type",
    "referees",
    "coaches",
    "formations",
    "metadata",
  ],
  ["league", "season", "round", "state", "participants", "venue", "scores", "events.type"],
];

export const SPORTMONKS_PROVIDER_ID = "sportmonks";
export const SPORTMONKS_DEFAULT_SCHEDULE_DAYS = clampInteger(
  process.env.SPORTMONKS_SCHEDULE_DAYS,
  7,
  1,
  30
);

/**
 * Filtro API `fixtureLeagues` su `fixtures/between`.
 * Default prodotto: allowlist ufficiale campionati (source of truth).
 * Override opzionale via `SPORTMONKS_SCHEDULE_LEAGUE_IDS` (CSV) o wildcard `all/global/*`.
 * @see https://docs.sportmonks.com/v3/
 */
export function getSportmonksFixtureLeaguesFilterParam() {
  const raw = String(process.env.SPORTMONKS_SCHEDULE_LEAGUE_IDS ?? "").trim();
  const lower = raw.toLowerCase();

  if (lower === "all" || lower === "global" || lower === "*") {
    return "";
  }

  const ids = raw
    ? raw
        .split(/[,;\s]+/)
        .map((entry) => entry.trim())
        .filter((entry) => /^\d+$/.test(entry))
    : SPORTMONKS_OFFICIAL_ALLOWLIST_LEAGUE_IDS.map((id) => String(id));

  if (!ids.length) {
    return `fixtureLeagues:${SPORTMONKS_OFFICIAL_ALLOWLIST_LEAGUE_IDS.join(",")}`;
  }

  return `fixtureLeagues:${ids.join(",")}`;
}

function clampInteger(value, fallback, min, max) {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return Math.min(Math.max(parsedValue, min), max);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeLookupKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function safeNumber(value, fallback = 0) {
  const parsedValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value.replace(",", ".").replace("%", ""))
        : Number.NaN;

  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function roundTo(value, decimals = 2) {
  return Number(safeNumber(value).toFixed(decimals));
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function buildDateKey(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: ROME_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatDisplayDate(startingAt) {
  const parsedDate = parseDate(startingAt);

  if (!parsedDate) {
    return "--";
  }

  const eventDay = buildDateKey(parsedDate);
  const today = new Date();
  const todayKey = buildDateKey(today);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = buildDateKey(tomorrow);

  if (eventDay === todayKey) {
    return "Oggi";
  }

  if (eventDay === tomorrowKey) {
    return "Domani";
  }

  return parsedDate.toLocaleDateString("it-IT", {
    timeZone: ROME_TIMEZONE,
    day: "2-digit",
    month: "short",
  });
}

function formatKickoff(startingAt) {
  const parsedDate = parseDate(startingAt);

  if (!parsedDate) {
    return { date: "--", time: "--:--" };
  }

  return {
    date: formatDisplayDate(startingAt),
    time: parsedDate.toLocaleTimeString("it-IT", {
      timeZone: ROME_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}

function getRelativeStatus(startingAt) {
  const parsedDate = parseDate(startingAt);

  if (!parsedDate) {
    return "upcoming";
  }

  const eventDay = buildDateKey(parsedDate);
  const today = new Date();
  const todayKey = buildDateKey(today);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = buildDateKey(tomorrow);

  if (eventDay === todayKey) {
    return "today";
  }

  if (eventDay === tomorrowKey) {
    return "tomorrow";
  }

  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: ROME_TIMEZONE,
    weekday: "short",
  }).format(parsedDate);

  if (weekday === "Sat" || weekday === "Sun") {
    return "weekend";
  }

  return "upcoming";
}

function formatShortCode(participant) {
  const name =
    participant?.short_code ||
    participant?.shortCode ||
    participant?.abbreviation ||
    participant?.short_name ||
    participant?.name ||
    "";

  if (!name) {
    return "---";
  }

  return name.replace(/\s+/g, "").toUpperCase().slice(0, 3);
}

const SPORTMONKS_MEDIA_BASE_DEFAULT = "https://cdn.sportmonks.com";

function pickRawImagePath(source) {
  if (!source || typeof source !== "object") {
    return null;
  }

  const nestedPlayer =
    source.player && typeof source.player === "object" ? source.player : null;
  const nestedTeam = source.team && typeof source.team === "object" ? source.team : null;
  const nestedParticipant =
    source.participant && typeof source.participant === "object" ? source.participant : null;

  return (
    source.image_path ||
    source.imagePath ||
    source.logo_path ||
    source.logoPath ||
    source.logo ||
    source.photo ||
    source.image ||
    source?.meta?.image_path ||
    nestedPlayer?.image_path ||
    nestedPlayer?.imagePath ||
    nestedPlayer?.photo ||
    nestedTeam?.image_path ||
    nestedTeam?.imagePath ||
    nestedParticipant?.image_path ||
    nestedParticipant?.imagePath ||
    null
  );
}

function resolveSportmonksMediaUrl(raw) {
  if (raw == null) {
    return null;
  }

  const trimmed = String(raw).trim();

  if (!trimmed) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  const base = String(
    process.env.SPORTMONKS_MEDIA_BASE_URL || SPORTMONKS_MEDIA_BASE_DEFAULT
  ).replace(/\/+$/g, "");
  const path = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${base}${path}`;
}

function buildMediaBundle(source) {
  const raw = pickRawImagePath(source);
  const imageUrl = resolveSportmonksMediaUrl(raw);

  return {
    imageUrl,
    thumbUrl: imageUrl,
  };
}

function getSportmonksApiToken({ silent = false } = {}) {
  const apiToken =
    process.env.SPORTMONKS_API_TOKEN || process.env.SPORTMONKS_API_KEY || "";

  if (!apiToken && !silent) {
    throw new Error("Missing SPORTMONKS_API_TOKEN environment variable.");
  }

  return apiToken;
}

function getSportmonksFootballBaseUrl() {
  const rawBaseUrl = String(
    process.env.SPORTMONKS_BASE_URL || "https://api.sportmonks.com/v3"
  )
    .trim()
    .replace(/\/+$/g, "");

  if (rawBaseUrl.endsWith("/football")) {
    return rawBaseUrl;
  }

  return `${rawBaseUrl}/football`;
}

function buildSportmonksUrl(pathname, searchParams) {
  const url = new URL(
    `${getSportmonksFootballBaseUrl()}/${String(pathname || "").replace(/^\/+/g, "")}`
  );

  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (value == null || value === "") {
      return;
    }

    url.searchParams.set(key, value);
  });

  return url;
}

function buildRequestParams({
  include = [],
  filters = "",
  select = "",
  timezone = ROME_TIMEZONE,
  page = 1,
  perPage = 100,
} = {}) {
  const includeValue = Array.isArray(include) ? include.filter(Boolean).join(";") : include;

  return {
    api_token: getSportmonksApiToken(),
    include: includeValue || undefined,
    filters: filters || undefined,
    select: select || undefined,
    timezone: timezone || undefined,
    page: page > 1 ? String(page) : undefined,
    per_page: perPage ? String(perPage) : undefined,
  };
}

async function requestSportmonksJson(pathname, options = {}) {
  const startedAt = Date.now();
  const { telemetry = {}, ...requestOptions } = options || {};
  const url = buildSportmonksUrl(pathname, buildRequestParams(requestOptions));
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const providerMessage =
      payload?.message ||
      payload?.error ||
      payload?.errors?.[0]?.message ||
      `Sportmonks request failed with status ${response.status}.`;

    logFootballProviderTelemetry({
      route: telemetry.route || null,
      requestPurpose: telemetry.requestPurpose || null,
      days: telemetry.days ?? null,
      fixtureId: telemetry.fixtureId ?? null,
      cacheHit: false,
      cacheState: "miss",
      providerLatencyMs: Date.now() - startedAt,
      pagesFetched: 1,
      itemsFetched: 0,
      payloadBytes: payload ? JSON.stringify(payload).length : 0,
      normalizeMs: null,
      e2eMs: Date.now() - startedAt,
      fallbackTriggered: Boolean(telemetry.fallbackTriggered),
      retryCount: telemetry.retryCount ?? 0,
      dtoTarget: telemetry.dtoTarget || null,
      dtoVersion: telemetry.dtoVersion || "v1",
      providerEndpoint: pathname,
      includeSet: Array.isArray(requestOptions.include)
        ? requestOptions.include.join(";")
        : requestOptions.include || null,
      estimatedCallCost: 1,
      status: response.status,
      error: providerMessage,
    });
    throw new Error(providerMessage);
  }

  logFootballProviderTelemetry({
    route: telemetry.route || null,
    requestPurpose: telemetry.requestPurpose || null,
    days: telemetry.days ?? null,
    fixtureId: telemetry.fixtureId ?? null,
    cacheHit: null,
    cacheState: null,
    providerLatencyMs: Date.now() - startedAt,
    pagesFetched: 1,
    itemsFetched: Array.isArray(payload?.data) ? payload.data.length : payload?.data ? 1 : 0,
    payloadBytes: payload ? JSON.stringify(payload).length : 0,
    normalizeMs: null,
    e2eMs: Date.now() - startedAt,
    fallbackTriggered: Boolean(telemetry.fallbackTriggered),
    retryCount: telemetry.retryCount ?? 0,
    dtoTarget: telemetry.dtoTarget || null,
    dtoVersion: telemetry.dtoVersion || "v1",
    providerEndpoint: pathname,
    includeSet: Array.isArray(requestOptions.include)
      ? requestOptions.include.join(";")
      : requestOptions.include || null,
    estimatedCallCost: 1,
    status: response.status,
  });

  return payload;
}

function getSportmonksCollectionPageMeta(payload) {
  const pagination = payload?.pagination || payload?.meta?.pagination || {};
  const currentPage = Math.max(
    1,
    safeNumber(pagination?.current_page ?? pagination?.currentPage, 1)
  );
  const rawTotalPages = safeNumber(
    pagination?.total_pages ?? pagination?.totalPages,
    Number.NaN
  );
  const totalPages = Number.isFinite(rawTotalPages) && rawTotalPages > 0 ? rawTotalPages : null;
  const hasMoreByFlag =
    typeof pagination?.has_more === "boolean"
      ? pagination.has_more
      : typeof pagination?.hasMore === "boolean"
        ? pagination.hasMore
        : null;
  const hasMore = hasMoreByFlag ?? (Number.isFinite(totalPages) ? currentPage < totalPages : false);

  return {
    currentPage,
    totalPages,
    hasMore,
  };
}

async function requestSportmonksCollection(pathname, options = {}) {
  const startedAt = Date.now();
  const { telemetry = {}, maxPages: maxPagesOption, ...requestOptions } = options || {};
  /** Default 10: altri endpoint (es. odds) restano leggeri. Calendario usa `maxPages` dedicato. */
  const maxPages = maxPagesOption ?? 10;

  const firstPayload = await requestSportmonksJson(pathname, {
    ...requestOptions,
    telemetry: {
      ...telemetry,
      retryCount: telemetry.retryCount ?? 0,
    },
  });
  const firstData = asArray(firstPayload?.data);
  const firstMeta = getSportmonksCollectionPageMeta(firstPayload);

  if (!firstMeta.hasMore && (!firstMeta.totalPages || firstMeta.totalPages <= 1)) {
    return {
      ...firstPayload,
      data: firstData,
      collectionPagination: null,
    };
  }

  const allData = [...firstData];
  let pagesFetched = 1;
  let failures = 0;
  let totalPages = firstMeta.totalPages;

  if (Number.isFinite(firstMeta.totalPages)) {
    const pageLimit = Math.min(firstMeta.totalPages, maxPages);
    const remainingPages = [];

    for (let page = 2; page <= pageLimit; page += 1) {
      remainingPages.push(
        requestSportmonksJson(pathname, {
          ...requestOptions,
          page,
        })
      );
    }

    const pagePayloads = await Promise.allSettled(remainingPages);
    pagePayloads.forEach((result) => {
      if (result.status === "fulfilled") {
        allData.push(...asArray(result.value?.data));
        pagesFetched += 1;
      } else {
        failures += 1;
      }
    });
  } else {
    let nextPage = 2;
    let hasMore = firstMeta.hasMore;
    while (hasMore && nextPage <= maxPages) {
      try {
        const payload = await requestSportmonksJson(pathname, {
          ...requestOptions,
          page: nextPage,
        });
        allData.push(...asArray(payload?.data));
        pagesFetched += 1;
        const meta = getSportmonksCollectionPageMeta(payload);
        hasMore = Boolean(meta.hasMore);
        if (Number.isFinite(meta.totalPages)) {
          totalPages = meta.totalPages;
        }
      } catch {
        failures += 1;
        hasMore = false;
      }
      nextPage += 1;
    }
  }

  const boundedTotalPages = Number.isFinite(totalPages) ? totalPages : null;
  const truncatedByLimit =
    Number.isFinite(boundedTotalPages) && Number.isFinite(maxPages)
      ? boundedTotalPages > maxPages
      : false;
  const truncatedByFailure = failures > 0;
  const truncatedByUnknown = boundedTotalPages == null ? false : pagesFetched < boundedTotalPages;

  const collectionPayload = {
    ...firstPayload,
    data: allData,
    collectionPagination: {
      totalPages: boundedTotalPages,
      pagesFetched,
      truncated: truncatedByLimit || truncatedByFailure || truncatedByUnknown,
      perPage: safeNumber(requestOptions.perPage, 50),
      failures,
    },
  };
  logFootballProviderTelemetry({
    route: telemetry.route || null,
    requestPurpose: telemetry.requestPurpose || null,
    days: telemetry.days ?? null,
    fixtureId: telemetry.fixtureId ?? null,
    cacheHit: false,
    cacheState: "miss",
    providerLatencyMs: Date.now() - startedAt,
    pagesFetched: collectionPayload.collectionPagination?.pagesFetched ?? 1,
    itemsFetched: allData.length,
    payloadBytes: collectionPayload ? JSON.stringify(collectionPayload).length : 0,
    normalizeMs: null,
    e2eMs: Date.now() - startedAt,
    fallbackTriggered: Boolean(telemetry.fallbackTriggered),
    retryCount: telemetry.retryCount ?? 0,
    dtoTarget: telemetry.dtoTarget || null,
    dtoVersion: telemetry.dtoVersion || "v1",
    providerEndpoint: pathname,
    includeSet: Array.isArray(requestOptions.include)
      ? requestOptions.include.join(";")
      : requestOptions.include || null,
    estimatedCallCost: collectionPayload.collectionPagination?.pagesFetched ?? 1,
    status: 200,
  });
  return collectionPayload;
}

function getSportmonksRuntimeIncludeDenylist(scope, pathname) {
  if (!globalThis.__sportmonksRuntimeIncludeDenylist) {
    globalThis.__sportmonksRuntimeIncludeDenylist = new Map();
  }
  const key = `${scope || "default"}:${pathname || ""}`;
  if (!globalThis.__sportmonksRuntimeIncludeDenylist.has(key)) {
    globalThis.__sportmonksRuntimeIncludeDenylist.set(key, new Set());
  }
  return globalThis.__sportmonksRuntimeIncludeDenylist.get(key);
}

function looksLikeUnsupportedIncludeError(message) {
  const normalized = String(message || "").toLowerCase();
  return (
    normalized.includes("include") &&
    (normalized.includes("unknown") ||
      normalized.includes("unsupported") ||
      normalized.includes("invalid") ||
      normalized.includes("not allowed"))
  );
}

function getIncludesFromProviderError(message) {
  const normalized = String(message || "");
  const tokens = [];
  const dottedRegex = /[a-z_]+(?:\.[a-z_]+)+/gi;
  const quotedRegex = /requested include ['"]([a-z_]+(?:\.[a-z_]+)?)['"]/gi;
  const plainExpectedRegex = /\bexpected\b/gi;
  let quoted = quotedRegex.exec(normalized);
  while (quoted) {
    tokens.push(quoted[1]);
    quoted = quotedRegex.exec(normalized);
  }
  if (plainExpectedRegex.test(normalized)) {
    tokens.push("expected");
    tokens.push("expected.type");
  }
  let match = dottedRegex.exec(normalized);
  while (match) {
    tokens.push(match[0]);
    match = dottedRegex.exec(normalized);
  }
  return Array.from(new Set(tokens));
}

function buildAllowedIncludesForScope(include, scope, pathname) {
  const staticDenylist = SPORTMONKS_INCLUDE_DENYLIST_BY_SCOPE[scope] || new Set();
  const runtimeDenylist = getSportmonksRuntimeIncludeDenylist(scope, pathname);
  return asArray(include).filter(
    (entry) => !staticDenylist.has(entry) && !runtimeDenylist.has(entry)
  );
}

async function requestSportmonksWithIncludeFallback(pathname, attempts, options = {}) {
  let lastError = null;
  const startedAt = Date.now();
  const { telemetry = {}, includeScope = "detail_core", ...requestOptions } = options || {};
  let attemptIndex = 0;
  const attemptedIncludeSets = new Set();

  for (const include of attempts) {
    attemptIndex += 1;
    const scopedInclude = buildAllowedIncludesForScope(include, includeScope, pathname);
    const includeKey = scopedInclude.join(";");
    if (!scopedInclude.length) {
      continue;
    }
    if (attemptedIncludeSets.has(includeKey)) {
      continue;
    }
    attemptedIncludeSets.add(includeKey);
    try {
      const requester = requestOptions.expectCollection
        ? requestSportmonksCollection
        : requestSportmonksJson;

      const payload = await requester(pathname, {
        ...requestOptions,
        include: scopedInclude,
        telemetry: {
          ...telemetry,
          fallbackTriggered: attemptIndex > 1,
          retryCount: attemptIndex - 1,
        },
      });
      logFootballProviderTelemetry({
        route: telemetry.route || null,
        requestPurpose: telemetry.requestPurpose || null,
        days: telemetry.days ?? null,
        fixtureId: telemetry.fixtureId ?? null,
        cacheHit: false,
        cacheState: "miss",
        providerLatencyMs: Date.now() - startedAt,
        pagesFetched: payload?.collectionPagination?.pagesFetched ?? 1,
        itemsFetched: Array.isArray(payload?.data) ? payload.data.length : payload?.data ? 1 : 0,
        payloadBytes: payload ? JSON.stringify(payload).length : 0,
        normalizeMs: null,
        e2eMs: Date.now() - startedAt,
        fallbackTriggered: attemptIndex > 1,
        retryCount: attemptIndex - 1,
        dtoTarget: telemetry.dtoTarget || null,
        dtoVersion: telemetry.dtoVersion || "v1",
        providerEndpoint: pathname,
        includeSet: scopedInclude.join(";"),
        estimatedCallCost: payload?.collectionPagination?.pagesFetched ?? 1,
        status: 200,
      });
      return payload;
    } catch (error) {
      lastError = error;
      if (looksLikeUnsupportedIncludeError(error?.message)) {
        const runtimeDenylist = getSportmonksRuntimeIncludeDenylist(includeScope, pathname);
        getIncludesFromProviderError(error?.message).forEach((includeName) =>
          runtimeDenylist.add(includeName)
        );
      }
    }
  }

  logFootballProviderTelemetry({
    route: telemetry.route || null,
    requestPurpose: telemetry.requestPurpose || null,
    days: telemetry.days ?? null,
    fixtureId: telemetry.fixtureId ?? null,
    cacheHit: false,
    cacheState: "miss",
    providerLatencyMs: Date.now() - startedAt,
    pagesFetched: null,
    itemsFetched: 0,
    payloadBytes: null,
    normalizeMs: null,
    e2eMs: Date.now() - startedAt,
    fallbackTriggered: true,
    retryCount: Math.max(0, attemptIndex - 1),
    dtoTarget: telemetry.dtoTarget || null,
    dtoVersion: telemetry.dtoVersion || "v1",
    providerEndpoint: pathname,
    includeSet: null,
    estimatedCallCost: null,
    error: lastError?.message || "unknown_error",
  });

  throw lastError || new Error("Impossibile recuperare il feed Sportmonks.");
}

function getParticipantsByLocation(participants = []) {
  const homeParticipant =
    participants.find((participant) => {
      const location = normalizeLookupKey(
        participant?.location || participant?.meta?.location || participant?.meta?.position
      );
      return location === "home";
    }) || participants[0] || null;
  const awayParticipant =
    participants.find((participant) => {
      const location = normalizeLookupKey(
        participant?.location || participant?.meta?.location || participant?.meta?.position
      );
      return location === "away";
    }) ||
    participants.find((participant) => participant?.id !== homeParticipant?.id) ||
    participants[1] ||
    null;

  return {
    home: homeParticipant,
    away: awayParticipant,
  };
}

function resolveParticipantLocation(entry, homeParticipant, awayParticipant) {
  const directLocation = normalizeLookupKey(
    entry?.location || entry?.meta?.location || entry?.participant?.meta?.location
  );

  if (directLocation === "home" || directLocation === "away") {
    return directLocation;
  }

  const participantId = String(
    entry?.participant_id ||
      entry?.participantId ||
      entry?.team_id ||
      entry?.teamId ||
      entry?.player?.team_id ||
      ""
  );

  if (participantId && participantId === String(homeParticipant?.id || "")) {
    return "home";
  }

  if (participantId && participantId === String(awayParticipant?.id || "")) {
    return "away";
  }

  return null;
}

/**
 * Dove `team_id` sulla riga lineup corrisponde a `participant_id` in `formations` (location home/away),
 * anche se `participants` non matcha il team id come nell'include ridotto.
 */
function resolveLineupTeamLocation(entry, homeParticipant, awayParticipant, formations = []) {
  const fromParticipant = resolveParticipantLocation(entry, homeParticipant, awayParticipant);
  if (fromParticipant) {
    return fromParticipant;
  }

  const teamId = String(entry?.team_id ?? "").trim();
  if (!teamId) {
    return null;
  }

  const formationRow = asArray(formations).find(
    (row) => String(row?.participant_id ?? "").trim() === teamId
  );
  const loc = normalizeLookupKey(formationRow?.location || "");
  if (loc === "home" || loc === "away") {
    return loc;
  }

  return null;
}

function pickValueEntry(entry) {
  if (entry == null) {
    return Number.NaN;
  }

  if (typeof entry === "number" || typeof entry === "string") {
    return safeNumber(entry, Number.NaN);
  }

  if (typeof entry === "object") {
    if (typeof entry.value !== "undefined") {
      const nestedValue =
        typeof entry.value === "object"
          ? entry.value.value ??
            entry.value.expected ??
            entry.value.actual ??
            entry.value.percentage ??
            entry.value.home ??
            entry.value.away
          : entry.value;
      const parsedValue = safeNumber(nestedValue, Number.NaN);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }

    const directValue = safeNumber(
      entry.expected ??
        entry.actual ??
        entry.percentage ??
        entry.probability ??
        entry.home ??
        entry.away ??
        entry.draw,
      Number.NaN
    );

    if (Number.isFinite(directValue)) {
      return directValue;
    }
  }

  return Number.NaN;
}

function getFixtureMetadataEntries(fixture) {
  return asArray(fixture?.metadata);
}

function getFixtureMetadataBoolean(fixture, typeIds = []) {
  const match = getFixtureMetadataEntries(fixture).find((entry) =>
    typeIds.some((typeId) => safeNumber(entry?.type_id, Number.NaN) === safeNumber(typeId, Number.NaN))
  );

  if (!match) {
    return null;
  }

  if (typeof match?.values === "boolean") {
    return match.values;
  }

  if (typeof match?.values?.confirmed === "boolean") {
    return match.values.confirmed;
  }

  return null;
}

function buildFormArray(value, fallbackForm = DEFAULT_FORM) {
  if (Array.isArray(value) && value.length > 0) {
    return value.slice(-5);
  }

  if (typeof value !== "string") {
    return [...fallbackForm];
  }

  const form = value
    .toUpperCase()
    .replace(/[^WDL]/g, "")
    .slice(-5)
    .split("")
    .map((symbol) => {
      if (symbol === "W") return "V";
      if (symbol === "D") return "P";
      if (symbol === "L") return "S";
      return "-";
    });

  while (form.length < 5) {
    form.unshift("-");
  }

  return form;
}

function getFormStrength(form = DEFAULT_FORM) {
  return form.reduce((total, result) => {
    if (result === "V") return total + 3;
    if (result === "P") return total + 1;
    return total;
  }, 0);
}

function ensureProbabilitySum(probabilities) {
  const normalized = {
    home: Math.max(1, Math.round(safeNumber(probabilities.home))),
    draw: Math.max(1, Math.round(safeNumber(probabilities.draw))),
    away: Math.max(1, Math.round(safeNumber(probabilities.away))),
  };
  const total = normalized.home + normalized.draw + normalized.away;
  const diff = 100 - total;

  normalized.draw += diff;
  return normalized;
}

function probabilityToOdds(probability) {
  if (!probability) {
    return 0;
  }

  return roundTo(100 / probability, 2);
}

function buildModelOddsFromProbabilities(probabilities) {
  return {
    home: probabilityToOdds(probabilities?.home),
    draw: probabilityToOdds(probabilities?.draw),
    away: probabilityToOdds(probabilities?.away),
  };
}

function computeValuePercent(modelOdd, bookOdd) {
  if (!Number.isFinite(modelOdd) || modelOdd <= 0 || !Number.isFinite(bookOdd) || bookOdd <= 0) {
    return null;
  }
  return roundTo(((bookOdd - modelOdd) / modelOdd) * 100, 1);
}

/**
 * Quota modello decimale da probabilità modello in % (0–100): 1 / (p/100) = 100/p.
 * Allineato a `probabilityToOdds` / specifica prodotto (value = (book − model) / model × 100).
 */
function buildModelOddsOuGgFromScheduleProbs(ouProb, ggProb) {
  const modelOddsOu = {
    over25: Number.isFinite(ouProb?.over25) ? probabilityToOdds(ouProb.over25) : 0,
    under25: Number.isFinite(ouProb?.under25) ? probabilityToOdds(ouProb.under25) : 0,
  };
  const modelOddsGg = {
    goal: Number.isFinite(ggProb?.goal) ? probabilityToOdds(ggProb.goal) : 0,
    noGoal: Number.isFinite(ggProb?.noGoal) ? probabilityToOdds(ggProb.noGoal) : 0,
  };
  return { modelOddsOu, modelOddsGg };
}

/**
 * Value bet = quota bookmaker > quota modello su qualsiasi esito 1X2, O/U 2.5, GG/NG.
 * Sceglie l’esito con edge % massimo: ((book − model) / model) × 100.
 */
function resolveBestCrossMarketValueBet({
  valueMarkets,
  marketsOu,
  marketsGg,
  ouProb,
  ggProb,
  modelOddsOu,
  modelOddsGg,
}) {
  const candidates = [];

  const ox = valueMarkets?.oneXTwo;
  if (ox) {
    [
      { type: "1", key: "home" },
      { type: "X", key: "draw" },
      { type: "2", key: "away" },
    ].forEach(({ type, key }) => {
      const e = ox[key];
      const edge = e?.valuePct;
      if (Number.isFinite(edge) && edge > 0) {
        candidates.push({
          type,
          market: "1X2",
          edge,
          modelOdd: safeNumber(e?.modelOdd, 0),
          bookOdd: safeNumber(e?.bestBookOdd, 0),
        });
      }
    });
  }

  if (ouProb && modelOddsOu) {
    [
      { type: "Over 2.5", prob: ouProb.over25, model: modelOddsOu.over25, book: marketsOu?.over25 },
      { type: "Under 2.5", prob: ouProb.under25, model: modelOddsOu.under25, book: marketsOu?.under25 },
    ].forEach((row) => {
      const book = safeNumber(row.book, Number.NaN);
      const edge = computeValuePercent(row.model, book);
      if (edge != null && edge > 0) {
        candidates.push({
          type: row.type,
          market: "O/U 2.5",
          edge,
          modelOdd: row.model,
          bookOdd: book,
        });
      }
    });
  }

  if (ggProb && modelOddsGg) {
    [
      { type: "Goal", prob: ggProb.goal, model: modelOddsGg.goal, book: marketsGg?.goal },
      { type: "No Goal", prob: ggProb.noGoal, model: modelOddsGg.noGoal, book: marketsGg?.noGoal },
    ].forEach((row) => {
      const book = safeNumber(row.book, Number.NaN);
      const edge = computeValuePercent(row.model, book);
      if (edge != null && edge > 0) {
        candidates.push({
          type: row.type,
          market: "GG/NG",
          edge,
          modelOdd: row.model,
          bookOdd: book,
        });
      }
    });
  }

  if (!candidates.length) {
    return null;
  }

  candidates.sort((left, right) => right.edge - left.edge);
  return candidates[0];
}

function buildOneXTwoValueMarkets(probabilities, oneXTwoBest = null) {
  const modelOdds = buildModelOddsFromProbabilities(probabilities);
  const byOutcome = {
    home: {
      modelOdd: modelOdds.home || null,
      bestBookOdd: oneXTwoBest?.home?.value || null,
      bestBookmaker: oneXTwoBest?.home?.bookmaker || null,
    },
    draw: {
      modelOdd: modelOdds.draw || null,
      bestBookOdd: oneXTwoBest?.draw?.value || null,
      bestBookmaker: oneXTwoBest?.draw?.bookmaker || null,
    },
    away: {
      modelOdd: modelOdds.away || null,
      bestBookOdd: oneXTwoBest?.away?.value || null,
      bestBookmaker: oneXTwoBest?.away?.bookmaker || null,
    },
  };

  Object.values(byOutcome).forEach((entry) => {
    entry.valuePct = computeValuePercent(entry.modelOdd, entry.bestBookOdd);
    entry.hasBookmakerData = Number.isFinite(entry.bestBookOdd) && entry.bestBookOdd > 0;
  });

  const preferred = [
    { type: "1", key: "home" },
    { type: "X", key: "draw" },
    { type: "2", key: "away" },
  ]
    .map(({ type, key }) => ({
      type,
      key,
      edge: byOutcome[key].valuePct,
      market: "1X2",
      odds: byOutcome[key].bestBookOdd,
      bookmaker: byOutcome[key].bestBookmaker,
    }))
    .filter((entry) => Number.isFinite(entry.edge))
    .sort((left, right) => right.edge - left.edge);

  const primary = preferred.find((entry) => entry.edge > 0) || null;

  return {
    modelOdds,
    oneXTwo: byOutcome,
    primary,
    hasBookmakerData: Object.values(byOutcome).some((entry) => entry.hasBookmakerData),
  };
}

function buildExpectedGoalsFromProbabilities(probabilities) {
  return {
    home: roundTo(0.75 + probabilities.home / 38, 2),
    away: roundTo(0.7 + probabilities.away / 38, 2),
  };
}

function buildGoalMarkets(xg) {
  const totalXg = xg.home + xg.away;
  const over25Probability = Math.min(82, Math.max(38, 18 + totalXg * 20));
  const goalProbability = Math.min(
    84,
    Math.max(35, 22 + Math.min(xg.home, xg.away) * 22 + totalXg * 8)
  );

  const ouProbDerived = {
    over25: Math.round(over25Probability),
    under25: Math.round(100 - over25Probability),
  };
  const ggProbDerived = {
    goal: Math.round(goalProbability),
    noGoal: Math.round(100 - goalProbability),
  };

  return {
    ou: {
      over15: probabilityToOdds(Math.min(90, over25Probability + 18)),
      under15: probabilityToOdds(Math.max(10, 100 - (over25Probability + 18))),
      over25: probabilityToOdds(over25Probability),
      under25: probabilityToOdds(100 - over25Probability),
      over35: probabilityToOdds(Math.max(12, over25Probability - 18)),
      under35: probabilityToOdds(Math.min(88, 100 - over25Probability + 18)),
    },
    gg: {
      goal: probabilityToOdds(goalProbability),
      noGoal: probabilityToOdds(100 - goalProbability),
    },
    /** Allineate alle stesse formule usate per le quote derivate sopra (modello interno). */
    ouProbDerived,
    ggProbDerived,
  };
}

function buildLikelyScores(probabilities, xg) {
  const rankedScores = SCORE_CANDIDATES.map((candidate) => {
    const bias =
      candidate.home === candidate.away
        ? probabilities.draw / 100
        : candidate.home > candidate.away
          ? probabilities.home / 100
          : probabilities.away / 100;
    const distance = Math.abs(xg.home - candidate.home) + Math.abs(xg.away - candidate.away);

    return {
      score: candidate.score,
      weight: bias - distance * 0.18 + candidate.drawBias,
    };
  })
    .sort((left, right) => right.weight - left.weight)
    .slice(0, 3);

  return rankedScores.map((candidate, index) => ({
    score: candidate.score,
    prob: [16, 13, 10][index] || 8,
  }));
}

function getValueQualityScore(valueEdge) {
  if (!Number.isFinite(valueEdge)) return 35;
  if (valueEdge <= 0) return 30;
  if (valueEdge >= 14) return 95;
  if (valueEdge >= 10) return 85;
  if (valueEdge >= 6) return 70;
  if (valueEdge >= 3) return 55;
  return 45;
}

function getDataCoverageScore({ coverage, hasPredictedScores }) {
  let score = 0;
  if (coverage?.hasPredictions) score += 35;
  if (coverage?.hasPreMatchOdds) score += 35;
  if (coverage?.hasExpectedGoals) score += 15;
  if (hasPredictedScores) score += 15;
  return Math.max(0, Math.min(100, score));
}

function getLineupReliabilityScore(lineupStatus) {
  if (lineupStatus === "official") return 100;
  if (lineupStatus === "probable") return 75;
  if (lineupStatus === "expected") return 55;
  return 35;
}

function buildConfidence({
  probabilities,
  coverage,
  lineupStatus = "unknown",
  valueEdge = null,
  apiConfidence = null,
  hasPredictedScores = false,
} = {}) {
  const apiScore = apiPercentFromPredictionValue(apiConfidence);
  if (apiScore !== null) {
    return {
      score: apiScore,
      source: "sportmonks_api",
      reliabilityScore: getLineupReliabilityScore(lineupStatus),
    };
  }

  const p = {
    home: safeNumber(probabilities?.home),
    draw: safeNumber(probabilities?.draw),
    away: safeNumber(probabilities?.away),
  };
  const ordered = [p.home, p.draw, p.away].sort((left, right) => right - left);
  const margin = Math.max(0, (ordered[0] || 0) - (ordered[1] || 0));
  const modelStrength = Math.max(0, Math.min(100, roundTo(40 + margin * 2.2, 1)));
  const valueQuality = getValueQualityScore(valueEdge);
  const dataCoverage = getDataCoverageScore({ coverage, hasPredictedScores });
  const lineupReliability = getLineupReliabilityScore(lineupStatus);

  const score = Math.max(
    0,
    Math.min(
      100,
      roundTo(
        modelStrength * 0.4 + valueQuality * 0.25 + dataCoverage * 0.2 + lineupReliability * 0.15,
        0
      )
    )
  );

  return {
    score,
    source: "composite_internal",
    reliabilityScore: lineupReliability,
  };
}

function normalizeOddsOutcomeLabel(value) {
  const label = normalizeLookupKey(value);

  if (
    label === "1" ||
    label.includes("home") ||
    label.includes("local") ||
    label.includes("team_1")
  ) {
    return "home";
  }

  if (label === "x" || label.includes("draw") || label.includes("tie")) {
    return "draw";
  }

  if (
    label === "2" ||
    label.includes("away") ||
    label.includes("visitor") ||
    label.includes("team_2")
  ) {
    return "away";
  }

  if (label.includes("over") || label.includes("yes") || label.includes("goal")) {
    return "yes";
  }

  if (label.includes("under") || label.includes("no")) {
    return "no";
  }

  return "";
}

function createEmptyOddsSnapshot() {
  return {
    oneXTwo: {
      home: { value: 0, bookmaker: null },
      draw: { value: 0, bookmaker: null },
      away: { value: 0, bookmaker: null },
    },
    overUnder25: {
      over: { value: 0, bookmaker: null },
      under: { value: 0, bookmaker: null },
    },
    btts: {
      yes: { value: 0, bookmaker: null },
      no: { value: 0, bookmaker: null },
    },
    bookmakerMap: new Map(),
  };
}

function upsertBookmakerOdds(bookmakerMap, bookmakerName, outcome, value) {
  if (!bookmakerName || !outcome || !Number.isFinite(value) || value <= 0) {
    return;
  }

  if (!bookmakerMap.has(bookmakerName)) {
    bookmakerMap.set(bookmakerName, {
      name: bookmakerName,
      home: 0,
      draw: 0,
      away: 0,
      best: false,
    });
  }

  bookmakerMap.get(bookmakerName)[outcome] = roundTo(value, 2);
}

function updateBestOdds(slot, value, bookmakerName) {
  if (!Number.isFinite(value) || value <= 0) {
    return slot;
  }

  if (!slot.bookmaker || value > slot.value) {
    return {
      value: roundTo(value, 2),
      bookmaker: bookmakerName || slot.bookmaker || null,
    };
  }

  return slot;
}

function extractOddsBundle(oddsEntries = []) {
  const snapshot = createEmptyOddsSnapshot();

  asArray(oddsEntries).forEach((entry) => {
    const marketKey = normalizeLookupKey(
      entry?.market_description || entry?.market?.name || entry?.market_id
    );
    const outcomeKey = normalizeOddsOutcomeLabel(entry?.label || entry?.name);
    const totalValue = safeNumber(entry?.total, Number.NaN);
    const decimalValue = roundTo(
      safeNumber(entry?.dp3 || entry?.value || entry?.decimal, Number.NaN),
      2
    );
    const bookmakerName =
      entry?.bookmaker?.name ||
      entry?.bookmaker_name ||
      (entry?.bookmaker_id ? `Bookmaker ${entry.bookmaker_id}` : null);

    if (!Number.isFinite(decimalValue) || decimalValue <= 0) {
      return;
    }

    if (
      marketKey.includes("match_winner") ||
      marketKey.includes("fulltime_result") ||
      marketKey.includes("1x2")
    ) {
      if (outcomeKey === "home" || outcomeKey === "draw" || outcomeKey === "away") {
        snapshot.oneXTwo[outcomeKey] = updateBestOdds(
          snapshot.oneXTwo[outcomeKey],
          decimalValue,
          bookmakerName
        );
        upsertBookmakerOdds(snapshot.bookmakerMap, bookmakerName, outcomeKey, decimalValue);
      }
      return;
    }

    if (
      (marketKey.includes("goals_over_under") || marketKey.includes("over_under")) &&
      Math.abs(totalValue - 2.5) < 0.01
    ) {
      if (outcomeKey === "yes") {
        snapshot.overUnder25.over = updateBestOdds(
          snapshot.overUnder25.over,
          decimalValue,
          bookmakerName
        );
      }

      if (outcomeKey === "no") {
        snapshot.overUnder25.under = updateBestOdds(
          snapshot.overUnder25.under,
          decimalValue,
          bookmakerName
        );
      }
      return;
    }

    if (
      marketKey.includes("both_teams_to_score") ||
      marketKey.includes("goal_no_goal") ||
      marketKey.includes("btts")
    ) {
      if (outcomeKey === "yes") {
        snapshot.btts.yes = updateBestOdds(snapshot.btts.yes, decimalValue, bookmakerName);
      }

      if (outcomeKey === "no") {
        snapshot.btts.no = updateBestOdds(snapshot.btts.no, decimalValue, bookmakerName);
      }
    }
  });

  const bookmakers = Array.from(snapshot.bookmakerMap.values())
    .filter((entry) => entry.home > 0 || entry.draw > 0 || entry.away > 0)
    .map((entry) => ({
      ...entry,
      best:
        entry.home === snapshot.oneXTwo.home.value ||
        entry.draw === snapshot.oneXTwo.draw.value ||
        entry.away === snapshot.oneXTwo.away.value,
    }))
    .slice(0, 10);

  const bestOneXTwo = Object.values(snapshot.oneXTwo)
    .filter((entry) => entry.value > 0)
    .sort((left, right) => right.value - left.value)[0] || null;

  return {
    available:
      snapshot.oneXTwo.home.value > 0 ||
      snapshot.oneXTwo.draw.value > 0 ||
      snapshot.oneXTwo.away.value > 0,
    odds: {
      home: snapshot.oneXTwo.home.value || 0,
      draw: snapshot.oneXTwo.draw.value || 0,
      away: snapshot.oneXTwo.away.value || 0,
    },
    ou: {
      over25: snapshot.overUnder25.over.value || 0,
      under25: snapshot.overUnder25.under.value || 0,
    },
    gg: {
      goal: snapshot.btts.yes.value || 0,
      noGoal: snapshot.btts.no.value || 0,
    },
    oneXTwoBest: snapshot.oneXTwo,
    bookmakers,
    bestOdds: bestOneXTwo ? String(bestOneXTwo.value) : null,
    bestBookmaker: bestOneXTwo?.bookmaker || null,
    movement: null,
  };
}

function getFormationOverrides(formations, homeParticipant, awayParticipant) {
  const overrides = {
    home: "--",
    away: "--",
  };

  asArray(formations).forEach((entry) => {
    const location = resolveParticipantLocation(entry, homeParticipant, awayParticipant);
    const formation = String(entry?.formation || "").trim();

    if (location && formation) {
      overrides[location] = formation;
    }
  });

  return overrides;
}

function buildLineupStatus(fixture, lineups, formations) {
  const confirmedLineups = getFixtureMetadataBoolean(fixture, [572]);

  if (confirmedLineups === true) {
    return "official";
  }

  if (asArray(lineups).length > 0) {
    return "probable";
  }

  if (
    Object.values(formations || {}).some((formation) => String(formation || "").trim() && formation !== "--")
  ) {
    return "expected";
  }

  return "unknown";
}

function resolveOfficialLocation(entry, homeParticipant, awayParticipant) {
  const participantId =
    entry?.participant_id ||
    entry?.meta?.participant_id ||
    entry?.participant?.id ||
    entry?.team_id;

  if (participantId && String(participantId) === String(homeParticipant?.id || "")) {
    return "home";
  }

  if (participantId && String(participantId) === String(awayParticipant?.id || "")) {
    return "away";
  }

  return resolveParticipantLocation(entry, homeParticipant, awayParticipant);
}

function normalizeOfficials(officials = []) {
  return asArray(officials).map((entry) => {
    const media = buildMediaBundle(entry);

    return {
      id: String(entry?.id || entry?.player_id || `${entry?.name || "official"}`),
      name:
        entry?.display_name ||
        entry?.common_name ||
        entry?.name ||
        [entry?.firstname, entry?.lastname].filter(Boolean).join(" ") ||
        "Official",
      countryId: entry?.country_id || entry?.nationality_id || null,
      media,
      image: media.imageUrl,
    };
  });
}

function buildCoachAssignments(coaches, homeParticipant, awayParticipant) {
  const assignments = {
    home: [],
    away: [],
  };

  asArray(coaches).forEach((entry) => {
    const location = resolveOfficialLocation(entry, homeParticipant, awayParticipant);
    const normalized = {
      ...normalizeOfficials([entry])[0],
      dateOfBirth: entry?.date_of_birth || null,
    };

    if (location === "home" || location === "away") {
      assignments[location].push(normalized);
    }
  });

  return assignments;
}

function mapStandingDetails(details = []) {
  const detailMap = new Map(
    asArray(details).map((entry) => [safeNumber(entry?.type_id, Number.NaN), safeNumber(entry?.value, 0)])
  );

  return {
    played: detailMap.get(129) || 0,
    wins: detailMap.get(130) || 0,
    draws: detailMap.get(131) || 0,
    losses: detailMap.get(132) || 0,
    goalsFor: detailMap.get(133) || 0,
    goalsAgainst: detailMap.get(134) || 0,
    goalDifference: detailMap.get(179) || 0,
  };
}

function normalizeStandingsTable(standings, stageId, homeParticipant, awayParticipant) {
  const entries = asArray(standings);
  const scopedEntries = entries.some((entry) => String(entry?.stage_id || "") === String(stageId || ""))
    ? entries.filter((entry) => String(entry?.stage_id || "") === String(stageId || ""))
    : entries;

  const rows = scopedEntries
    .map((entry) => {
      const stats = mapStandingDetails(entry?.details);
      const participantId = String(entry?.participant?.id || entry?.participant_id || "");
      const isHome = participantId === String(homeParticipant?.id || "");
      const isAway = participantId === String(awayParticipant?.id || "");

      return {
        id: String(entry?.id || participantId),
        participantId,
        team: entry?.participant?.name || "Team",
        shortCode: entry?.participant?.short_code || null,
        media: buildMediaBundle(entry?.participant || entry),
        position: safeNumber(entry?.position, 0),
        points: safeNumber(entry?.points, 0),
        played: stats.played,
        wins: stats.wins,
        draws: stats.draws,
        losses: stats.losses,
        goalsFor: stats.goalsFor,
        goalsAgainst: stats.goalsAgainst,
        goalDifference:
          stats.goalDifference || stats.goalsFor - stats.goalsAgainst,
        form: asArray(entry?.form)
          .sort((left, right) => safeNumber(left?.sort_order, 0) - safeNumber(right?.sort_order, 0))
          .slice(-5)
          .map((item) => item?.form || "-"),
        highlighted: isHome || isAway,
        side: isHome ? "home" : isAway ? "away" : null,
      };
    })
    .filter((entry) => entry.position > 0)
    .sort((left, right) => left.position - right.position);

  return {
    seasonId: String(entries[0]?.season_id || ""),
    stageId: String(stageId || entries[0]?.stage_id || ""),
    league: entries[0]?.league?.name || null,
    season: entries[0]?.season?.name || null,
    stage: entries[0]?.stage?.name || null,
    rows,
  };
}

function normalizeSquadPlayers(teamSquadEntries = [], teamName = "") {
  return asArray(teamSquadEntries).map((entry, index) => ({
    id: String(entry?.player?.id || entry?.player_id || `${teamName}:${index}`),
    name:
      entry?.player?.display_name ||
      entry?.player?.common_name ||
      entry?.player?.name ||
      "Giocatore",
    number: safeNumber(entry?.jersey_number, 0),
    team: teamName,
    pos:
      entry?.detailedposition?.name ||
      entry?.position?.name ||
      entry?.player?.type?.name ||
      "--",
    position:
      entry?.detailedposition?.name ||
      entry?.position?.name ||
      entry?.player?.type?.name ||
      "--",
    xg: 0,
    shots: 0,
    form: "Roster",
    goals: 0,
    assists: 0,
    fouls: 0,
    minutes: 0,
    formHistory: DEFAULT_FORM,
    insight: `${teamName}: profilo rosa caricato dal feed Sportmonks.`,
    scorerOdds: 0,
    scorerProb: 0,
    height: entry?.player?.height || null,
    weight: entry?.player?.weight || null,
    media: buildMediaBundle(entry?.player || entry),
  }));
}

function buildDerivedProbabilities(xg, homeForm, awayForm) {
  const formStrengthHome = getFormStrength(homeForm);
  const formStrengthAway = getFormStrength(awayForm);
  const totalXg = Math.max(0.2, safeNumber(xg.home) + safeNumber(xg.away));
  const xgBiasHome = (safeNumber(xg.home) / totalXg) * 100;
  const xgBiasAway = (safeNumber(xg.away) / totalXg) * 100;

  return ensureProbabilitySum({
    home: xgBiasHome * 0.62 + (34 + (formStrengthHome - formStrengthAway) * 1.8) * 0.38,
    draw: Math.max(18, 30 - Math.abs(safeNumber(xg.home) - safeNumber(xg.away)) * 12),
    away: xgBiasAway * 0.62 + (34 + (formStrengthAway - formStrengthHome) * 1.8) * 0.38,
  });
}

function buildDerivedValueBet(probabilities, xg) {
  if (probabilities.home >= 46 && xg.home - xg.away >= 0.25) {
    return {
      type: "1",
      edge: Math.min(14, Math.round(probabilities.home - probabilities.away / 2 - 18)),
      market: "1X2",
    };
  }

  if (probabilities.away >= 44 && xg.away - xg.home >= 0.25) {
    return {
      type: "2",
      edge: Math.min(14, Math.round(probabilities.away - probabilities.home / 2 - 18)),
      market: "1X2",
    };
  }

  const totalXg = xg.home + xg.away;

  /* Over 2.5: edge = (totalXg - 2.4) * 10 arrotondato, tetto 10%.
   * Per totalXg >= ~3.4 molte partite finiscono sul massimo 10% (effetto plateau in UI). */
  if (totalXg >= 2.9) {
    return {
      type: "Over 2.5",
      edge: Math.min(10, Math.round((totalXg - 2.4) * 10)),
      market: "O/U",
    };
  }

  if (Math.min(xg.home, xg.away) >= 0.9) {
    return {
      type: "Goal",
      edge: Math.min(8, Math.round(Math.min(xg.home, xg.away) * 4)),
      market: "GG/NG",
    };
  }

  return null;
}

function readNamedNumeric(value, keys = []) {
  const normalizedKeys = keys.map(normalizeLookupKey);

  if (!value || typeof value !== "object") {
    return Number.NaN;
  }

  for (const [entryKey, entryValue] of Object.entries(value)) {
    const normalizedKey = normalizeLookupKey(entryKey);

    if (normalizedKeys.some((key) => normalizedKey === key || normalizedKey.includes(key))) {
      const parsedValue = pickValueEntry(entryValue);

      if (Number.isFinite(parsedValue)) {
        return parsedValue;
      }
    }
  }

  return Number.NaN;
}

function normalizePredictionEntry(entry, homeParticipant, awayParticipant) {
  const payload = entry?.predictions || entry?.data || entry;
  const typeKey = normalizeLookupKey(
    entry?.type?.developer_name || entry?.type?.code || entry?.type?.name || entry?.type_id
  );
  const homeValue = readNamedNumeric(payload, [
    "home",
    "home_win",
    "homewinner",
    "team_1",
  ]);
  const drawValue = readNamedNumeric(payload, ["draw", "tie", "x"]);
  const awayValue = readNamedNumeric(payload, [
    "away",
    "away_win",
    "awaywinner",
    "team_2",
  ]);
  const participantValues = asArray(payload?.participants || payload?.predictions || payload?.values)
    .map((candidate) => ({
      location: resolveParticipantLocation(candidate, homeParticipant, awayParticipant),
      value: pickValueEntry(candidate),
    }))
    .filter((candidate) => candidate.location && Number.isFinite(candidate.value));

  const participantHome = participantValues.find((candidate) => candidate.location === "home")?.value;
  const participantAway = participantValues.find((candidate) => candidate.location === "away")?.value;

  const scoreCandidates = asArray(payload?.scores || payload?.scorelines || entry?.scores)
    .map((scoreEntry) => ({
      score:
        scoreEntry?.score ||
        scoreEntry?.label ||
        scoreEntry?.name ||
        `${scoreEntry?.home ?? "0"}:${scoreEntry?.away ?? "0"}`,
      prob: Math.round(
        safeNumber(
          scoreEntry?.probability ||
            scoreEntry?.percentage ||
            scoreEntry?.value ||
            scoreEntry?.weight,
          0
        )
      ),
    }))
    .filter((scoreEntry) => scoreEntry.score && scoreEntry.prob > 0)
    .slice(0, 3);
  const yesValue = readNamedNumeric(payload, ["yes", "over", "goal"]);
  const noValue = readNamedNumeric(payload, ["no", "under", "ngoal", "no_goal"]);
  const confidenceValue = readNamedNumeric(payload, ["confidence", "reliability", "strength"]);

  const oneXTwo =
    Number.isFinite(homeValue) || Number.isFinite(drawValue) || Number.isFinite(awayValue)
      ? ensureProbabilitySum({
          home: homeValue,
          draw: drawValue,
          away: awayValue,
        })
      : Number.isFinite(participantHome) || Number.isFinite(participantAway)
        ? ensureProbabilitySum({
            home: participantHome,
            draw: 100 - participantHome - participantAway,
            away: participantAway,
          })
        : null;

  if (!oneXTwo && !scoreCandidates.length && !Number.isFinite(yesValue) && !Number.isFinite(noValue)) {
    return null;
  }

  return {
    typeKey,
    oneXTwo,
    yesValue,
    noValue,
    confidenceValue,
    scores: scoreCandidates,
  };
}

function apiPercentFromPredictionValue(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.round(Math.min(100, Math.max(0, value)));
}

function extractPredictionBundle(predictions, homeParticipant, awayParticipant) {
  const bundle = {
    probabilities: null,
    ou: null,
    gg: null,
    /** Percentuali O/U e GG solo se presenti nelle predizioni API (yes/no). */
    ouProb: null,
    ggProb: null,
    confidence: null,
    scores: [],
  };

  asArray(predictions)
    .map((entry) => normalizePredictionEntry(entry, homeParticipant, awayParticipant))
    .filter(Boolean)
    .forEach((entry) => {
      if (!bundle.probabilities && entry.oneXTwo) {
        bundle.probabilities = entry.oneXTwo;
      }

      if (!bundle.scores.length && entry.scores.length) {
        bundle.scores = entry.scores;
      }

      if (bundle.confidence === null) {
        bundle.confidence = apiPercentFromPredictionValue(entry.confidenceValue);
      }

      if (
        !bundle.gg &&
        (entry.typeKey.includes("both_teams_to_score") ||
          entry.typeKey.includes("goal_no_goal") ||
          entry.typeKey.includes("btts"))
      ) {
        bundle.gg = {
          goal: probabilityToOdds(entry.yesValue),
          noGoal: probabilityToOdds(entry.noValue || 100 - entry.yesValue),
        };
        const goalPct = apiPercentFromPredictionValue(entry.yesValue);
        if (goalPct !== null) {
          const noGoalPct = Number.isFinite(entry.noValue)
            ? apiPercentFromPredictionValue(entry.noValue)
            : apiPercentFromPredictionValue(100 - entry.yesValue);
          bundle.ggProb = {
            goal: goalPct,
            noGoal: noGoalPct ?? Math.max(0, Math.min(100, 100 - goalPct)),
          };
        }
      }

      if (
        !bundle.ou &&
        (entry.typeKey.includes("over_under_2_5") ||
          entry.typeKey.includes("over_under") ||
          entry.typeKey.includes("totals"))
      ) {
        bundle.ou = {
          over25: probabilityToOdds(entry.yesValue),
          under25: probabilityToOdds(entry.noValue || 100 - entry.yesValue),
        };
        const overPct = apiPercentFromPredictionValue(entry.yesValue);
        if (overPct !== null) {
          const underPct = Number.isFinite(entry.noValue)
            ? apiPercentFromPredictionValue(entry.noValue)
            : apiPercentFromPredictionValue(100 - entry.yesValue);
          bundle.ouProb = {
            over25: overPct,
            under25: underPct ?? Math.max(0, Math.min(100, 100 - overPct)),
          };
        }
      }
    });

  return bundle;
}

function extractFixtureExpectedGoals(expected, homeParticipant, awayParticipant) {
  const entries = asArray(expected);
  const values = {
    home: Number.NaN,
    away: Number.NaN,
  };

  entries.forEach((entry) => {
    const typeKey = normalizeLookupKey(entry?.type?.developer_name || entry?.type?.code || entry?.type_id);

    if (typeKey && !typeKey.includes("5304") && !typeKey.includes("expected_goals")) {
      return;
    }

    const location = resolveParticipantLocation(entry, homeParticipant, awayParticipant);
    const value = pickValueEntry(entry?.data || entry?.value || entry);

    if (location && Number.isFinite(value) && !Number.isFinite(values[location])) {
      values[location] = roundTo(value, 2);
    }
  });

  return {
    home: Number.isFinite(values.home) ? values.home : 0,
    away: Number.isFinite(values.away) ? values.away : 0,
  };
}

function getStateInfo(fixture = {}) {
  const state = fixture?.state || fixture;
  const rawState = normalizeLookupKey(
    state?.short_name ||
      state?.shortName ||
      state?.state ||
      state?.name ||
      state?.developer_name ||
      state?.result
  );

  if (
    !rawState ||
    rawState === "ns" ||
    rawState === "notstarted" ||
    rawState.includes("not_started") ||
    rawState.includes("upcoming")
  ) {
    return { name: "Pre-match", shortName: "PRE" };
  }

  if (rawState.includes("halftime") || rawState.includes("break")) {
    return { name: "Intervallo", shortName: "HT" };
  }

  if (rawState.includes("overtime") || rawState.includes("extra_time")) {
    return { name: "Supplementari", shortName: "ET" };
  }

  if (rawState.includes("penalt")) {
    return { name: "Rigori", shortName: "PEN" };
  }

  if (
    rawState === "ft" ||
    rawState.includes("finished") ||
    rawState.includes("closed") ||
    rawState.includes("ended") ||
    rawState.includes("ft")
  ) {
    return { name: "Terminata", shortName: "FT" };
  }

  if (rawState.includes("postponed")) {
    return { name: "Rinviata", shortName: "PPD" };
  }

  if (rawState.includes("cancelled")) {
    return { name: "Annullata", shortName: "CAN" };
  }

  return { name: "In corso", shortName: "LIVE" };
}

function normalizeScoreValue(scoreEntry) {
  if (!scoreEntry) {
    return Number.NaN;
  }

  if (typeof scoreEntry?.score === "number" || typeof scoreEntry?.score === "string") {
    return safeNumber(scoreEntry.score, Number.NaN);
  }

  if (typeof scoreEntry?.score === "object") {
    return safeNumber(
      scoreEntry.score?.goals ??
        scoreEntry.score?.current ??
        scoreEntry.score?.value ??
        scoreEntry.score?.participant,
      Number.NaN
    );
  }

  return safeNumber(
    scoreEntry?.goals ??
      scoreEntry?.participant_score ??
      scoreEntry?.result ??
      scoreEntry?.value,
    Number.NaN
  );
}

function pickScoreSet(scores, homeParticipant, awayParticipant) {
  const scoreEntries = asArray(scores);

  if (!scoreEntries.length) {
    return {
      home: 0,
      away: 0,
    };
  }

  const priorityGroups = [
    ["current", "live", "full_time", "ft", "regular_time"],
    ["half_time", "ht"],
  ];
  const preferredEntries =
    priorityGroups
      .map((group) =>
        scoreEntries.filter((entry) => {
          const typeKey = normalizeLookupKey(
            entry?.type?.developer_name || entry?.type?.code || entry?.type?.name || entry?.description
          );

          return group.some((keyword) => typeKey.includes(keyword));
        })
      )
      .find((group) => group.length > 0) || scoreEntries;
  const values = {
    home: 0,
    away: 0,
  };

  preferredEntries.forEach((entry) => {
    const location = resolveParticipantLocation(entry, homeParticipant, awayParticipant);
    const value = normalizeScoreValue(entry);

    if (location && Number.isFinite(value)) {
      values[location] = value;
    }
  });

  return values;
}

function buildTeamStats(statistics, homeParticipant, awayParticipant, expectedGoals = null) {
  const groupedStats = {
    home: {},
    away: {},
  };

  asArray(statistics).forEach((entry) => {
    const location = resolveParticipantLocation(entry, homeParticipant, awayParticipant);

    if (!location) {
      return;
    }

    const key = normalizeLookupKey(
      entry?.type?.developer_name || entry?.type?.code || entry?.type?.name || entry?.type_id
    );
    const value = pickValueEntry(entry?.data || entry?.value || entry);

    if (!Number.isFinite(value) || !key) {
      return;
    }

    groupedStats[location][key] = value;
  });

  const homeStats = groupedStats.home;
  const awayStats = groupedStats.away;
  const homeShots =
    safeNumber(homeStats.shots_total, Number.NaN) ||
    safeNumber(homeStats.total_shots, Number.NaN) ||
    safeNumber(homeStats.shots, Number.NaN) ||
    safeNumber(homeStats.shots_on_target) +
      safeNumber(homeStats.shots_off_target) +
      safeNumber(homeStats.shots_blocked);
  const awayShots =
    safeNumber(awayStats.shots_total, Number.NaN) ||
    safeNumber(awayStats.total_shots, Number.NaN) ||
    safeNumber(awayStats.shots, Number.NaN) ||
    safeNumber(awayStats.shots_on_target) +
      safeNumber(awayStats.shots_off_target) +
      safeNumber(awayStats.shots_blocked);

  return {
    shots: {
      home: roundTo(homeShots || 0, 0),
      away: roundTo(awayShots || 0, 0),
    },
    shotsOnTarget: {
      home: roundTo(safeNumber(homeStats.shots_on_target), 0),
      away: roundTo(safeNumber(awayStats.shots_on_target), 0),
    },
    corners: {
      home: roundTo(safeNumber(homeStats.corners || homeStats.corner_kicks), 0),
      away: roundTo(safeNumber(awayStats.corners || awayStats.corner_kicks), 0),
    },
    attacks: {
      home: roundTo(
        safeNumber(homeStats.attacks) ||
          safeNumber(homeStats.attacks_total) ||
          safeNumber(homeStats.possessiontime) * 0.8 +
            safeNumber(homeStats.shots_on_target) * 4 +
            safeNumber(homeStats.corners || homeStats.corner_kicks) * 3,
        0
      ),
      away: roundTo(
        safeNumber(awayStats.attacks) ||
          safeNumber(awayStats.attacks_total) ||
          safeNumber(awayStats.possessiontime) * 0.8 +
            safeNumber(awayStats.shots_on_target) * 4 +
            safeNumber(awayStats.corners || awayStats.corner_kicks) * 3,
        0
      ),
    },
    dangerousAttacks: {
      home: roundTo(
        safeNumber(homeStats.dangerous_attacks) ||
          safeNumber(homeStats.attacks_dangerous) ||
          safeNumber(homeStats.shots_on_target) * 3 +
            safeNumber(homeStats.corners || homeStats.corner_kicks) * 2,
        0
      ),
      away: roundTo(
        safeNumber(awayStats.dangerous_attacks) ||
          safeNumber(awayStats.attacks_dangerous) ||
          safeNumber(awayStats.shots_on_target) * 3 +
            safeNumber(awayStats.corners || awayStats.corner_kicks) * 2,
        0
      ),
    },
    possession: {
      home: roundTo(
        safeNumber(homeStats.ball_possession || homeStats.possessiontime, 50),
        0
      ),
      away: roundTo(
        safeNumber(awayStats.ball_possession || awayStats.possessiontime, 50),
        0
      ),
    },
    fouls: {
      home: roundTo(safeNumber(homeStats.fouls || homeStats.fouls_committed), 0),
      away: roundTo(safeNumber(awayStats.fouls || awayStats.fouls_committed), 0),
    },
    yellowCards: {
      home: roundTo(safeNumber(homeStats.yellow_cards), 0),
      away: roundTo(safeNumber(awayStats.yellow_cards), 0),
    },
    xgLive: {
      home: roundTo(
        safeNumber(homeStats.expected_goals) || safeNumber(expectedGoals?.home),
        2
      ),
      away: roundTo(
        safeNumber(awayStats.expected_goals) || safeNumber(expectedGoals?.away),
        2
      ),
    },
  };
}

function normalizeEventType(entry) {
  const typeKey = normalizeLookupKey(
    entry?.type?.developer_name || entry?.type?.code || entry?.type?.name || entry?.type_id
  );

  if (typeKey.includes("goal")) return "goal";
  if (typeKey.includes("yellow")) return "yellow";
  if (typeKey.includes("red")) return "red";
  if (typeKey.includes("substitution") || typeKey.includes("substituted")) return "substitution";
  if (
    typeKey.includes("shot") ||
    typeKey.includes("chance") ||
    typeKey.includes("danger") ||
    typeKey.includes("attack")
  ) {
    return "dangerous";
  }

  return null;
}

function normalizeSportmonksEvent(entry, homeParticipant, awayParticipant) {
  const type = normalizeEventType(entry);

  if (!type) {
    return null;
  }

  const minute = safeNumber(entry?.minute, safeNumber(entry?.result_info?.minute, 0));

  return {
    id: String(entry?.id || `${type}:${minute}:${entry?.participant_id || entry?.team_id || "0"}`),
    minute: minute + safeNumber(entry?.extra_minute, 0),
    type,
    typeLabel: EVENT_TYPE_LABELS[type],
    team: resolveParticipantLocation(entry, homeParticipant, awayParticipant) || "home",
    player:
      entry?.player_name ||
      entry?.player?.display_name ||
      entry?.player?.common_name ||
      entry?.player?.name ||
      null,
    relatedPlayer:
      entry?.related_player_name ||
      entry?.relatedPlayer?.display_name ||
      entry?.relatedPlayer?.common_name ||
      entry?.relatedPlayer?.name ||
      null,
    result:
      typeof entry?.result === "string" && entry.result.trim()
        ? entry.result
        : null,
    info:
      typeof entry?.info === "string" && entry.info.trim()
        ? entry.info
        : null,
  };
}

function buildDangerPackage(homeName, awayName, score, stats, minute) {
  const homePressure =
    stats.dangerousAttacks.home * 1.25 +
    stats.shotsOnTarget.home * 6 +
    stats.corners.home * 2 +
    (stats.possession.home - 50);
  const awayPressure =
    stats.dangerousAttacks.away * 1.25 +
    stats.shotsOnTarget.away * 6 +
    stats.corners.away * 2 +
    (stats.possession.away - 50);
  const dominantTeam = homePressure >= awayPressure ? homeName : awayName;
  const dominantPressure = Math.max(homePressure, awayPressure);
  const dangerIndex = Math.min(
    95,
    Math.max(
      18,
      Math.round(22 + dominantPressure * 0.75 + Math.max(score.home, score.away) * 6 + minute * 0.15)
    )
  );

  let dangerMessage =
    "Partita ancora sotto controllo, senza un accumulo forte di pressione offensiva.";

  if (dangerIndex >= 70) {
    dangerMessage = `Alta pressione offensiva di ${dominantTeam}. Possibile episodio pesante nei prossimi minuti.`;
  } else if (dangerIndex >= 50) {
    dangerMessage = `${dominantTeam} sta aumentando volume e qualita degli attacchi rispetto all'avversaria.`;
  } else if (dangerIndex >= 35) {
    dangerMessage = `Fase di studio con picchi sporadici: ${dominantTeam} ha comunque un leggero vantaggio territoriale.`;
  }

  return {
    dangerIndex,
    dangerMessage,
    dangerHistory: Array.from({ length: 8 }, (_, index) =>
      Math.max(12, dangerIndex - (7 - index) * 4)
    ),
  };
}

function buildLiveOdds(score, stats, minute) {
  const homePressure =
    stats.dangerousAttacks.home * 1.2 +
    stats.shotsOnTarget.home * 6 +
    (stats.possession.home - 50) * 0.4;
  const awayPressure =
    stats.dangerousAttacks.away * 1.2 +
    stats.shotsOnTarget.away * 6 +
    (stats.possession.away - 50) * 0.4;
  const scoreDelta = score.home - score.away;
  const drawProbability = Math.max(14, 34 - minute * 0.18 - Math.abs(scoreDelta) * 6);
  const homeProbability = Math.max(
    12,
    34 + scoreDelta * 14 + (homePressure - awayPressure) * 0.35
  );
  const awayProbability = Math.max(10, 100 - homeProbability - drawProbability);
  const normalized = ensureProbabilitySum({
    home: Math.round(homeProbability),
    draw: Math.round(drawProbability),
    away: Math.round(Math.max(10, awayProbability)),
  });
  const goalProbability = Math.max(
    12,
    Math.min(
      88,
      28 + (stats.xgLive.home + stats.xgLive.away) * 18 + Math.max(homePressure, awayPressure) * 0.18
    )
  );

  return {
    over25: probabilityToOdds(Math.min(84, goalProbability + 8)),
    goal: probabilityToOdds(goalProbability),
    homeWin: probabilityToOdds(normalized.home),
    draw: probabilityToOdds(normalized.draw),
    awayWin: probabilityToOdds(normalized.away),
    nextGoalHome: probabilityToOdds(Math.min(84, 28 + homePressure * 0.65)),
    nextGoalAway: probabilityToOdds(Math.min(84, 28 + awayPressure * 0.65)),
  };
}

function formatPositionLabel(position) {
  const normalizedPosition = normalizeLookupKey(position);

  if (normalizedPosition.includes("goal")) return "GK";
  if (normalizedPosition.includes("back") || normalizedPosition.includes("def")) return "DF";
  if (normalizedPosition.includes("mid")) return "CM";
  if (normalizedPosition.includes("wing")) return "WG";
  if (normalizedPosition.includes("forward") || normalizedPosition.includes("striker")) return "FW";
  return String(position || "--").toUpperCase().slice(0, 3);
}

function getLineupFormationRows(players) {
  const rowMap = new Map();

  players.forEach((player) => {
    const formationField = String(player?.formation_field || "").trim();
    const [rowRaw, columnRaw] = formationField.split(":");
    const row = safeNumber(rowRaw, Number.NaN);
    const column = safeNumber(columnRaw, Number.NaN);

    if (!Number.isFinite(row)) {
      return;
    }

    if (!rowMap.has(row)) {
      rowMap.set(row, []);
    }

    rowMap.get(row).push({
      ...player,
      __formationRow: row,
      __formationColumn: Number.isFinite(column) ? column : rowMap.get(row).length + 1,
    });
  });

  return Array.from(rowMap.entries())
    .sort((left, right) => left[0] - right[0])
    .map(([, rowPlayers]) =>
      rowPlayers.sort((left, right) => left.__formationColumn - right.__formationColumn)
    );
}

function deriveFormationFromRows(rows) {
  if (rows.length <= 1) {
    return rows[0]?.length ? "1" : "--";
  }

  return rows.slice(1).map((row) => row.length).join("-") || "--";
}

function createRenderedLineupPlayers(players, lineupStatus, formationOverride = "--") {
  const rows = getLineupFormationRows(players);
  const normalizedStatus = lineupStatus === "official" ? "confermato" : "probabile";

  if (!rows.length) {
    return {
      formation: formationOverride || "--",
      players: [],
    };
  }

  const totalRows = rows.length;
  const renderedPlayers = rows.flatMap((rowPlayers, rowIndex) => {
    const y =
      totalRows === 1 ? 50 : roundTo(14 + (rowIndex / (totalRows - 1)) * 72, 2);

    return rowPlayers.map((player, playerIndex) => ({
      id: String(player?.player_id || player?.id || `${player?.team_id || "team"}:${player?.jersey_number || playerIndex}`),
      name: player?.player_name || player?.player?.display_name || player?.player?.common_name || player?.player?.name || "Giocatore",
      media: buildMediaBundle(player?.player || player),
      number: safeNumber(player?.jersey_number, 0),
      position: formatPositionLabel(
        player?.detailedposition?.code ||
          player?.position?.name ||
          player?.player_position ||
          player?.type?.name
      ),
      x: roundTo(((playerIndex + 1) / (rowPlayers.length + 1)) * 100, 2),
      y,
      status: normalizedStatus,
    }));
  });

  const derivedFormation = deriveFormationFromRows(rows);

  return {
    formation: derivedFormation === "--" ? formationOverride || "--" : derivedFormation,
    players: renderedPlayers,
  };
}

function countPlayerEvents(events, playerName, eventType) {
  const normalizedPlayerName = normalizeName(playerName);

  return asArray(events).filter(
    (event) =>
      event.type === eventType &&
      normalizeName(event.player) === normalizedPlayerName
  ).length;
}

function getPlayerFormLabel(player) {
  if (safeNumber(player?.xg) >= 0.8) return "Eccellente";
  if (safeNumber(player?.xg) >= 0.45) return "Ottima";
  if (safeNumber(player?.shots) >= 2) return "Buona";
  return "Stabile";
}

function buildPlayerFormHistory(player) {
  const base = Math.max(0, Math.round(safeNumber(player?.xg) * 2));

  return Array.from({ length: 5 }, (_, index) =>
    Math.max(0, base - (4 - index > 1 ? 1 : 0))
  );
}

function buildPlayerInsight(player) {
  if (safeNumber(player?.xg) >= 0.8) {
    return `${player.name} arriva spesso in zone ad alto valore e resta il profilo offensivo piu pericoloso del match.`;
  }

  if (safeNumber(player?.shots) >= 3) {
    return `${player.name} mantiene buon volume di tiro e puo generare valore anche senza quote marcatore bookmaker.`;
  }

  return `${player.name} e incluso nel feed Sportmonks corrente, ma il profilo resta descrittivo finche non arriva il layer odds dedicato.`;
}

function buildLineupPlayerProfiles(lineups, renderedLineups, normalizedEvents, homeName, awayName) {
  const players = asArray(lineups)
    .filter((lineupEntry) => lineupEntry?.formation_position || lineupEntry?.formation_field)
    .map((lineupEntry) => {
      const expectedEntry =
        asArray(lineupEntry?.expected).find((entry) => {
          const typeKey = normalizeLookupKey(
            entry?.type?.developer_name || entry?.type?.code || entry?.type_id
          );

          return typeKey.includes("5304") || typeKey.includes("expected_goals");
        }) || null;
      const detailEntries = asArray(lineupEntry?.details);
      const readDetailValue = (keywords = []) => {
        const match = detailEntries.find((detailEntry) => {
          const key = normalizeLookupKey(
            detailEntry?.type?.developer_name || detailEntry?.type?.code || detailEntry?.type?.name || detailEntry?.type_id
          );

          return keywords.some((keyword) => key.includes(keyword));
        });

        return pickValueEntry(match?.value ?? match?.data ?? match);
      };
      const xg = roundTo(
        pickValueEntry(expectedEntry?.data || expectedEntry) ||
          readDetailValue(["expected_goals", "5304"]),
        2
      );
      const shots = roundTo(
        readDetailValue(["shots_total", "shots", "shots_on_target"]) ||
          Math.max(0, Math.round(xg * 2.5)),
        0
      );
      const name =
        lineupEntry?.player_name ||
        lineupEntry?.player?.display_name ||
        lineupEntry?.player?.common_name ||
        lineupEntry?.player?.name ||
        "Giocatore";
      const team =
        renderedLineups.home.players.some(
          (player) => String(player.id) === String(lineupEntry?.player_id || lineupEntry?.id)
        )
          ? homeName
          : awayName;
      const goals =
        roundTo(readDetailValue(["goals"])) ||
        countPlayerEvents(normalizedEvents, name, "goal");
      const assists = roundTo(readDetailValue(["assists"]));
      const fouls = roundTo(readDetailValue(["fouls"]));
      const minutes = roundTo(readDetailValue(["minutes_played", "minutes"])) || 90;
      const scorerProb = Math.min(
        78,
        Math.max(6, Math.round(10 + xg * 28 + shots * 3 + goals * 4))
      );

      return {
        id: String(lineupEntry?.player_id || lineupEntry?.id || `${name}:${lineupEntry?.team_id || "team"}`),
        name,
        media: buildMediaBundle(lineupEntry?.player || lineupEntry),
        number: safeNumber(lineupEntry?.jersey_number, 0),
        team,
        pos: formatPositionLabel(
          lineupEntry?.detailedposition?.code ||
            lineupEntry?.position?.name ||
            lineupEntry?.player_position ||
            lineupEntry?.type?.name
        ),
        position:
          lineupEntry?.detailedposition?.name ||
          lineupEntry?.position?.name ||
          lineupEntry?.player_position ||
          lineupEntry?.type?.name ||
          "--",
        xg: xg || 0,
        shots: shots || 0,
        form: getPlayerFormLabel({ xg, shots }),
        goals: goals || 0,
        assists: assists || 0,
        fouls: fouls || 0,
        minutes: minutes || 0,
        formHistory: buildPlayerFormHistory({ xg }),
        insight: buildPlayerInsight({ name, xg, shots }),
        scorerOdds: probabilityToOdds(scorerProb),
        scorerProb,
      };
    });

  return players.sort(
    (left, right) =>
      right.xg - left.xg || right.shots - left.shots || right.scorerProb - left.scorerProb
  );
}

function buildImpactPlayers(playerProfiles = []) {
  return [...playerProfiles]
    .slice(0, 5)
    .map((player) => ({
      name: player.name,
      media: player.media || buildMediaBundle(null),
      odds: player.scorerOdds,
      prob: player.scorerProb,
      xg: player.xg,
    }));
}

function buildMetadata(fixture, coverage, stateInfo) {
  return [
    {
      id: "round",
      code: "round",
      label: "Round",
      value:
        fixture?.round?.name ||
        (fixture?.round?.round ? `Round ${fixture.round.round}` : null),
    },
    {
      id: "season",
      code: "season",
      label: "Stagione",
      value: fixture?.season?.name || null,
    },
    {
      id: "coverage",
      code: "coverage",
      label: "Coverage",
      value: coverage.coverageScore >= 5 ? "Rich feed" : "Core feed",
    },
    {
      id: "status",
      code: "status",
      label: "Status feed",
      value: stateInfo.name,
    },
  ].filter((entry) => entry.value);
}

function buildCoverageSummary(fixture) {
  const lineups = asArray(fixture?.lineups);
  const statistics = asArray(fixture?.statistics);
  const events = asArray(fixture?.events);
  const predictions = asArray(fixture?.predictions);
  const expected = asArray(fixture?.expected);
  const pressure = asArray(fixture?.pressure);
  const referees = asArray(fixture?.referees);
  const coaches = asArray(fixture?.coaches);
  const odds = asArray(fixture?.odds);
  const standings = asArray(fixture?.standings);
  const formations = asArray(fixture?.formations);

  return {
    hasLineups: lineups.length > 0,
    hasFormations:
      lineups.some((entry) => entry?.formation_field || entry?.formation_position) ||
      formations.some((entry) => String(entry?.formation || "").trim()),
    hasVenue: Boolean(fixture?.venue?.name),
    hasBasicTeamStats: statistics.length > 0,
    hasBasicPlayerStats: lineups.some((entry) => asArray(entry?.details).length > 0),
    hasEvents: events.length > 0,
    hasPredictions: predictions.length > 0,
    hasExpectedGoals: expected.length > 0,
    hasPressureIndex: pressure.length > 0,
    hasPreMatchOdds: odds.length > 0,
    hasReferees: referees.length > 0,
    hasCoaches: coaches.length > 0,
    hasStandings: standings.length > 0,
    coverageScore: [
      lineups.length > 0,
      statistics.length > 0,
      events.length > 0,
      Boolean(fixture?.venue?.name),
      predictions.length > 0,
      expected.length > 0,
      pressure.length > 0,
      odds.length > 0,
      referees.length > 0,
      coaches.length > 0,
      standings.length > 0,
    ].filter(Boolean).length,
  };
}

function getCompetitionInfo(fixture) {
  return {
    league: fixture?.league?.name || fixture?.name || "Sportmonks",
    country:
      fixture?.league?.country?.name ||
      fixture?.league?.country_name ||
      fixture?.country?.name ||
      null,
    round:
      fixture?.round?.name ||
      (fixture?.round?.round ? `Round ${fixture.round.round}` : null),
    season: fixture?.season?.name || null,
  };
}

function getVenueInfo(fixture) {
  return {
    name: fixture?.venue?.name || null,
    city: fixture?.venue?.city_name || fixture?.venue?.city || null,
  };
}

function buildBadges(stateInfo, coverage, predictionProvider) {
  const badges = ["Feed Sportmonks"];

  if (coverage.hasPredictions) {
    badges.push("Predizioni provider");
  } else if (predictionProvider === "derived_internal_model") {
    badges.push("Modello derivato");
  }

  if (coverage.hasExpectedGoals) {
    badges.push("xG disponibile");
  }

  if (coverage.hasPressureIndex) {
    badges.push("Pressure Index");
  }

  if (coverage.hasPreMatchOdds) {
    badges.push("Odds pre-match");
  }

  if (stateInfo.shortName === "LIVE") {
    badges.push("Live");
  }

  return badges;
}

function buildCompetitionIds(fixture, homeParticipant, awayParticipant) {
  return {
    sportmonks_fixture_id: String(fixture?.id || ""),
    sportmonks_league_id: fixture?.league?.id || null,
    sportmonks_season_id: fixture?.season?.id || null,
    sportmonks_home_participant_id: homeParticipant?.id || null,
    sportmonks_away_participant_id: awayParticipant?.id || null,
  };
}

function normalizeCoreSportmonksFixture(fixture = {}) {
  const participants = asArray(fixture?.participants);
  const { home: homeParticipant, away: awayParticipant } = getParticipantsByLocation(participants);
  const kickoff = formatKickoff(fixture?.starting_at || fixture?.startingAt || fixture?.starting_at_timestamp);
  const stateInfo = getStateInfo(fixture);
  const predictionBundle = extractPredictionBundle(
    fixture?.predictions,
    homeParticipant,
    awayParticipant
  );
  const expectedGoals = extractFixtureExpectedGoals(
    fixture?.expected,
    homeParticipant,
    awayParticipant
  );
  const homeForm = buildFormArray(
    homeParticipant?.form ||
      homeParticipant?.meta?.form ||
      homeParticipant?.last_5 ||
      homeParticipant?.recent_form
  );
  const awayForm = buildFormArray(
    awayParticipant?.form ||
      awayParticipant?.meta?.form ||
      awayParticipant?.last_5 ||
      awayParticipant?.recent_form
  );
  const probabilities =
    predictionBundle.probabilities ||
    buildDerivedProbabilities(
      {
        home: expectedGoals.home || 1.1,
        away: expectedGoals.away || 1.05,
      },
      homeForm,
      awayForm
    );
  const derivedXg =
    expectedGoals.home > 0 || expectedGoals.away > 0
      ? expectedGoals
      : buildExpectedGoalsFromProbabilities(probabilities);
  const markets = buildGoalMarkets(derivedXg);
  const coverage = buildCoverageSummary(fixture);
  const scores = pickScoreSet(fixture?.scores, homeParticipant, awayParticipant);
  const predictionProvider = coverage.hasPredictions ? "sportmonks_predictions" : "derived_internal_model";
  const oddsBundle = extractOddsBundle(fixture?.odds);
  const valueMarkets = buildOneXTwoValueMarkets(probabilities, oddsBundle.oneXTwoBest);
  const formationOverrides = getFormationOverrides(
    fixture?.formations,
    homeParticipant,
    awayParticipant
  );
  const lineupStatus = buildLineupStatus(fixture, fixture?.lineups, formationOverrides);
  const confidenceBundle = buildConfidence({
    probabilities,
    coverage,
    lineupStatus,
    valueEdge: valueMarkets.primary?.edge ?? null,
    apiConfidence: predictionBundle.confidence,
    hasPredictedScores: predictionBundle.scores.length > 0,
  });

  return {
    fixtureId: String(fixture?.id || ""),
    homeParticipant,
    awayParticipant,
    kickoff,
    stateInfo,
    probabilities,
    derivedXg,
    markets: {
      ou: oddsBundle.ou.over25 > 0 ? oddsBundle.ou : predictionBundle.ou || markets.ou,
      gg: oddsBundle.gg.goal > 0 ? oddsBundle.gg : predictionBundle.gg || markets.gg,
    },
    /** Percentuali O/U e GG coerenti con le quote del modello derivato (`buildGoalMarkets`). */
    derivedMarketProbabilities: {
      ou: markets.ouProbDerived,
      gg: markets.ggProbDerived,
    },
    predictedScores: predictionBundle.scores.length
      ? predictionBundle.scores
      : buildLikelyScores(probabilities, derivedXg),
    coverage,
    scores,
    homeForm,
    awayForm,
    confidence: confidenceBundle.score,
    confidenceSource: confidenceBundle.source,
    reliabilityScore: confidenceBundle.reliabilityScore,
    lineupStatus,
    predictionProvider,
    info: getCompetitionInfo(fixture),
    venue: getVenueInfo(fixture),
    providerIds: buildCompetitionIds(fixture, homeParticipant, awayParticipant),
    subscription: asArray(fixture?.subscription || fixture?.subscriptions),
    metadata: getFixtureMetadataEntries(fixture),
    oddsBundle,
    valueMarkets,
    /** Probabilità O/U e GG ricavate dalle predizioni API (yes/no), quando presenti. */
    predictionMarketProbabilities: {
      ou: predictionBundle.ouProb || null,
      gg: predictionBundle.ggProb || null,
    },
  };
}

function impliedPercentFromDecimalOdd(decimal) {
  if (!Number.isFinite(decimal) || decimal <= 1) {
    return null;
  }
  return Math.round(Math.min(99, Math.max(1, 100 / decimal)));
}

function impliedOuGgFromDisplayDecimals(ouMarkets, ggMarkets) {
  const ouImplied = {
    over25: impliedPercentFromDecimalOdd(ouMarkets?.over25),
    under25: impliedPercentFromDecimalOdd(ouMarkets?.under25),
  };
  const ggImplied = {
    goal: impliedPercentFromDecimalOdd(ggMarkets?.goal),
    noGoal: impliedPercentFromDecimalOdd(ggMarkets?.noGoal),
  };
  return {
    ou: ouImplied.over25 !== null || ouImplied.under25 !== null ? ouImplied : null,
    gg: ggImplied.goal !== null || ggImplied.noGoal !== null ? ggImplied : null,
  };
}

function resolveScheduleOuGgProbabilities(core) {
  const ouFromBookmaker = core.oddsBundle.ou.over25 > 0;
  const ggFromBookmaker = core.oddsBundle.gg.goal > 0;
  const implied = impliedOuGgFromDisplayDecimals(core.markets.ou, core.markets.gg);

  let ouProb;
  if (ouFromBookmaker) {
    ouProb = implied.ou;
  } else if (core.predictionMarketProbabilities?.ou) {
    ouProb = core.predictionMarketProbabilities.ou;
  } else {
    ouProb = core.derivedMarketProbabilities?.ou || implied.ou;
  }

  let ggProb;
  if (ggFromBookmaker) {
    ggProb = implied.gg;
  } else if (core.predictionMarketProbabilities?.gg) {
    ggProb = core.predictionMarketProbabilities.gg;
  } else {
    ggProb = core.derivedMarketProbabilities?.gg || implied.gg;
  }

  return { ouProb, ggProb };
}

/**
 * Indice di pressione / lettura tattica **prevista** (pre-match) per istogramma cliente:
 * combina probabilità 1X2, xG derivati e mercati O/U · GG senza richiedere serie storiche `pressure` API.
 */
function buildPrematchPressurePreview(core, ouProb, ggProb) {
  const ph = safeNumber(core.probabilities?.home, 33);
  const pa = safeNumber(core.probabilities?.away, 33);
  const xgh = safeNumber(core.derivedXg?.home, 1.15);
  const xga = safeNumber(core.derivedXg?.away, 1.1);
  const over = safeNumber(ouProb?.over25, 50);
  const under = safeNumber(ouProb?.under25, 50);
  const goalPct = safeNumber(ggProb?.goal, 55);
  const noGoalPct = Number.isFinite(ggProb?.noGoal)
    ? safeNumber(ggProb.noGoal, Math.max(0, 100 - goalPct))
    : Math.max(0, 100 - goalPct);
  const sumXg = xgh + xga;

  const homeAtk = Math.min(100, Math.max(0, Math.round(ph * 0.82 + (xgh / 2.85) * 38)));
  const awayAtk = Math.min(100, Math.max(0, Math.round(pa * 0.82 + (xga / 2.85) * 38)));
  const underTilt = Math.min(
    100,
    Math.max(0, Math.round(under + (sumXg < 2.55 ? 14 : 4) - over * 0.22))
  );
  const noGoalTilt = Math.min(
    100,
    Math.max(0, Math.round(noGoalPct + (sumXg < 2.25 ? 10 : 0)))
  );

  let narrative =
    "Preview sintetica: probabilità modello, xG attesi e mercati O/U / GG-NG (pre-match).";
  if (homeAtk >= 62 && underTilt >= 55 && over <= 52) {
    narrative =
      "Casa molto spinta nei numeri ma tensione verso Under/No Goal: coerente con attacco alto e conversione non altrettanto proiettata.";
  } else if (awayAtk >= 62 && underTilt >= 55 && over <= 52) {
    narrative =
      "Ospite spinto nei numeri con segnale Under/No Goal: utile per value difensivi se le quote book lo premiano.";
  } else if (over >= 58) {
    narrative = "Proiezione offensiva alta sul modello: mercati Over / Goal restano centrali.";
  }

  return {
    bars: [
      { key: "home_atk", label: "Attacco casa", value: homeAtk },
      { key: "away_atk", label: "Attacco ospite", value: awayAtk },
      { key: "under", label: "Pressione Under", value: underTilt },
      { key: "no_goal", label: "No Goal", value: noGoalTilt },
    ],
    narrative,
  };
}

function normalizeScheduleLikeFixture(fixture = {}) {
  const core = normalizeCoreSportmonksFixture(fixture);
  const valueMarkets = core.valueMarkets;

  const { ouProb, ggProb } = resolveScheduleOuGgProbabilities(core);
  const derivedFallbackValueBet = buildDerivedValueBet(core.probabilities, core.derivedXg);

  const { modelOddsOu: rawModelOddsOu, modelOddsGg: rawModelOddsGg } = buildModelOddsOuGgFromScheduleProbs(
    ouProb ?? {},
    ggProb ?? {}
  );
  const modelOddsOu = ouProb != null ? rawModelOddsOu : null;
  const modelOddsGg = ggProb != null ? rawModelOddsGg : null;

  const bestCross = resolveBestCrossMarketValueBet({
    valueMarkets,
    marketsOu: core.markets.ou,
    marketsGg: core.markets.gg,
    ouProb,
    ggProb,
    modelOddsOu: ouProb != null ? rawModelOddsOu : null,
    modelOddsGg: ggProb != null ? rawModelOddsGg : null,
  });

  const valueBet = bestCross
    ? {
        type: bestCross.type,
        edge: bestCross.edge,
        market: bestCross.market,
        modelOdd: bestCross.modelOdd,
        bookOdd: bestCross.bookOdd,
      }
    : derivedFallbackValueBet || null;
  const valueSource = bestCross ? "sportmonks_feed_math" : valueBet ? "fallback_derivato" : "none";
  const pressurePreview = buildPrematchPressurePreview(core, ouProb, ggProb);

  const mergedPrimary =
    bestCross != null
      ? {
          type: bestCross.type,
          edge: bestCross.edge,
          market: bestCross.market,
          odds: bestCross.bookOdd,
        }
      : valueMarkets.primary;
  const valueMarketsMerged = {
    ...valueMarkets,
    primary: mergedPrimary,
  };

  return {
    id: core.fixtureId,
    sportEventId: core.fixtureId,
    home: core.homeParticipant?.name || "Home",
    homeShort: formatShortCode(core.homeParticipant),
    away: core.awayParticipant?.name || "Away",
    awayShort: formatShortCode(core.awayParticipant),
    league: core.info.league,
    leagueShort: formatShortCode({ name: core.info.league }),
    country: core.info.country,
    round: core.info.round,
    date: core.kickoff.date,
    time: core.kickoff.time,
    /** ISO 8601 per filtri data/tab (Europe/Rome coerente col provider). */
    kickoff_at: (() => {
      const p = parseDate(fixture?.starting_at || fixture?.startingAt || fixture?.starting_at_timestamp);
      return p ? p.toISOString() : null;
    })(),
    status: getRelativeStatus(fixture?.starting_at || fixture?.startingAt),
    state: core.stateInfo,
    coverage: core.coverage,
    prob: core.probabilities,
    odds:
      core.oddsBundle.available
        ? core.oddsBundle.odds
        : {
            home: probabilityToOdds(core.probabilities.home),
            draw: probabilityToOdds(core.probabilities.draw),
            away: probabilityToOdds(core.probabilities.away),
          },
    ou: core.markets.ou,
    gg: core.markets.gg,
    ouProb,
    ggProb,
    xg: core.derivedXg,
    valueBet,
    valueBetSource: valueSource,
    valueMarkets: valueMarketsMerged,
    modelOdds: valueMarketsMerged.modelOdds,
    modelOddsOu,
    modelOddsGg,
    scores: core.predictedScores,
    confidence: core.confidence,
    confidence_source: core.confidenceSource,
    reliability_score: core.reliabilityScore,
    scorers: [],
    bookmakers: core.oddsBundle.bookmakers,
    homeForm: core.homeForm,
    awayForm: core.awayForm,
    h2h: [],
    badges: buildBadges(core.stateInfo, core.coverage, core.predictionProvider),
    injuries: [],
    venue: core.venue,
    prediction_provider: core.predictionProvider,
    odds_provider: core.oddsBundle.available ? "sportmonks_pre_match_odds" : "not_available_with_current_feed",
    provider_ids: core.providerIds,
    bestOdds: core.oddsBundle.bestOdds,
    bestBookmaker: core.oddsBundle.bestBookmaker,
    movement: core.oddsBundle.movement,
    currentScore:
      core.stateInfo.shortName !== "PRE" && (core.scores.home || core.scores.away)
        ? core.scores
        : null,
    home_media: buildMediaBundle(core.homeParticipant),
    away_media: buildMediaBundle(core.awayParticipant),
    league_media: buildMediaBundle(fixture?.league),
    pressure_preview: pressurePreview,
    apiLoaded: true,
  };
}

export function normalizeSportmonksScheduleMatch(fixture = {}) {
  const normalizedFixture = normalizeScheduleLikeFixture(fixture);

  return {
    id: normalizedFixture.id,
    sportEventId: normalizedFixture.sportEventId,
    home: normalizedFixture.home,
    homeShort: normalizedFixture.homeShort,
    away: normalizedFixture.away,
    awayShort: normalizedFixture.awayShort,
    league: normalizedFixture.league,
    date: normalizedFixture.date,
    time: normalizedFixture.time,
    kickoff_at: normalizedFixture.kickoff_at,
    status: normalizedFixture.status,
    state: normalizedFixture.state,
    coverage: normalizedFixture.coverage,
    competition: normalizedFixture.competition || null,
    prob: normalizedFixture.prob,
    odds: normalizedFixture.odds,
    ou: normalizedFixture.ou,
    gg: normalizedFixture.gg,
    ouProb: normalizedFixture.ouProb,
    ggProb: normalizedFixture.ggProb,
    xg: normalizedFixture.xg,
    valueBet: normalizedFixture.valueBet,
    valueBetSource: normalizedFixture.valueBetSource,
    valueMarkets: normalizedFixture.valueMarkets
      ? {
          primary: normalizedFixture.valueMarkets.primary || null,
          modelOdds: normalizedFixture.valueMarkets.modelOdds || null,
        }
      : null,
    modelOdds: normalizedFixture.modelOdds,
    modelOddsOu: normalizedFixture.modelOddsOu,
    modelOddsGg: normalizedFixture.modelOddsGg,
    scores: normalizedFixture.scores,
    confidence: normalizedFixture.confidence,
    confidence_source: normalizedFixture.confidence_source,
    reliability_score: normalizedFixture.reliability_score,
    badges: normalizedFixture.badges,
    prediction_provider: normalizedFixture.prediction_provider,
    odds_provider: normalizedFixture.odds_provider,
    provider_ids: normalizedFixture.provider_ids,
    home_media: normalizedFixture.home_media,
    away_media: normalizedFixture.away_media,
    league_media: normalizedFixture.league_media,
    apiLoaded: true,
  };
}

export function normalizeSportmonksFixture(fixture = {}) {
  const core = normalizeCoreSportmonksFixture(fixture);
  const normalizedEvents = asArray(fixture?.events)
    .map((entry) => normalizeSportmonksEvent(entry, core.homeParticipant, core.awayParticipant))
    .filter(Boolean)
    .slice(-12);
  const lineups = asArray(fixture?.lineups);
  const formationOverrides = getFormationOverrides(
    fixture?.formations,
    core.homeParticipant,
    core.awayParticipant
  );
  const lineupStatus = buildLineupStatus(fixture, lineups, formationOverrides);
  const renderedLineups = {
    home: createRenderedLineupPlayers(
      lineups.filter(
        (entry) =>
          resolveLineupTeamLocation(
            entry,
            core.homeParticipant,
            core.awayParticipant,
            fixture?.formations
          ) === "home"
      ),
      lineupStatus,
      formationOverrides.home
    ),
    away: createRenderedLineupPlayers(
      lineups.filter(
        (entry) =>
          resolveLineupTeamLocation(
            entry,
            core.homeParticipant,
            core.awayParticipant,
            fixture?.formations
          ) === "away"
      ),
      lineupStatus,
      formationOverrides.away
    ),
    raw: lineups,
  };
  const lineupPlayerProfiles = buildLineupPlayerProfiles(
    lineups,
    renderedLineups,
    normalizedEvents,
    core.homeParticipant?.name || "Home",
    core.awayParticipant?.name || "Away"
  );
  const squadPlayers = {
    home: normalizeSquadPlayers(fixture?.teamSquads?.home, core.homeParticipant?.name || "Home"),
    away: normalizeSquadPlayers(fixture?.teamSquads?.away, core.awayParticipant?.name || "Away"),
  };
  const playerProfiles = lineupPlayerProfiles.length
    ? lineupPlayerProfiles
    : [...squadPlayers.home, ...squadPlayers.away];
  const coachAssignments = buildCoachAssignments(
    fixture?.coaches,
    core.homeParticipant,
    core.awayParticipant
  );
  const referees = normalizeOfficials(fixture?.referees);
  const standings = normalizeStandingsTable(
    fixture?.standings,
    fixture?.stage?.id || fixture?.stage_id,
    core.homeParticipant,
    core.awayParticipant
  );

  return {
    ...normalizeScheduleLikeFixture(fixture),
    state: core.stateInfo,
    currentScore:
      core.stateInfo.shortName !== "PRE" ||
      core.scores.home > 0 ||
      core.scores.away > 0
        ? core.scores
        : null,
    events: normalizedEvents,
    lineups: {
      home: renderedLineups.home,
      away: renderedLineups.away,
    },
    formations: formationOverrides,
    squads: squadPlayers,
    players: playerProfiles,
    scorers: buildImpactPlayers(playerProfiles),
    coaches: coachAssignments,
    referees,
    standings,
    metadata: buildMetadata(fixture, core.coverage, core.stateInfo),
    lineup_status: lineupStatus,
    lineupConfirmed: lineupStatus === "official",
    bestOdds: core.oddsBundle.bestOdds,
    bestBookmaker: core.oddsBundle.bestBookmaker,
    movement: core.oddsBundle.movement,
  };
}

function getLiveMinute(fixture, events = []) {
  const state = fixture?.state || {};
  const minuteValue =
    safeNumber(state?.minute, Number.NaN) ||
    safeNumber(state?.time?.minute, Number.NaN) ||
    safeNumber(fixture?.minute, Number.NaN);

  if (Number.isFinite(minuteValue)) {
    return minuteValue + safeNumber(state?.extra_minute, 0);
  }

  const eventMinutes = events.map((event) => safeNumber(event.minute, 0));
  return eventMinutes.length ? Math.max(...eventMinutes) : 0;
}

export function normalizeSportmonksLiveMatch(fixture = {}) {
  const core = normalizeCoreSportmonksFixture(fixture);
  const normalizedEvents = asArray(fixture?.events)
    .map((entry) => normalizeSportmonksEvent(entry, core.homeParticipant, core.awayParticipant))
    .filter(Boolean)
    .slice(-8);
  const stats = buildTeamStats(
    fixture?.statistics,
    core.homeParticipant,
    core.awayParticipant,
    core.derivedXg
  );
  const minute = getLiveMinute(fixture, normalizedEvents);
  const danger = buildDangerPackage(
    core.homeParticipant?.name || "Home",
    core.awayParticipant?.name || "Away",
    core.scores,
    stats,
    minute
  );
  const liveProbabilities = core.predictionProvider === "sportmonks_predictions" ? core.probabilities : null;
  const lineups = asArray(fixture?.lineups);
  const formationOverrides = getFormationOverrides(
    fixture?.formations,
    core.homeParticipant,
    core.awayParticipant
  );
  const lineupStatus = buildLineupStatus(fixture, lineups, formationOverrides);

  return {
    id: core.fixtureId,
    sportEventId: core.fixtureId,
    home: core.homeParticipant?.name || "Home",
    homeShort: formatShortCode(core.homeParticipant),
    away: core.awayParticipant?.name || "Away",
    awayShort: formatShortCode(core.awayParticipant),
    homeScore: core.scores.home,
    awayScore: core.scores.away,
    minute,
    league: core.info.league,
    country: core.info.country,
    round: core.info.round,
    state: core.stateInfo.name,
    coverage: core.coverage,
    stats,
    liveOdds: buildLiveOdds(core.scores, stats, minute),
    liveProbabilities,
    dangerIndex: danger.dangerIndex,
    dangerMessage: danger.dangerMessage,
    dangerHistory: danger.dangerHistory,
    events: normalizedEvents,
    lineup_status: lineupStatus,
    lineupConfirmed: lineupStatus === "official",
    provider_ids: core.providerIds,
    home_media: buildMediaBundle(core.homeParticipant),
    away_media: buildMediaBundle(core.awayParticipant),
    league_media: buildMediaBundle(fixture?.league),
    apiLoaded: true,
  };
}

export function mergeSportmonksLiveMatches(previousMatches = [], updatedMatches = []) {
  const mergedMap = new Map(
    asArray(previousMatches).map((match) => [String(match?.id || ""), match])
  );

  asArray(updatedMatches).forEach((match) => {
    mergedMap.set(String(match?.id || ""), match);
  });

  return Array.from(mergedMap.values());
}

export async function fetchSportmonksScheduleWindow(
  days = SPORTMONKS_DEFAULT_SCHEDULE_DAYS,
  telemetry = {}
) {
  const safeDays = clampInteger(days, SPORTMONKS_DEFAULT_SCHEDULE_DAYS, 1, 7);
  /** Quante pagine scaricare al massimo (50 fixture/pagina). Prima era fisso a 10 → solo 500 match: molte leghe potevano mancare. */
  const scheduleMaxPages = clampInteger(process.env.SPORTMONKS_SCHEDULE_MAX_PAGES, 80, 1, 200);
  const fromDate = new Date();
  const toDate = new Date();
  toDate.setDate(toDate.getDate() + Math.max(0, safeDays - 1));
  const from = buildDateKey(fromDate);
  const to = buildDateKey(toDate);
  const leagueFilters = getSportmonksFixtureLeaguesFilterParam();
  const response = await requestSportmonksCollection(`fixtures/between/${from}/${to}`, {
    include: SPORTMONKS_SCHEDULE_PREMATCH_INCLUDES,
    timezone: ROME_TIMEZONE,
    /** Documentazione Sportmonks: per_page massimo 50 su questo endpoint. */
    perPage: 50,
    filters: leagueFilters || undefined,
    maxPages: scheduleMaxPages,
    telemetry: {
      route: telemetry.route || "/api/football/schedules/window",
      requestPurpose: telemetry.requestPurpose || "schedule_window",
      days: safeDays,
      fixtureId: null,
      dtoTarget: telemetry.dtoTarget || "ScheduleCardDTO",
      dtoVersion: telemetry.dtoVersion || "v1",
    },
  });

  return {
    window: {
      from,
      to,
      days: safeDays,
    },
    fixtures: asArray(response?.data),
    raw: response,
    scheduleLeagueFilter: leagueFilters || null,
    schedulePagination: response?.collectionPagination ?? null,
  };
}

/**
 * Quote pre-match dal feed dedicato Sportmonks (non solo include su `fixtures`).
 * @see https://api.sportmonks.com/v3/football/odds/pre-match/fixtures/{fixtureId}
 */
async function fetchSportmonksPrematchOddsForFixture(fixtureId) {
  const id = String(fixtureId || "").trim();
  if (!id) {
    return [];
  }

  try {
    const response = await requestSportmonksCollection(`odds/pre-match/fixtures/${encodeURIComponent(id)}`, {
      include: ["bookmaker"],
      perPage: 100,
    });
    return asArray(response?.data);
  } catch {
    return [];
  }
}

/**
 * Se `fixtures/{id}` non espone odds 1X2 utili, integra la risposta di `odds/pre-match/fixtures/{id}`.
 */
async function mergePrematchOddsIntoFixture(fixture) {
  if (!fixture?.id) {
    return fixture;
  }

  const existing = asArray(fixture.odds);
  const bundle = extractOddsBundle(existing);
  if (bundle.available && bundle.bookmakers.length > 0) {
    return fixture;
  }

  const extra = await fetchSportmonksPrematchOddsForFixture(String(fixture.id));
  if (!extra.length) {
    return fixture;
  }

  return { ...fixture, odds: [...existing, ...extra] };
}

export async function fetchSportmonksFixtureCoreById(fixtureId, telemetry = {}) {
  const normalizedFixtureId = String(fixtureId || "").trim();

  if (!normalizedFixtureId) {
    throw new Error("fixtureId non valido.");
  }

  const response = await requestSportmonksWithIncludeFallback(
    `fixtures/${encodeURIComponent(normalizedFixtureId)}`,
    SPORTMONKS_FIXTURE_CORE_INCLUDE_ATTEMPTS,
    {
      timezone: ROME_TIMEZONE,
      perPage: null,
      includeScope: "detail_core",
      telemetry: {
        route: telemetry.route || "/api/football/fixtures/[fixtureId]",
        requestPurpose: telemetry.requestPurpose || "fixture_detail_core",
        days: null,
        fixtureId: normalizedFixtureId,
        dtoTarget: telemetry.dtoTarget || "MatchDetailCoreDTO",
        dtoVersion: telemetry.dtoVersion || "v1",
      },
    }
  );

  const raw = response?.data || null;
  if (!raw) {
    return null;
  }

  return mergePrematchOddsIntoFixture(raw);
}

export async function fetchSportmonksFixtureEnrichmentById(fixtureId, telemetry = {}) {
  const normalizedFixtureId = String(fixtureId || "").trim();

  if (!normalizedFixtureId) {
    return null;
  }

  const payload = await requestSportmonksJson(`fixtures/${encodeURIComponent(normalizedFixtureId)}`, {
    include: SPORTMONKS_FIXTURE_ENRICHMENT_INCLUDES,
    timezone: ROME_TIMEZONE,
    perPage: null,
    telemetry: {
      route: telemetry.route || "/api/football/fixtures/[fixtureId]",
      requestPurpose: telemetry.requestPurpose || "fixture_detail_enrichment",
      days: null,
      fixtureId: normalizedFixtureId,
      dtoTarget: telemetry.dtoTarget || "MatchDetailEnrichedDTO",
      dtoVersion: telemetry.dtoVersion || "v1",
      fallbackTriggered: false,
      retryCount: 0,
    },
  });

  return payload?.data || null;
}

export async function fetchSportmonksFixtureById(fixtureId, telemetry = {}) {
  const core = await fetchSportmonksFixtureCoreById(fixtureId, telemetry);
  let enrichment = null;
  try {
    enrichment = await fetchSportmonksFixtureEnrichmentById(fixtureId, {
      ...telemetry,
      requestPurpose: "fixture_detail_enrichment",
      dtoTarget: "MatchDetailEnrichedDTO",
    });
  } catch {
    enrichment = null;
  }
  return enrichment ? { ...core, ...enrichment } : core;
}

export async function fetchSportmonksSeasonStandings(seasonId, telemetry = {}) {
  const normalizedSeasonId = String(seasonId || "").trim();

  if (!normalizedSeasonId) {
    return [];
  }

  const response = await requestSportmonksCollection(
    `standings/seasons/${encodeURIComponent(normalizedSeasonId)}`,
    {
      include: ["participant", "details", "form", "league", "season", "stage", "group", "round"],
      perPage: 100,
      telemetry: {
        route: telemetry.route || "/api/football/fixtures/[fixtureId]",
        requestPurpose: telemetry.requestPurpose || "fixture_detail_standings",
        days: null,
        fixtureId: telemetry.fixtureId ?? null,
        dtoTarget: telemetry.dtoTarget || "MatchDetailEnrichedDTO",
        dtoVersion: telemetry.dtoVersion || "v1",
      },
    }
  );

  return asArray(response?.data);
}

export async function fetchSportmonksTeamSquad(teamId, telemetry = {}) {
  const normalizedTeamId = String(teamId || "").trim();

  if (!normalizedTeamId) {
    return [];
  }

  const response = await requestSportmonksCollection(
    `squads/teams/${encodeURIComponent(normalizedTeamId)}`,
    {
      include: ["player", "position", "detailedPosition"],
      perPage: 100,
      telemetry: {
        route: telemetry.route || "/api/football/fixtures/[fixtureId]",
        requestPurpose: telemetry.requestPurpose || "fixture_detail_squad",
        days: null,
        fixtureId: telemetry.fixtureId ?? null,
        dtoTarget: telemetry.dtoTarget || "MatchDetailEnrichedDTO",
        dtoVersion: telemetry.dtoVersion || "v1",
      },
    }
  );

  return asArray(response?.data);
}

export async function fetchSportmonksLivescoresInplay() {
  const response = await requestSportmonksWithIncludeFallback(
    "livescores/inplay",
    SPORTMONKS_LIVE_INCLUDE_ATTEMPTS,
    {
      expectCollection: true,
      timezone: ROME_TIMEZONE,
      perPage: 100,
    }
  );

  return {
    fixtures: asArray(response?.data),
    raw: response,
  };
}

export async function fetchSportmonksLivescoresLatest() {
  const response = await requestSportmonksWithIncludeFallback(
    "livescores/latest",
    SPORTMONKS_LIVE_INCLUDE_ATTEMPTS,
    {
      expectCollection: true,
      timezone: ROME_TIMEZONE,
      perPage: 100,
    }
  );

  return {
    fixtures: asArray(response?.data),
    raw: response,
  };
}

export function getSportmonksProviderReadiness() {
  const configured = Boolean(getSportmonksApiToken({ silent: true }));
  const scheduleLeagueFilter = Boolean(getSportmonksFixtureLeaguesFilterParam());

  return {
    provider: SPORTMONKS_PROVIDER_ID,
    configured,
    ready: configured,
    baseUrl: getSportmonksFootballBaseUrl(),
    hasLive: configured,
    hasPredictions: configured,
    hasExpectedGoals: configured,
    hasLineups: configured,
    scheduleLeagueFilter,
    note: configured
      ? `Provider Sportmonks configurato come fonte primaria del feed calcio.${scheduleLeagueFilter ? " Allowlist campionati prodotto applicata su fixtures/between (override possibile via SPORTMONKS_SCHEDULE_LEAGUE_IDS)." : " Calendario globale esplicito richiesto via SPORTMONKS_SCHEDULE_LEAGUE_IDS=all."}`
      : "Provider non configurato.",
  };
}
