import { NextResponse } from "next/server";

import { SPORTMONKS_PROVIDER_ID } from "@/lib/providers/sportmonks";

export const runtime = "nodejs";

/**
 * Futures/outrights non sono ancora esposti via Sportmonks in questo endpoint.
 * Placeholder finche gli outrights non sono esposti da Sportmonks; la UI riceve liste vuote coerenti.
 */
export async function GET() {
  return NextResponse.json({
    competitions: [],
    selectedCompetition: null,
    markets: [],
    provider: SPORTMONKS_PROVIDER_ID,
    source: "not_implemented",
    isFallback: false,
    notice:
      "Futures/outrights: da integrare con Sportmonks. Il precedente feed e stato dismesso.",
  });
}
