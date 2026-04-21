import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

const leadSchema = z.object({
  nome: z.string().trim().min(2),
  email: z.string().trim().email(),
  eta: z.string().trim().optional(),
  telefono: z.string().trim().optional(),
  source: z.string().trim().optional(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const result = leadSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Dati lead non validi.",
        },
        { status: 400 }
      );
    }

    const db = await getDatabase();

    await db.collection("leads").insertOne({
      ...result.data,
      source: result.data.source || "landing-manuale",
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save lead:", error);

    return NextResponse.json(
      {
        error: "Server o MongoDB non configurato correttamente.",
      },
      { status: 500 }
    );
  }
}
