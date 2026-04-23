/**
 * Client API — alert persistiti in Mongo (worker Railway / Telegram).
 */

function buildQueryString(params) {
  const s = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v == null || v === "") {
      return;
    }
    s.set(k, String(v));
  });
  const q = s.toString();
  return q ? `?${q}` : "";
}

/**
 * @param {object} [options]
 * @param {number} [options.limit=20]
 * @param {string} [options.status] — es. pending
 * @param {string} [options.type] — single | multibet
 * @param {string} [options.fixtureId] — partite che contengono questo fixture
 */
export async function getAlerts(options = {}) {
  const limit = options.limit ?? 20;
  const { status, type, fixtureId } = options;
  const response = await fetch(
    `/api/alerts${buildQueryString({ limit, status, type, fixtureId })}`,
    { cache: "no-store" }
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Alert non disponibili.");
  }
  return {
    ok: Boolean(payload.ok),
    alerts: Array.isArray(payload.alerts) ? payload.alerts : [],
  };
}
