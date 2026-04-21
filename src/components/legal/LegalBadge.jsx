import { Badge } from "@/components/ui/badge";

const toneMap = {
  active: "bg-primary/20 text-primary border-primary/40",
  review: "bg-accent/20 text-accent border-accent/40",
  draft: "bg-secondary text-muted-foreground border-border/50",
  major: "bg-primary/20 text-primary border-primary/40",
  minor: "bg-secondary text-foreground border-border/50",
};

export default function LegalBadge({ children, tone = "draft", className = "" }) {
  return (
    <Badge variant="outline" className={`${toneMap[tone] || toneMap.draft} ${className}`}>
      {children}
    </Badge>
  );
}
