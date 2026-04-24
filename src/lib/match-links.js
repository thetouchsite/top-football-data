export function buildMatchHref(fixtureId, snapshotVersion) {
  const id = encodeURIComponent(String(fixtureId || "").trim());
  if (!id) {
    return "/match";
  }
  const sv = String(snapshotVersion || "").trim();
  if (!sv) {
    return `/match/${id}`;
  }
  return `/match/${id}?sv=${encodeURIComponent(sv)}`;
}

export function buildMatchHrefFromMatch(match) {
  return buildMatchHref(match?.id, match?.snapshotVersion);
}
