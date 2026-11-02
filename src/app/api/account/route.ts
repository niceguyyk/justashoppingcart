import { session, json, sameOrigin, readJson } from "@/lib/server/http";
import {
  database,
  loadWorkspace,
  saveWorkspace,
  StoreConflict,
} from "@/lib/server/database";
import { validStore } from "@/lib/cart";
export async function GET(request: Request) {
  const current = await session(request);
  if (!current) return json({ user: null });
  return json({
    user: {
      id: current.user.id,
      name: current.user.name,
      email: current.user.email,
    },
    ...loadWorkspace(database(), current.user.id),
  });
}
export async function PUT(request: Request) {
  try {
    sameOrigin(request);
  } catch {
    return json({ error: "Invalid request origin." }, 403);
  }
  const current = await session(request);
  if (!current) return json({ error: "Sign in to save carts." }, 401);
  try {
    const body = (await readJson(request)) as Record<string, unknown>;
    if (
      !validStore(body.store) ||
      !Number.isSafeInteger(body.version) ||
      Number(body.version) < 0
    )
      return json({ error: "Invalid cart data." }, 400);
    const version = saveWorkspace(
      database(),
      current.user.id,
      body.store,
      Number(body.version),
    );
    return json({ version });
  } catch (error) {
    if (error instanceof StoreConflict)
      return json(
        {
          error:
            "Newer changes exist on another device. Export your edits or reload the saved carts.",
        },
        409,
      );
    return json(
      {
        error: "Could not save these carts. Check the data size and try again.",
      },
      400,
    );
  }
}
