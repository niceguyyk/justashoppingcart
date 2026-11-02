import { load } from "cheerio";
import { safeUrl } from "./cart.ts";
export function parseProduct(html: string, url: string) {
  const $ = load(html);
  const meta = (...keys: string[]) =>
    keys
      .map((k) => $(`meta[property="${k}"],meta[name="${k}"]`).attr("content"))
      .find(Boolean) || "";
  let product: Record<string, unknown> = {};
  const visit = (v: unknown, depth = 0) => {
    if (!v || typeof v !== "object" || depth > 12) return;
    if (Array.isArray(v)) {
      v.forEach((x) => visit(x, depth + 1));
      return;
    }
    const o = v as Record<string, unknown>;
    if ([o["@type"]].flat().includes("Product")) product = o;
    Object.values(o).forEach((x) => visit(x, depth + 1));
  };
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      visit(JSON.parse($(el).text()));
    } catch {}
  });
  const offer = (
    Array.isArray(product.offers) ? product.offers[0] : product.offers || {}
  ) as Record<string, unknown>;
  const spec = (offer.priceSpecification || {}) as Record<string, unknown>;
  const currency = String(
    offer.priceCurrency ||
      spec.priceCurrency ||
      meta("product:price:currency", "og:price:currency") ||
      "EUR",
  );
  const rawPrice = String(
    offer.price ??
      offer.lowPrice ??
      spec.price ??
      meta("product:price:amount", "og:price:amount"),
  );
  const parsed = Number(
    rawPrice.includes(",")
      ? rawPrice.replace(/\./g, "").replace(",", ".")
      : rawPrice,
  );
  const price =
    rawPrice &&
    Number.isFinite(parsed) &&
    parsed >= 0 &&
    parsed <= 1000000 &&
    currency === "EUR"
      ? Math.round(parsed * 100)
      : null;
  const rawImage = (
    Array.isArray(product.image) ? product.image[0] : product.image
  ) as string | { url?: string } | undefined;
  const image =
    typeof rawImage === "string"
      ? rawImage
      : rawImage?.url || meta("og:image", "twitter:image");
  const name = String(
    product.name || meta("og:title", "twitter:title") || $("title").text(),
  )
    .trim()
    .slice(0, 180);
  if (
    !name ||
    /captcha|robot check|access denied|zugriff verweigert/i.test(name)
  )
    throw new Error(
      "The shop is blocking access. You can enter all details manually.",
    );
  let imageUrl = "";
  try {
    imageUrl = image ? safeUrl(new URL(image, url).href) : "";
  } catch {}
  return { name, image: imageUrl, price };
}
