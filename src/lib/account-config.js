export const ACCOUNT_NOTIFICATION_SETTINGS = {
  valueBet: true,
  liveAlert: true,
  formazioni: true,
  combo: false,
};

export const ACCOUNT_NOTIFICATION_OPTIONS = [
  {
    key: "valueBet",
    label: "Value Bet rilevate",
    desc: "Alert quando viene identificato un valore",
  },
  {
    key: "liveAlert",
    label: "Alert Live",
    desc: "Notifiche per alta pressione e eventi importanti",
  },
  {
    key: "formazioni",
    label: "Formazioni confermate",
    desc: "Avviso quando escono le formazioni ufficiali",
  },
  {
    key: "combo",
    label: "Nuove combo premium",
    desc: "Notifica per nuove multiple algoritmiche",
  },
];

export const DEFAULT_PREFERRED_COMPETITIONS = [
  "Serie A",
  "Champions League",
];

export const EMPTY_WATCHLIST = {
  matches: [],
  teams: [],
  players: [],
};

export const EMPTY_FOLLOWING = {
  matches: [],
  teams: [],
  players: [],
  competitions: [],
};

export function createDefaultAccountState({
  userId = "",
  email = "",
  displayName = "",
} = {}) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const resolvedName =
    String(displayName || normalizedEmail || "Utente").trim() || "Utente";

  return {
    profile: {
      userId: String(userId || ""),
      email: normalizedEmail || null,
      displayName: resolvedName,
    },
    preferences: {
      notifications: { ...ACCOUNT_NOTIFICATION_SETTINGS },
      preferredCompetitions: [...DEFAULT_PREFERRED_COMPETITIONS],
    },
    watchlist: {
      ...EMPTY_WATCHLIST,
    },
    following: {
      ...EMPTY_FOLLOWING,
    },
    meta: {
      userId: String(userId || ""),
      email: normalizedEmail || null,
      settingsUpdatedAt: null,
      watchlistUpdatedAt: null,
      followingUpdatedAt: null,
      authProviders: [],
      primaryAuthProvider: null,
    },
  };
}
