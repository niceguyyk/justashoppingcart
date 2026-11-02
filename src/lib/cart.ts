export type Product = {
  id: string;
  name: string;
  url: string;
  image: string;
  price: number;
  quantity: number;
  shop: string;
};
export type Cart = { id: string; name: string; products: Product[] };
export type Store = { carts: Cart[]; active: string };
export const shops = [
  "Automatisch",
  "Amazon",
  "Kleinanzeigen",
  "eBay",
  "OTTO",
  "IKEA",
  "Eigener Link",
];
export const money = (cents: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export function safeUrl(value: string) {
  try {
    const u = new URL(value);
    return ["https:", "http:"].includes(u.protocol) &&
      !u.username &&
      !u.password
      ? u.href
      : "";
  } catch {
    return "";
  }
}
export function shopFor(value: string) {
  try {
    const h = new URL(value).hostname;
    return /(^|\.)amazon\.(de|com)$/.test(h)
      ? "Amazon"
      : /(^|\.)kleinanzeigen.de$/.test(h)
        ? "Kleinanzeigen"
        : /(^|\.)ebay.de$/.test(h)
          ? "eBay"
          : /(^|\.)otto.de$/.test(h)
            ? "OTTO"
            : /(^|\.)ikea.com$/.test(h)
              ? "IKEA"
              : "Eigener Link";
  } catch {
    return "Eigener Link";
  }
}
export function emptyStore(): Store {
  return {
    carts: [{ id: "mein-warenkorb", name: "Mein Warenkorb", products: [] }],
    active: "mein-warenkorb",
  };
}
export function validStore(value: unknown): value is Store {
  if (!value || typeof value !== "object") return false;
  const s = value as Store;
  try {
    return (
      Array.isArray(s.carts) &&
      s.carts.length > 0 &&
      s.carts.length <= 12 &&
      s.carts.some((c) => c.id === s.active) &&
      new Set(s.carts.map((c) => c.id)).size === s.carts.length &&
      s.carts.every(
        (c) =>
          typeof c.id === "string" &&
          typeof c.name === "string" &&
          c.name.length <= 60 &&
          Array.isArray(c.products) &&
          c.products.length <= 100 &&
          new Set(c.products.map((p) => p.id)).size === c.products.length &&
          c.products.every(
            (p) =>
              typeof p.id === "string" &&
              typeof p.name === "string" &&
              p.name.length <= 180 &&
              typeof p.url === "string" &&
              !!safeUrl(p.url) &&
              typeof p.image === "string" &&
              (!p.image || !!safeUrl(p.image)) &&
              typeof p.shop === "string" &&
              Number.isSafeInteger(p.price) &&
              p.price >= 0 &&
              p.price <= 100000000 &&
              Number.isInteger(p.quantity) &&
              p.quantity >= 1 &&
              p.quantity <= 999,
          ),
      )
    );
  } catch {
    return false;
  }
}
export function readStore(): Store {
  try {
    const cookies = Object.fromEntries(
      document.cookie.split("; ").map((c) => {
        const i = c.indexOf("=");
        return [c.slice(0, i), c.slice(i + 1)];
      }),
    );
    const count = Number(cookies.jasc_count);
    if (!Number.isInteger(count) || count < 1 || count > 3) return emptyStore();
    const s = JSON.parse(
      decodeURIComponent(
        Array.from(
          { length: count },
          (_, i) => cookies["jasc_" + i] || "",
        ).join(""),
      ),
    );
    return validStore(s) ? s : emptyStore();
  } catch {
    return emptyStore();
  }
}
export function saveStore(s: Store) {
  if (!validStore(s))
    throw new Error(
      "Die Warenkorbdaten sind ungültig. Maximal 12 Warenkörbe und 100 Produkte pro Warenkorb sind möglich.",
    );
  const encoded = encodeURIComponent(JSON.stringify(s));
  if (encoded.length > 9000)
    throw new Error(
      "Dein Cookie-Speicher ist voll. Exportiere deinen Warenkorb und entferne ältere Produkte oder kürze lange Bildlinks.",
    );
  const flags =
    "; Path=/; Max-Age=31536000; SameSite=Lax" +
    (location.protocol === "https:" ? "; Secure" : "");
  const count = Math.ceil(encoded.length / 3000);
  for (let i = 0; i < 3; i++)
    document.cookie = `jasc_${i}=${i < count ? encoded.slice(i * 3000, (i + 1) * 3000) : ""}${i < count ? flags : "; Path=/; Max-Age=0"}`;
  document.cookie = `jasc_count=${count}${flags}`;
  if (JSON.stringify(readStore()) !== JSON.stringify(s))
    throw new Error(
      "Cookies konnten nicht gespeichert werden. Bitte erlaube Cookies für diese Website.",
    );
}
