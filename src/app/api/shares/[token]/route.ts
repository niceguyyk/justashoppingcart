import { session, json, sameOrigin } from "@/lib/server/http";
import { database, getShare, revokeShare } from "@/lib/server/database";
type Context = { params: Promise<{ token: string }> };
export async function GET(_request: Request, context: Context) {
  const { token } = await context.params;
  const shared = getShare(database(), token);
  return shared
    ? json(shared)
    : json({ error: "This link has expired or has been revoked." }, 404);
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request);
  } catch {
    return json({ error: "Invalid request origin." }, 403);
  }
  const current = await session(request);
  if (!current) return json({ error: "Sign in to manage share links." }, 401);
  const { token } = await context.params;
  return revokeShare(database(), current.user.id, token)
    ? json({ ok: true })
    : json({ error: "Share link not found." }, 404);
}
