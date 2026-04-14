import { betterAuth } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { admin } from "better-auth/plugins/admin";
import { oneTap } from "better-auth/plugins";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { getMigrations } from "better-auth/db/migration";

import { getDatabase, getMongoClient } from "@/lib/mongodb";

const authSecret =
  process.env.BETTER_AUTH_SECRET ||
  process.env.AUTH_SECRET ||
  "top-football-data-dev-auth-secret-change-me";

const authBaseURL =
  process.env.BETTER_AUTH_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "http://localhost:3000";
const canUseLocalAuthFallback =
  process.env.AUTH_LOCAL_FALLBACK !== "false" &&
  /localhost|127\.0\.0\.1/i.test(authBaseURL);

let authInstancePromise = null;
let localSqliteDatabase = null;

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
const isGoogleAuthEnabled = Boolean(googleClientId && googleClientSecret);
const isGoogleOneTapEnabled =
  process.env.NEXT_PUBLIC_GOOGLE_ONE_TAP_ENABLED === "true";

function getLocalSqliteDatabase() {
  if (localSqliteDatabase) {
    return localSqliteDatabase;
  }

  const databaseDir = path.join(process.cwd(), ".data");
  mkdirSync(databaseDir, { recursive: true });
  localSqliteDatabase = new DatabaseSync(path.join(databaseDir, "auth-local.sqlite"));
  return localSqliteDatabase;
}

async function resolveAuthDatabase() {
  try {
    const [database, mongoClient] = await Promise.all([
      getDatabase(),
      getMongoClient(),
    ]);

    return {
      adapter: mongodbAdapter(database, {
        client: mongoClient,
        usePlural: true,
        transaction: false,
      }),
      storageMode: "mongo",
      rawDatabase: database,
    };
  } catch (error) {
    if (!canUseLocalAuthFallback) {
      throw error;
    }

    console.warn(
      "[auth] MongoDB non raggiungibile. Attivo fallback SQLite locale per login e registrazione.",
      error
    );

    return {
      adapter: getLocalSqliteDatabase(),
      storageMode: "sqlite-fallback",
      rawDatabase: getLocalSqliteDatabase(),
    };
  }
}

export async function getAuth() {
  if (!authInstancePromise) {
    authInstancePromise = (async () => {
      const [{ nextCookies }, { toNextJsHandler }, databaseConfig] = await Promise.all([
        import("better-auth/next-js"),
        import("better-auth/next-js"),
        resolveAuthDatabase(),
      ]);

      const auth = betterAuth({
        secret: authSecret,
        baseURL: authBaseURL,
        basePath: "/api/auth",
        trustedOrigins: [authBaseURL],
        onAPIError: {
          errorURL: `${authBaseURL}/login`,
        },
        database: databaseConfig.adapter,
        emailAndPassword: {
          enabled: true,
          autoSignIn: true,
          minPasswordLength: 8,
          maxPasswordLength: 128,
          requireEmailVerification: false,
        },
        socialProviders: isGoogleAuthEnabled
          ? {
              google: {
                clientId: googleClientId,
                clientSecret: googleClientSecret,
              },
            }
          : undefined,
        account: {
          accountLinking: {
            enabled: true,
            trustedProviders: ["google"],
          },
        },
        plugins: [
          admin({
            defaultRole: "user",
            adminRoles: ["admin"],
          }),
          ...(isGoogleAuthEnabled && isGoogleOneTapEnabled
            ? [oneTap({ clientId: googleClientId })]
            : []),
          nextCookies(),
        ],
        user: {
          additionalFields: {
            plan: {
              type: "string",
              required: false,
              defaultValue: "free",
            },
            isPremium: {
              type: "boolean",
              required: false,
              defaultValue: false,
            },
          },
        },
      });

      if (databaseConfig.storageMode === "sqlite-fallback") {
        const { runMigrations } = await getMigrations({
          ...auth.options,
          database: databaseConfig.rawDatabase,
        });
        await runMigrations();
      }

      return {
        auth,
        toNextJsHandler,
        storageMode: databaseConfig.storageMode,
        isGoogleAuthEnabled,
        isGoogleOneTapEnabled,
      };
    })();
  }

  return authInstancePromise;
}
