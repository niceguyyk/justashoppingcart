export type Product = {
  id: string;
  name: string;
  url: string;
  image: string;
  price: number;
  quantity: number;
  shop: string;
  notes?: string;
  status?: "planned" | "later" | "bought";
  categories?: string[];
};
export type Cart = { id: string; name: string; products: Product[]; categories?: string[] };
export type Store = { carts: Cart[]; active: string };
export const MAX_CATEGORIES = 30;
export const MAX_PRODUCT_CATEGORIES = 8;
export const CATEGORY_NAME_LIMIT = 32;
export const UNCATEGORIZED = "\u0000uncategorized";
export function newCategoryName(categories: string[], name: string): string {
  const category = name.trim();
  if (!category || category.length > CATEGORY_NAME_LIMIT || /[\u0000-\u001f\u007f]/.test(category))
    throw new Error(`Enter a category name of up to ${CATEGORY_NAME_LIMIT} characters.`);
  if (categories.some((item) => item.toLowerCase() === category.toLowerCase()))
    throw new Error("This category already exists.");
  if (categories.length >= MAX_CATEGORIES)
    throw new Error(`This cart already has ${MAX_CATEGORIES} categories.`);
  return category;
}
export function addCategory(cart: Cart, name: string): Cart {
  const categories = cart.categories || [];
  const category = newCategoryName(categories, name);
  return { ...cart, categories: [...categories, category] };
}
export function includeProductCategories(cart: Cart, product: Product): Cart {
  const categories = [...(cart.categories || [])];
  for (const category of product.categories || [])
    if (!categories.includes(category)) categories.push(newCategoryName(categories, category));
  return { ...cart, categories };
}
export function mergeProductCategories(product: Product, incoming: Product): Product {
  const categories = [...new Set([...(product.categories || []), ...(incoming.categories || [])])];
  if (categories.length > MAX_PRODUCT_CATEGORIES)
    throw new Error(`A product can have up to ${MAX_PRODUCT_CATEGORIES} categories.`);
  return categories.length ? { ...product, categories } : product;
}
export function addCategoriesToProducts(cart: Cart, productIds: string[], categoryNames: string[]): Cart {
  const ids = new Set(productIds);
  if (!ids.size || ids.size !== productIds.length ||
    [...ids].some((id) => !cart.products.some((product) => product.id === id)))
    throw new Error("Select products in this cart first.");
  if (!categoryNames.length || new Set(categoryNames).size !== categoryNames.length)
    throw new Error("Choose at least one category.");
  let updated = cart;
  for (const category of categoryNames)
    if (!(updated.categories || []).includes(category)) updated = addCategory(updated, category);
  return {
    ...updated,
    products: cart.products.map((product) => ids.has(product.id)
      ? mergeProductCategories(product, { ...product, categories: categoryNames })
      : product),
  };
}
export function removeCategory(cart: Cart, name: string): Cart {
  return {
    ...cart,
    categories: (cart.categories || []).filter((category) => category !== name),
    products: cart.products.map((product) => {
      const { categories: previous, ...rest } = product;
      const categories = (previous || []).filter((category) => category !== name);
      return categories.length ? { ...rest, categories } : rest;
    }),
  };
}
export function matchesCategoryFilter(
  product: Product,
  selected: string[],
  mode: "show" | "hide",
) {
  if (!selected.length) return true;
  const categories = product.categories || [];
  const matches = selected.some((category) =>
    category === UNCATEGORIZED ? !categories.length : categories.includes(category),
  );
  return mode === "show" ? matches : !matches;
}
// getRandomValues also works when the tool is opened over HTTP on a LAN.
export function newId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
export const shops = [
  "Auto-detect",
  "Amazon",
  "Kleinanzeigen",
  "eBay",
  "OTTO",
  "IKEA",
  "Custom link",
];
export const money = (cents: number) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(
    cents / 100,
  );
export const productStatuses = ["planned", "later", "bought"] as const;
export function cartTotals(products: Product[]) {
  const totals = { now: 0, later: 0, bought: 0, all: 0 };
  for (const product of products) {
    const amount = product.price * product.quantity;
    const group = product.status === "later" || product.status === "bought"
      ? product.status
      : "now";
    totals[group] += amount;
    totals.all += amount;
  }
  return totals;
}
export function categoryTotals(cart: Cart) {
  return (cart.categories || []).map((name) => ({
    name,
    ...cartTotals(cart.products.filter((product) => product.categories?.includes(name))),
  }));
}
export function productLinkKey(value: string) {
  const safe = safeUrl(value);
  if (!safe) return "";
  const url = new URL(safe);
  const amazonId = /(?:\/dp\/|\/gp\/product\/)([A-Z0-9]{10})(?:[/?]|$)/i.exec(url.pathname);
  if (amazonId && shopFor(safe) === "Amazon")
    return `${url.hostname.replace(/^www\./, "").replace(/^smile\./, "")}/dp/${amazonId[1].toUpperCase()}`;
  url.hostname = url.hostname.replace(/^www\./, "");
  url.hash = "";
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  for (const key of [...url.searchParams.keys()])
    if (/^(utm_.+|fbclid|gclid|msclkid|ref|ref_|tag|campaign|source)$/i.test(key))
      url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href;
}
export function findDuplicate(products: Product[], url: string, excludeId?: string) {
  const key = productLinkKey(url);
  return key ? products.find((product) => product.id !== excludeId && productLinkKey(product.url) === key) : undefined;
}
export function moveProductToCart(
  store: Store,
  sourceId: string,
  productId: string,
  targetId: string,
): Store {
  if (sourceId === targetId) throw new Error("Choose another cart.");
  const source = store.carts.find((cart) => cart.id === sourceId);
  const target = store.carts.find((cart) => cart.id === targetId);
  const product = source?.products.find((item) => item.id === productId);
  if (!source || !target || !product)
    throw new Error("This product or cart is no longer available.");
  if (target.products.length >= 100)
    throw new Error("The destination cart already has 100 products.");
  const targetWithCategories = includeProductCategories(target, product);
  let id = product.id;
  while (target.products.some((item) => item.id === id)) id = newId();
  return {
    ...store,
    carts: store.carts.map((cart) =>
      cart.id === sourceId
        ? {
            ...cart,
            products: cart.products.filter((item) => item.id !== productId),
          }
        : cart.id === targetId
          ? { ...targetWithCategories, products: [{ ...product, id }, ...cart.products] }
          : cart,
    ),
  };
}
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
    return /(^|\.)amazon\.(de|com|co\.uk|fr|it|es|nl|se|pl|co\.jp|ca|com\.au|com\.br|com\.mx|ae|sa|sg|in)$/.test(
      h,
    )
      ? "Amazon"
      : /(^|\.)kleinanzeigen.de$/.test(h)
        ? "Kleinanzeigen"
        : /(^|\.)ebay.de$/.test(h)
          ? "eBay"
          : /(^|\.)otto.de$/.test(h)
            ? "OTTO"
            : /(^|\.)ikea.com$/.test(h)
              ? "IKEA"
              : "Custom link";
  } catch {
    return "Custom link";
  }
}
export function emptyStore(): Store {
  return {
    carts: [{ id: "mein-warenkorb", name: "My cart", products: [], categories: [] }],
    active: "mein-warenkorb",
  };
}
export function normalizeStore(s: Store): Store {
  return {
    active: s.active,
    carts: s.carts.map((c) => ({
      id: c.id,
      categories: c.categories || [],
      name:
        c.id === "mein-warenkorb" && c.name === "Mein Warenkorb"
          ? "My cart"
          : c.name,
      products: c.products.map((p) => ({
        id: p.id,
        name: p.name,
        url: p.url,
        image: p.image,
        price: p.price,
        quantity: p.quantity,
        shop: p.shop === "Eigener Link" ? "Custom link" : p.shop,
        ...(p.notes === undefined ? {} : { notes: p.notes }),
        ...(p.status === undefined ? {} : { status: p.status }),
        ...(p.categories?.length ? { categories: p.categories } : {}),
      })),
    })),
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
          c.id.length > 0 &&
          c.id.length <= 128 &&
          typeof c.name === "string" &&
          c.name.trim().length > 0 &&
          c.name.length <= 60 &&
          Array.isArray(c.products) &&
          c.products.length <= 100 &&
          (c.categories === undefined ||
            (Array.isArray(c.categories) &&
              c.categories.length <= MAX_CATEGORIES &&
              new Set(c.categories.map((category) => category.toLowerCase())).size === c.categories.length &&
              c.categories.every((category) =>
                typeof category === "string" &&
                category.length > 0 &&
                category.length <= CATEGORY_NAME_LIMIT &&
                category === category.trim() &&
                !/[\u0000-\u001f\u007f]/.test(category),
              ))) &&
          new Set(c.products.map((p) => p.id)).size === c.products.length &&
          c.products.every(
            (p) =>
              typeof p.id === "string" &&
              p.id.length > 0 &&
              p.id.length <= 128 &&
              typeof p.name === "string" &&
              p.name.trim().length > 0 &&
              p.name.length <= 180 &&
              typeof p.url === "string" &&
              p.url.length <= 8192 &&
              !!safeUrl(p.url) &&
              typeof p.image === "string" &&
              p.image.length <= 8192 &&
              (!p.image || !!safeUrl(p.image)) &&
              typeof p.shop === "string" &&
              p.shop.length > 0 &&
              p.shop.length <= 60 &&
              Number.isSafeInteger(p.price) &&
              p.price >= 0 &&
              p.price <= 100000000 &&
              Number.isInteger(p.quantity) &&
              p.quantity >= 1 &&
              p.quantity <= 999 &&
              (p.notes === undefined || (typeof p.notes === "string" && p.notes.length <= 500)) &&
              (p.status === undefined || productStatuses.includes(p.status)) &&
              (p.categories === undefined ||
                (Array.isArray(p.categories) &&
                  p.categories.length <= MAX_PRODUCT_CATEGORIES &&
                  new Set(p.categories).size === p.categories.length &&
                  p.categories.every((category) => (c.categories || []).includes(category))))
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
    return validStore(s) ? normalizeStore(s) : emptyStore();
  } catch {
    return emptyStore();
  }
}
export function saveStore(s: Store) {
  if (!validStore(s))
    throw new Error(
      "Invalid cart data. You can have up to 12 carts and 100 products per cart.",
    );
  const value = normalizeStore(s);
  const encoded = encodeURIComponent(JSON.stringify(value));
  if (encoded.length > 9000)
    throw new Error(
      "Cookie storage is full. Export a backup, then remove older products or shorten image URLs.",
    );
  const flags =
    "; Path=/; Max-Age=31536000; SameSite=Lax" +
    (location.protocol === "https:" ? "; Secure" : "");
  const count = Math.ceil(encoded.length / 3000);
  for (let i = 0; i < 3; i++)
    document.cookie = `jasc_${i}=${i < count ? encoded.slice(i * 3000, (i + 1) * 3000) : ""}${i < count ? flags : "; Path=/; Max-Age=0"}`;
  document.cookie = `jasc_count=${count}${flags}`;
  if (JSON.stringify(readStore()) !== JSON.stringify(value))
    throw new Error(
      "Could not save cookies. Please allow cookies for this website.",
    );
}
