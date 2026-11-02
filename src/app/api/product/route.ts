import { NextRequest, NextResponse } from "next/server";
import { parseProduct } from "@/lib/product-metadata";
import { shopFor } from "@/lib/cart";

function allowed(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      shopFor(u.href) !== "Eigener Link"
    );
  } catch {
    return false;
  }
}
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length")) > 4096)
      return NextResponse.json({ error: "Link ist zu lang." }, { status: 400 });
    const { url } = await request.json();
    if (typeof url !== "string" || url.length > 2048 || !allowed(url))
      return NextResponse.json(
        {
          error:
            "Automatischer Import unterstützt Amazon.de/.com, Kleinanzeigen, eBay.de, OTTO und IKEA. Andere Links kannst du manuell hinzufügen.",
        },
        { status: 400 },
      );
    let current = url;
    let response: Response | undefined;
    const signal = AbortSignal.timeout(12000);
    for (let i = 0; i < 4; i++) {
      response = await fetch(current, {
        redirect: "manual",
        signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JustAShoppingCart/1.0)",
          "Accept-Language": "de-DE,de;q=0.9",
          Accept: "text/html",
        },
        cache: "no-store",
      });
      if (response.status >= 300 && response.status < 400) {
        const next = new URL(response.headers.get("location") || "", current)
          .href;
        await response.body?.cancel();
        if (!allowed(next))
          throw new Error(
            "Die Weiterleitung wird nicht unterstützt. Nutze bitte den direkten Produktlink.",
          );
        current = next;
        response = undefined;
      } else break;
    }
    if (
      !response?.ok ||
      !response.headers.get("content-type")?.includes("text/html")
    )
      throw new Error(
        "Der Shop erlaubt gerade keinen automatischen Abruf. Bitte ergänze die Produktdaten selbst.",
      );
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Keine Produktdaten erhalten.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 2_000_000) {
        await reader.cancel();
        throw new Error(
          "Produktseite ist zu groß. Bitte ergänze die Daten selbst.",
        );
      }
      chunks.push(value);
    }
    const { name, image, price } = parseProduct(
      Buffer.concat(chunks).toString("utf8"),
      current,
    );
    return NextResponse.json({
      name,
      image,
      price,
      shop: shopFor(current),
      warning:
        price === null
          ? "Kein EUR-Preis gefunden. Bitte trage den Preis selbst ein."
          : "Daten übernommen. Bitte prüfe Preis und Produkt vor dem Speichern.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name !== "TimeoutError"
            ? error.message
            : "Der Abruf dauert zu lange. Bitte ergänze die Daten selbst.",
      },
      { status: 422 },
    );
  }
}
