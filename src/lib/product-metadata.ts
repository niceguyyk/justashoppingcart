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
  const inferredCurrency =
    /\.(de|at|fr|it|es|nl|be|pt|ie|fi|gr|lu|ee|lv|lt|sk|si|hr|cy|mt)$/.test(
      new URL(url).hostname,
    )
      ? "EUR"
      : "";
  const currency = String(
    offer.priceCurrency ||
      spec.priceCurrency ||
      meta("product:price:currency", "og:price:currency") ||
      $('[itemprop="priceCurrency"]').attr("content") ||
      $('[itemprop="priceCurrency"]').text() ||
      inferredCurrency,
  ).toUpperCase();
  const rawPrice = String(
    offer.price ??
      offer.lowPrice ??
      spec.price ??
      (meta("product:price:amount", "og:price:amount") ||
        $('[itemprop="price"]').attr("content") ||
        $('[itemprop="price"]').text()),
  );
  const amount = rawPrice.trim();
  const separator = Math.max(amount.lastIndexOf(","), amount.lastIndexOf("."));
  const decimal = separator >= 0 && amount.length - separator - 1 <= 2;
  const parsed = /^\d[\d.,]*$/.test(amount)
    ? Number(
        decimal
          ? amount.slice(0, separator).replace(/[.,]/g, "") +
              "." +
              amount.slice(separator + 1)
          : amount.replace(/[.,]/g, ""),
      )
    : NaN;
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
      : rawImage?.url ||
        meta("og:image", "og:image:secure_url", "twitter:image") ||
        $('[itemprop="image"]').attr("content") ||
        $('[itemprop="image"]').attr("src");
  const name = String(
    product.name ||
      meta("og:title", "twitter:title") ||
      $('[itemprop="name"]').attr("content") ||
      $('[itemprop="name"]').first().text() ||
      $("h1").first().text() ||
      $("title").text(),
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
