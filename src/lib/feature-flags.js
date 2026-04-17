/**
 * Feature flags (`NEXT_PUBLIC_*` sono iniettati al build; su Vercel serve redeploy dopo cambio env).
 * Dati Live: `NEXT_PUBLIC_FEATURE_DATI_LIVE=true` per nav, fetch livescore e route `/dati-live`.
 */
export function isDatiLiveFeatureEnabled() {
  return process.env.NEXT_PUBLIC_FEATURE_DATI_LIVE === "true";
}
