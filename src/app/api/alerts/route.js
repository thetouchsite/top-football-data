import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

function serializeDocument(doc) {
  return {
    ...doc,
    _id: String(doc._id),
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    settledAt: doc.settledAt ? new Date(doc.settledAt).toISOString() : null,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number.parseInt(searchParams.get("limit") || "20", 10), 1), 100);
    const status = searchParams.get("status");
    const type = searchParams.get("type");
    const query = {};

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    const db = await getDatabase();
    const alerts = await db
      .collection("betAlerts")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      ok: true,
      alerts: alerts.map(serializeDocument),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        alerts: [],
        error: error.message || "Impossibile caricare gli alert.",
      },
      { status: 500 }
    );
  }
}
