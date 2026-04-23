"use client";

import { Suspense } from "react";
import MultiBet from "@/screens/MultiBet";

function MultiBetFallback() {
  return (
    <div className="app-page">
      <div className="app-content p-8 text-sm text-muted-foreground">Caricamento multi-bet…</div>
    </div>
  );
}

export default function MultiBetPage() {
  return (
    <Suspense fallback={<MultiBetFallback />}>
      <MultiBet />
    </Suspense>
  );
}
