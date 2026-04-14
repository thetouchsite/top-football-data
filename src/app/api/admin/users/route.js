import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/mongodb";
import { requireAdminRequest } from "@/lib/auth-session";

export const runtime = "nodejs";

export async function GET() {
  try {
    const adminSession = await requireAdminRequest();

    if (adminSession === null) {
      return NextResponse.json(
        { error: "Autenticazione richiesta." },
        { status: 401 }
      );
    }

    if (adminSession === false) {
      return NextResponse.json(
        { error: "Permessi admin richiesti." },
        { status: 403 }
      );
    }

    const db = await getDatabase();

    const users = await db
      .collection("users")
      .find(
        {},
        {
          projection: {
            id: 1,
            name: 1,
            email: 1,
            role: 1,
            plan: 1,
            isPremium: 1,
            emailVerified: 1,
            banned: 1,
            createdAt: 1,
            updatedAt: 1,
            currentPeriodEnd: 1,
          },
        }
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      users,
    });
  } catch (error) {
    console.error("Failed to list admin users:", error);

    return NextResponse.json(
      {
        error: error.message || "Impossibile recuperare gli utenti.",
      },
      { status: 500 }
    );
  }
}
