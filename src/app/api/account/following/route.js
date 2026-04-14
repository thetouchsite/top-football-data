import { NextResponse } from "next/server";

import { requireAuthenticatedRequest } from "@/lib/auth-session";
import { saveUserFollowing } from "@/lib/account-store";

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
    const account = await saveUserFollowing({
      userId: enriched.session.user.id,
      email: enriched.session.user.email,
      name: enriched.account?.profile?.displayName || enriched.session.user.name,
      following: body?.following,
    });

    return NextResponse.json({ ok: true, account });
  } catch (error) {
    return NextResponse.json(
      {
        error: error.message || "Impossibile aggiornare gli elementi seguiti.",
      },
      { status: 400 }
    );
  }
}
