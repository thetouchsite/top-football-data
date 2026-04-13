const DEFAULT_PROVIDER_IDS = {
  sportradar: [],
  sportmonks: [],
  oddsmatrix: [],
};

const COMPETITION_CATALOG = [
  {
    id: "serie-a",
    name: "Serie A",
    tier: "top",
    keywords: ["serie a", "italy serie a"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "premier-league",
    name: "Premier League",
    tier: "top",
    keywords: ["premier league", "england premier league"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "la-liga",
    name: "La Liga",
    tier: "top",
    keywords: ["la liga", "laliga", "spain primera division"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "bundesliga",
    name: "Bundesliga",
    tier: "top",
    keywords: ["bundesliga", "germany bundesliga"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "ligue-1",
    name: "Ligue 1",
    tier: "top",
    keywords: ["ligue 1", "france ligue 1"],
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
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "primeira-liga",
    name: "Primeira Liga",
    tier: "step2",
    keywords: ["primeira liga", "liga portugal", "portugal primeira liga"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "serie-b",
    name: "Serie B",
    tier: "italia-pro",
    keywords: ["serie b", "italy serie b"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "champions-league",
    name: "Champions League",
    tier: "uefa",
    keywords: ["champions league", "uefa champions league"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "europa-league",
    name: "Europa League",
    tier: "uefa",
    keywords: ["europa league", "uefa europa league"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "conference-league",
    name: "Conference League",
    tier: "uefa",
    keywords: ["conference league", "uefa europa conference league"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "brasileirao",
    name: "Brasileirao",
    tier: "sudamerica",
    keywords: ["brasileirao", "serie a brazil", "brazil serie a"],
    providerIds: DEFAULT_PROVIDER_IDS,
    isLiveEnabled: true,
    isPredictionsEnabled: true,
    isOddsEnabled: false,
  },
  {
    id: "liga-profesional",
    name: "Liga Profesional Argentina",
    tier: "sudamerica",
    keywords: ["liga profesional", "argentina primera division"],
    providerIds: DEFAULT_PROVIDER_IDS,
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
