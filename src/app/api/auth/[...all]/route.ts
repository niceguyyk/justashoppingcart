import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/server/auth";
import { sameOrigin, readJson, json } from "@/lib/server/http";
export async function GET(request: Request) {
  return toNextJsHandler(await getAuth()).GET(request);
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
  } catch {
    const url = process.env.BETTER_AUTH_URL || "http://127.0.0.1:3002";
    return json(
      {
        message: `Open ${new URL(url).origin} to sign in or create an account. This address is not enabled for account access.`,
      },
      403,
    );
  }
  let body: Record<string, unknown>;
  try {
    const value = await readJson(request, 16384);
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error("Expected a JSON object");
    body = value as Record<string, unknown>;
  } catch {
    return json(
      { message: "Could not read the form. Reload the page and try again." },
      400,
    );
  }
  try {
    if (
      new URL(request.url).pathname.endsWith("/sign-up/email") &&
      (typeof body.name !== "string" ||
        body.name.trim().length < 2 ||
        body.name.length > 60)
    )
      return json({ message: "Name must contain 2–60 characters." }, 400);
    const headers = new Headers(request.headers);
    headers.delete("content-length");
    return toNextJsHandler(await getAuth()).POST(
      new Request(request.url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      }),
    );
  } catch (error) {
    // Never log request bodies, credentials, cookies, or session tokens.
    console.error(
      "Authentication handler failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return json(
      {
        message:
          "Account access is temporarily unavailable. Please try again shortly.",
      },
      503,
    );
  }
}

