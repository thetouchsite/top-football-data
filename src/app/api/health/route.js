import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    runtime,
    mongodbConfigured: Boolean(process.env.MONGODB_URI),
  });
}
