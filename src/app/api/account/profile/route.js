import { NextResponse } from "next/server";

import { requireAuthenticatedRequest } from "@/lib/auth-session";
import { saveUserProfile } from "@/lib/account-store";

export const runtime = "nodejs";

export async function PATCH(request) {
  const enriched = await requireAuthenticatedRequest();

  if (!enriched) {
    return NextResponse.json(
      {
        error: "Autenticazione richiesta.",
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const account = await saveUserProfile({
      userId: enriched.session.user.id,
      email: enriched.session.user.email,
      displayName: body?.displayName,
    });

    return NextResponse.json({ ok: true, account });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Impossibile aggiornare il profilo account.",
      },
      { status: 400 }
    );
  }
}
