import { SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG } from "@/lib/sportmonks-priority-league-ids";

const DEFAULT_PROVIDER_IDS = {
  sportmonks: [],
};

const COMPETITION_CATALOG = [
  {
    id: "serie-a",
    name: "Serie A",
    tier: "top",
    keywords: ["serie a", "italy serie a"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG["serie-a"]] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "premier-league",
    name: "Premier League",
    tier: "top",
    keywords: ["premier league", "england premier league"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG["premier-league"]] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "la-liga",
    name: "La Liga",
    tier: "top",
    keywords: ["la liga", "laliga", "spain primera division"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG["la-liga"]] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    tier: "top",
    keywords: ["bundesliga", "germany bundesliga"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG.bundesliga] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "ligue-1",
    name: "Ligue 1",
    tier: "top",
    keywords: ["ligue 1", "france ligue 1"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG["ligue-1"]] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "scottish-premiership",
    name: "Scottish Premiership",
    tier: "step2",
    keywords: ["scottish premiership", "scotland premiership", "premiership scotland"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "superliga-denmark",
    name: "Superliga (Danimarca)",
    tier: "step2",
    keywords: ["danish superliga", "denmark superliga", "3f superliga"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "championship",
    name: "Championship",
    tier: "step2",
    keywords: ["championship", "efl championship"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG.championship] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "primeira-liga",
    name: "Primeira Liga",
    tier: "step2",
    keywords: ["primeira liga", "liga portugal", "portugal primeira liga"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG["primeira-liga"]] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "serie-b",
    name: "Serie B",
    tier: "italia-pro",
    keywords: ["serie b", "italy serie b"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG["serie-b"]] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "champions-league",
    name: "Champions League",
    tier: "uefa",
    keywords: ["champions league", "uefa champions league"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG["champions-league"]] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "europa-league",
    name: "Europa League",
    tier: "uefa",
    keywords: ["europa league", "uefa europa league"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG["europa-league"]] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "conference-league",
    name: "Conference League",
    tier: "uefa",
    keywords: ["conference league", "uefa europa conference league"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG["conference-league"]] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "brasileirao",
    name: "Brasileirao",
    tier: "sudamerica",
    keywords: ["brasileirao", "serie a brazil", "brazil serie a"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG.brasileirao] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "liga-profesional",
    name: "Liga Profesional Argentina",
    tier: "sudamerica",
    keywords: ["liga profesional", "argentina primera division"],
    providerIds: { sportmonks: [SPORTMONKS_OFFICIAL_LEAGUE_ID_BY_SLUG["liga-profesional"]] },
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "world-cup",
    name: "Mondiali",
    tier: "national-teams",
    keywords: ["world cup", "fifa world cup", "mondiali"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "european-championship",
    name: "Europei",
    tier: "national-teams",
    keywords: ["european championship", "uefa european championship", "europei"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "nations-league",
    name: "Nations League",
    tier: "national-teams",
    keywords: ["nations league", "uefa nations league"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "eredivisie",
    name: "Eredivisie",
    tier: "step2",
    keywords: ["eredivisie", "netherlands eredivisie", "holland eredivisie"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "super-lig",
    name: "Süper Lig",
    tier: "step2",
    keywords: ["super lig", "turkiye super lig", "turkish super lig"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "jupiler-pro-league",
    name: "Jupiler Pro League",
    tier: "step2",
    keywords: ["jupiler pro league", "belgian first division", "belgium pro league"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "austrian-bundesliga",
    name: "Austrian Bundesliga",
    tier: "step2",
    keywords: ["austrian bundesliga", "austria bundesliga"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "swiss-super-league",
    name: "Swiss Super League",
    tier: "step2",
    keywords: ["swiss super league", "switzerland super league"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "ekstraklasa",
    name: "Ekstraklasa",
    tier: "step2",
    keywords: ["ekstraklasa", "poland ekstraklasa"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "liga-1-romania",
    name: "Liga I (Romania)",
    tier: "step2",
    keywords: ["liga 1 romania", "romanian liga 1", "superliga romania"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "mls",
    name: "MLS",
    tier: "step2",
    keywords: ["major league soccer", "mls usa"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "eliteserien",
    name: "Eliteserien",
    tier: "step2",
    keywords: ["eliteserien", "norway eliteserien"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "allsvenskan",
    name: "Allsvenskan",
    tier: "step2",
    keywords: ["allsvenskan", "sweden allsvenskan"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "superliga-greece",
    name: "Super League Grecia",
    tier: "step2",
    keywords: ["super league greece", "greece super league"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
];

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toCompetitionMeta(config) {
  if (!config) {
    return {
      id: "unsupported",
      name: "Competizione non supportata",
      tier: "unsupported",
      providerIds: DEFAULT_PROVIDER_IDS,
      isLiveEnabled: false,
      isPredictionsEnabled: false,
      isOddsEnabled: false,
    };
  }

  return {
    id: config.id,
    name: config.name,
    tier: config.tier,
    providerIds: config.providerIds,
    isLiveEnabled: config.isLiveEnabled,
    isPredictionsEnabled: config.isPredictionsEnabled,
    isOddsEnabled: config.isOddsEnabled,
  };
}

export function getCompetitionConfig(value) {
  const normalizedValue = normalizeText(value);

  if (!normalizedValue) {
    return toCompetitionMeta(null);
  }

  const config =
    COMPETITION_CATALOG.find((entry) => entry.id === normalizedValue) ||
    COMPETITION_CATALOG.find((entry) =>
      entry.keywords.some((keyword) => normalizedValue.includes(keyword))
    ) ||
    null;

  if (!config) {
    return {
      ...toCompetitionMeta(null),
      id: `unsupported:${normalizedValue.replace(/[^a-z0-9]+/g, "-")}`,
      name: value || "Competizione non supportata",
    };
  }

  return toCompetitionMeta(config);
}

export function isSupportedCompetition(value) {
  return getCompetitionConfig(value).tier !== "unsupported";
}

export function filterSupportedMatches(matches = []) {
  return Array.isArray(matches) ? matches : [];
}

export function collectCompetitionSummaries(matches = []) {
  const seen = new Set();
  const summaries = [];

  matches.forEach((match) => {
    const competition = getCompetitionConfig(match?.competition?.name || match?.league);

    if (!competition?.id || seen.has(competition.id)) {
      return;
    }

    seen.add(competition.id);
    summaries.push(competition);
  });

  return summaries;
}

export function getSupportedCompetitionOptions() {
  return COMPETITION_CATALOG.map((competition) => ({
    id: competition.id,
    name: competition.name,
    tier: competition.tier,
  }));
}

export { COMPETITION_CATALOG };
