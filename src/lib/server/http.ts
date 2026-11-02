import { getAuth } from "./auth.ts";
export function json(value: unknown, status = 200) {
  return Response.json(value, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
export function sameOrigin(request: Request) {
  const expected = new URL(
    process.env.BETTER_AUTH_URL || "http://127.0.0.1:3002",
  ).origin;
  if (request.headers.get("origin") !== expected)
    throw new Error("Invalid request origin");
}
export async function readJson(
  request: Request,
  limit = 1_020_000,
): Promise<unknown> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Request body is required");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > limit) {
      await reader.cancel();
      throw new Error("Request is too large");
    }
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
export async function session(request: Request) {
  return (await getAuth()).api.getSession({ headers: request.headers });
}
