import { legalChangelogEntries, legalDocuments, legalProcessors } from "@/content/legal";

export function getAllLegalDocuments() {
  return [...legalDocuments].sort((a, b) => a.title.localeCompare(b.title));
}

export function getLegalDocumentBySlug(slug) {
  return legalDocuments.find((doc) => doc.slug === slug) || null;
}

export function searchLegalDocuments(query) {
  const term = String(query || "")
    .trim()
    .toLowerCase();

  if (!term) {
    return getAllLegalDocuments();
  }

  return getAllLegalDocuments().filter((doc) => {
    const haystack = [
      doc.title,
      doc.summary,
      doc.slug,
      ...(doc.tags || []),
      ...(doc.sections || []).map((section) => section.heading),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

export function getLatestLegalUpdate() {
  return getAllLegalDocuments().reduce((latest, current) => {
    if (!latest) {
      return current;
    }
    return new Date(current.updatedAt) > new Date(latest.updatedAt) ? current : latest;
  }, null);
}

export function getLegalQuickLinks() {
  return [
    { label: "Panoramica documenti", href: "/legal#documents" },
    { label: "Gestisci cookie", href: "/legal/cookies#preferences" },
    { label: "Richieste privacy", href: "/legal/contact" },
    { label: "Policy Telegram Bot", href: "/legal/telegram-bot" },
    { label: "Changelog legale", href: "/legal/changelog" },
  ];
}

export function getLegalProcessors() {
  return legalProcessors;
}

export function getLegalChangelog() {
  return [...legalChangelogEntries].sort((a, b) => new Date(b.date) - new Date(a.date));
}
