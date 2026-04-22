/**
 * Product league policy (source of truth):
 * - official allowlist for shared schedule feed
 * - business priority ordering
 * - stable mapping slug -> Sportmonks league id
 */
export const SPORTMONKS_OFFICIAL_LEAGUE_POLICY = [
  { slug: "serie-a", name: "Serie A", sportmonksLeagueId: 384, priority: 1 },
  { slug: "premier-league", name: "Premier League", sportmonksLeagueId: 8, priority: 2 },
  { slug: "la-liga", name: "La Liga", sportmonksLeagueId: 564, priority: 3 },
  { slug: "bundesliga", name: "Bundesliga", sportmonksLeagueId: 82, priority: 4 },
  { slug: "ligue-1", name: "Ligue 1", sportmonksLeagueId: 301, priority: 5 },
  { slug: "champions-league", name: "UEFA Champions League", sportmonksLeagueId: 2, priority: 6 },
  { slug: "europa-league", name: "UEFA Europa League", sportmonksLeagueId: 5, priority: 7 },
  { slug: "conference-league", name: "UEFA Conference League", sportmonksLeagueId: 2286, priority: 8 },
  { slug: "serie-b", name: "Serie B", sportmonksLeagueId: 387, priority: 9 },
  { slug: "championship", name: "Championship", sportmonksLeagueId: 9, priority: 10 },
  { slug: "primeira-liga", name: "Primeira Liga", sportmonksLeagueId: 462, priority: 11 },
  { slug: "brasileirao", name: "Brasileirao", sportmonksLeagueId: 648, priority: 12 },
  {
    slug: "liga-profesional",
    name: "Liga Profesional Argentina",
    sportmonksLeagueId: 636,
    priority: 13,
  },
];

export const SPORTMONKS_OFFICIAL_ALLOWLIST_LEAGUE_IDS = SPORTMONKS_OFFICIAL_LEAGUE_POLICY.map(
  (entry) => entry.sportmonksLeagueId
);

/**
 * Alias kept for existing ordering logic.
 */
export const SPORTMONKS_PRIORITY_LEAGUE_IDS = [...SPORTMONKS_OFFICIAL_ALLOWLIST_LEAGUE_IDS];

export const SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG = Object.freeze(
  SPORTMONKS_OFFICIAL_LEAGUE_POLICY.reduce((acc, entry) => {
    acc[entry.slug] = entry.sportmonksLeagueId;
    return acc;
  }, {})
);
