import { NextResponse } from "next/server";

import { getEnrichedServerSession } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const enriched = await getEnrichedServerSession();

    return NextResponse.json(enriched);
  } catch (error) {
    console.error("Failed to resolve account session:", error);

    return NextResponse.json(
      {
        error: error.message || "Impossibile recuperare la sessione account.",
      },
      { status: 500 }
    );
  }
}
