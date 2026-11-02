import { getAuth } from "@/lib/server/auth";
import { database } from "@/lib/server/database";
export async function GET(request: Request) {
  request.headers.get("x-health-probe");
  try {
    await getAuth();
    database().prepare("SELECT 1").get();
    return Response.json(
      { status: "ok", application: "justashoppingcart" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
