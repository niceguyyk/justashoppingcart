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
      shopFor(u.href) !== "Custom link"
    );
  } catch {
    return false;
  }
}
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length")) > 4096)
      return NextResponse.json(
        { error: "The URL is too long." },
        { status: 400 },
      );
    const { url } = await request.json();
    if (typeof url !== "string" || url.length > 2048 || !allowed(url))
      return NextResponse.json(
        {
          error:
            "Automatic import supports Amazon.de/.com, Kleinanzeigen, eBay.de, OTTO and IKEA. Add other URLs manually.",
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
            "This redirect is not supported. Use the direct product URL.",
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
        "The shop is blocking automatic access. Enter the product details manually.",
      );
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No product data received.");
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 2_000_000) {
        await reader.cancel();
        throw new Error(
          "The product page is too large. Enter the details manually.",
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
          ? "No EUR price found. Enter the price manually."
          : "Details imported. Check the product and price before saving.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error && error.name !== "TimeoutError"
            ? error.message
            : "The request timed out. Enter the details manually.",
      },
      { status: 422 },
    );
  }
}
