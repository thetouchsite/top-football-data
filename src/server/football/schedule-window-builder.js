import { sortMatchesByFeaturedPriority } from "@/lib/football-filters";
import {
  fetchSportmonksScheduleWindow,
  normalizeSportmonksScheduleMatch,
  SPORTMONKS_DEFAULT_SCHEDULE_DAYS,
} from "@/lib/providers/sportmonks";
import { buildSchedulePayload, buildSportmonksPlanNotice, compactScheduleRawPayload } from "./payloads";

/**
 * Single path that calls Sportmonks, normalizes, and builds the same public list payload
 * the API returns for GET /api/football/schedules/window (no cache layers).
 * Used by runtime, stale-if-error, and prewarm.
 *
 * @param {number} days
 * @param {Object} [telemetry] forwarded to the provider
 * @returns {Promise<{
 *   publicPayload: object,
 *   updatedAt: number,
 *   notice: string,
 *   pagesFetched: number | null
 * }>}
 */
export async function buildScheduleWindowFromProvider(
  days = SPORTMONKS_DEFAULT_SCHEDULE_DAYS,
  telemetry = {}
) {
  const startedAt = Date.now();
  const safeDays = Number.isFinite(days) ? days : SPORTMONKS_DEFAULT_SCHEDULE_DAYS;
  const rawSchedules = await fetchSportmonksScheduleWindow(safeDays, {
    route: "/api/football/schedules/window",
    requestPurpose: "schedule_window",
    dtoTarget: "ScheduleCardDTO",
    dtoVersion: "v2",
    ...telemetry,
  });
  const normalizedMatches = sortMatchesByFeaturedPriority(
    rawSchedules.fixtures.map(normalizeSportmonksScheduleMatch)
  );
  const scheduleFilterHint = rawSchedules?.scheduleLeagueFilter
    ? " Calendario ristretto dal filtro API leghe (SPORTMONKS_SCHEDULE_LEAGUE_FILTER_STRICT)."
    : "";
  const pag = rawSchedules?.schedulePagination;
  const paginationHint =
    pag?.truncated && pag.totalPages != null && pag.pagesFetched != null
      ? ` Risposta fixtures/between troncata: scaricate ${pag.pagesFetched}/${pag.totalPages} pagine (max configurabile: SPORTMONKS_SCHEDULE_MAX_PAGES). Alcune competizioni possono mancare.`
      : "";
  const updatedAt = Date.now();
  const notice = `${buildSportmonksPlanNotice(rawSchedules, normalizedMatches) || ""}${scheduleFilterHint}${paginationHint}`.trim();
  const publicPayload = buildSchedulePayload({
    matches: normalizedMatches,
    window: rawSchedules.window,
    rawSchedules: compactScheduleRawPayload(rawSchedules),
    source: "sportmonks_api",
    notice,
    updatedAt,
  });

  return {
    publicPayload,
    updatedAt,
    notice,
    pagesFetched: rawSchedules?.schedulePagination?.pagesFetched ?? null,
    normalizeMs: Date.now() - startedAt,
  };
}
