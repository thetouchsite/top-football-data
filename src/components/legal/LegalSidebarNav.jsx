import { Link } from "@/lib/router-compat";

export default function LegalSidebarNav({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <aside className="sticky top-28 hidden h-fit rounded-xl border border-border/40 bg-secondary/10 p-3 lg:block">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Indice</p>
      <nav className="space-y-1">
        {items.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
