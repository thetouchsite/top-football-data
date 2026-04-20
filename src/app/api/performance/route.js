import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

function serializeDocument(doc) {
  return {
    ...doc,
    _id: String(doc._id),
    settledAt: doc.settledAt ? new Date(doc.settledAt).toISOString() : null,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
  };
}

export async function GET() {
  try {
    const db = await getDatabase();
    const [summary = null] = await db
      .collection("betPerformance")
      .aggregate([
        {
          $group: {
            _id: null,
            settled: { $sum: 1 },
            won: { $sum: { $cond: [{ $eq: ["$status", "won"] }, 1, 0] } },
            lost: { $sum: { $cond: [{ $eq: ["$status", "lost"] }, 1, 0] } },
            void: { $sum: { $cond: [{ $eq: ["$status", "void"] }, 1, 0] } },
            stakeUnits: { $sum: "$stakeUnits" },
            profitUnits: { $sum: "$profitUnits" },
          },
        },
        {
          $project: {
            _id: 0,
            settled: 1,
            won: 1,
            lost: 1,
            void: 1,
            stakeUnits: 1,
            profitUnits: { $round: ["$profitUnits", 2] },
            roiPercent: {
              $cond: [
                { $gt: ["$stakeUnits", 0] },
                { $round: [{ $multiply: [{ $divide: ["$profitUnits", "$stakeUnits"] }, 100] }, 2] },
                0,
              ],
            },
            hitRatePercent: {
              $cond: [
                { $gt: [{ $add: ["$won", "$lost"] }, 0] },
                {
                  $round: [
                    { $multiply: [{ $divide: ["$won", { $add: ["$won", "$lost"] }] }, 100] },
                    2,
                  ],
                },
                0,
              ],
            },
          },
        },
      ])
      .toArray();

    const recent = await db
      .collection("betPerformance")
      .find({})
      .sort({ settledAt: -1 })
      .limit(20)
      .toArray();

    return NextResponse.json({
      ok: true,
      summary: summary || {
        settled: 0,
        won: 0,
        lost: 0,
        void: 0,
        stakeUnits: 0,
        profitUnits: 0,
        roiPercent: 0,
        hitRatePercent: 0,
      },
      recent: recent.map(serializeDocument),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        summary: null,
        recent: [],
        error: error.message || "Impossibile caricare la performance.",
      },
      { status: 500 }
    );
  }
}
