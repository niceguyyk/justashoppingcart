import { session, json, sameOrigin, readJson } from "@/lib/server/http";
import { database, createShare, listShares } from "@/lib/server/database";
export async function GET(request: Request) {
  const current = await session(request);
  if (!current) return json({ error: "Sign in to manage share links." }, 401);
  return json({
    shares: listShares(
      database(),
      current.user.id,
      new URL(request.url).searchParams.get("cartId") || "",
    ),
  });
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
  } catch {
    return json({ error: "Invalid request origin." }, 403);
  }
  const current = await session(request);
  if (!current) return json({ error: "Sign in to share a cart." }, 401);
  try {
    const body = (await readJson(request, 4096)) as Record<string, unknown>;
    const mode = body.mode === undefined ? "view" : body.mode;
    if (typeof body.cartId !== "string" || body.cartId.length > 128 || !["view", "edit"].includes(String(mode)))
      return json({ error: "Invalid cart." }, 400);
    return json(createShare(database(), current.user.id, body.cartId, mode as "view" | "edit"), 201);
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not create a share link.",
      },
      400,
    );
  }
}
