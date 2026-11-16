import { NextRequest, NextResponse } from "next/server";
import { parseProduct } from "@/lib/product-metadata";
import { shopFor } from "@/lib/cart";
import { fetchProductHtml, publicProductUrl } from "@/lib/server/product-fetch";
export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length")) > 4096)
      return NextResponse.json(
        { error: "The URL is too long." },
        { status: 400 },
      );
    const { url } = await request.json();
    if (typeof url !== "string" || url.length > 2048 || !publicProductUrl(url))
      return NextResponse.json(
        {
          error: "Enter a public HTTPS product URL without a custom port.",
        },
        { status: 400 },
      );
    const { html, url: finalUrl } = await fetchProductHtml(url);
    const { name, image, price } = parseProduct(html, finalUrl);
    return NextResponse.json({
      name,
      image,
      price,
      shop: shopFor(finalUrl),
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
