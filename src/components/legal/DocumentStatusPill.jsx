import LegalBadge from "@/components/legal/LegalBadge";

const statusLabel = {
  active: "Documento attivo",
  review: "Da validare",
  draft: "Bozza",
};

export default function DocumentStatusPill({ status = "draft" }) {
  return <LegalBadge tone={status}>{statusLabel[status] || statusLabel.draft}</LegalBadge>;
}
