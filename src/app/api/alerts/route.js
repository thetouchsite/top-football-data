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
    const fixtureId = searchParams.get("fixtureId");
    const query = {};

    if (status) {
      query.status = status;
    }

    if (type) {
      query.type = type;
    }

    if (fixtureId) {
      const raw = String(fixtureId).trim();
      const asNum = Number.parseInt(raw, 10);
      const candidates = [raw];
      if (Number.isFinite(asNum) && String(asNum) === raw) {
        candidates.push(asNum);
      }
      query.fixtureIds = { $in: candidates };
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
