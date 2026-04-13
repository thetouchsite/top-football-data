export const ODDSMATRIX_PROVIDER_ID = "oddsmatrix";

export function getOddsmatrixProviderReadiness() {
  const configured = Boolean(
    process.env.ODDSMATRIX_API_KEY ||
      (process.env.ODDSMATRIX_USERNAME && process.env.ODDSMATRIX_PASSWORD)
  );

  return {
    provider: ODDSMATRIX_PROVIDER_ID,
    configured,
    ready: false,
    baseUrl: process.env.ODDSMATRIX_BASE_URL || null,
    note: configured
      ? "Provider predisposto ma non ancora integrato nei percorsi core."
      : "Provider non configurato.",
  };
}
