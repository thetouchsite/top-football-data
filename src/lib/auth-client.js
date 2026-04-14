"use client";

import { createAuthClient } from "better-auth/react";
import { oneTapClient } from "better-auth/client/plugins";

export const isGoogleAuthConfigured = Boolean(
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
);
export const isGoogleOneTapEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED === "true";

export const authClient = createAuthClient({
  basePath: "/api/auth",
  plugins: isGoogleAuthConfigured && isGoogleOneTapEnabled
    ? [
        oneTapClient({
          clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
          promptOptions: {
            maxAttempts: 1,
          },
        }),
      ]
    : [],
});
