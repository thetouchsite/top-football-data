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

    const settled = await db
      .collection("betPerformance")
      .find({})
      .sort({ settledAt: 1 })
      .limit(300)
      .toArray();

    let runningProfit = 0;
    let runningStake = 0;
    const equityCurve = settled.map((item) => {
      runningProfit += Number(item.profitUnits || 0);
      runningStake += Number(item.stakeUnits || 0);
      return {
        alertKey: item.alertKey,
        settledAt: item.settledAt ? new Date(item.settledAt).toISOString() : null,
        profitUnits: Number(runningProfit.toFixed(2)),
        roiPercent: runningStake > 0 ? Number(((runningProfit / runningStake) * 100).toFixed(2)) : 0,
      };
    });

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
      equityCurve,
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
