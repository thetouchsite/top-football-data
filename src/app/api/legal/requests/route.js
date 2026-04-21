import { NextResponse } from "next/server";
import { z } from "zod";
import { getDatabase } from "@/lib/mongodb";

export const runtime = "nodejs";

const legalRequestSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  requestType: z.enum(["access", "delete", "rectify", "portability", "cookie", "other"]),
  message: z.string().trim().min(10),
  consent: z.boolean().refine((value) => value === true),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = legalRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Dati richiesta non validi." }, { status: 400 });
    }

    const db = await getDatabase();
    await db.collection("legal_requests").insertOne({
      ...parsed.data,
      source: "legal-contact-form",
      status: "new",
      createdAt: new Date(),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to save legal request:", error);
    return NextResponse.json(
      {
        error: "Servizio richieste privacy temporaneamente non disponibile.",
      },
      { status: 500 }
    );
  }
}
