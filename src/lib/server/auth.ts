import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { getMigrations } from "better-auth/db/migration";
import { database, authSecret } from "./database.ts";

function createAuth() {
  const baseURL = process.env.BETTER_AUTH_URL || "http://127.0.0.1:3002";
  return betterAuth({
    appName: "Just a Shopping Cart",
    database: database(),
    secret: authSecret(),
    baseURL,
    trustedOrigins: [new URL(baseURL).origin],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    session: { expiresIn: 60 * 60 * 24 * 30, updateAge: 60 * 60 * 24 },
    // Schema migrations finish before any handler is exposed.
    advanced: {
      useSecureCookies: baseURL.startsWith("https://"),
      cookiePrefix: "justashoppingcart",
      database: { validateSchema: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 10 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    plugins: [nextCookies()],
  });
}
type Auth = ReturnType<typeof createAuth>;
const runtime = globalThis as typeof globalThis & {
  shoppingCartAuth?: Promise<Auth>;
};
export function getAuth() {
  return (runtime.shoppingCartAuth ??= (async () => {
    const auth = createAuth();
    const { runMigrations } = await getMigrations(auth.options);
    await runMigrations();
    return auth;
  })());
}
