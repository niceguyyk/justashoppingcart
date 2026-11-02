import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/server/auth";
import { sameOrigin, readJson, json } from "@/lib/server/http";
export async function GET(request: Request) {
  return toNextJsHandler(await getAuth()).GET(request);
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = (await readJson(request, 16384)) as Record<string, unknown>;
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
  } catch {
    return json({ message: "Invalid authentication request." }, 400);
  }
}
