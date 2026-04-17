import { NextResponse } from "next/server";

import { isDatiLiveFeatureEnabled } from "@/lib/feature-flags";

export function middleware(request) {
  if (!isDatiLiveFeatureEnabled() && request.nextUrl.pathname === "/dati-live") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dati-live"],
};
