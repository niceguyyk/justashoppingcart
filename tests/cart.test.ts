import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  emptyStore,
  money,
  readStore,
  saveStore,
  shopFor,
  safeUrl,
  validStore,
  moveProductToCart,
  findDuplicate,
  productLinkKey,
  cartTotals,
  categoryTotals,
  addCategory,
  removeCategory,
  includeProductCategories,
  mergeProductCategories,
  addCategoriesToProducts,
  matchesCategoryFilter,
  UNCATEGORIZED,
} from "../src/lib/cart.ts";

test("categories support multi assignment, show and hide filters, and legacy products", () => {
  const old = { id: "old", name: "Legacy", url: "https://example.com/old", image: "", price: 100, quantity: 1, shop: "Custom link" };
  const helmet = { ...old, id: "helmet", name: "Helmet", categories: ["Helmet", "Vest"] };
  const ram = { ...old, id: "ram", name: "RAM", categories: ["RAM"] };
  let cart = emptyStore().carts[0];
  cart = addCategory(cart, " Vest ");
  cart = includeProductCategories(cart, helmet);
  cart = includeProductCategories(cart, ram);
  cart.products = [old, helmet, ram];
  assert.deepEqual(cart.categories, ["Vest", "Helmet", "RAM"]);
  assert.equal(validStore({ carts: [cart], active: cart.id }), true);
  assert.deepEqual(cart.products.filter((product) => matchesCategoryFilter(product, ["Helmet", "RAM"], "show")).map((product) => product.id), ["helmet", "ram"]);
  assert.deepEqual(cart.products.filter((product) => matchesCategoryFilter(product, ["Helmet", "RAM"], "hide")).map((product) => product.id), ["old"]);
  assert.deepEqual(cart.products.filter((product) => matchesCategoryFilter(product, [UNCATEGORIZED], "show")).map((product) => product.id), ["old"]);
  assert.deepEqual(mergeProductCategories(ram, helmet).categories, ["RAM", "Helmet", "Vest"]);
  assert.throws(() => addCategory(cart, "vest"), /already exists/);
  cart = removeCategory(cart, "Helmet");
  assert.deepEqual(cart.products[1].categories, ["Vest"]);
  assert.equal(validStore({ carts: [cart], active: cart.id }), true);
});

test("moving a tagged product carries its categories to the target cart", () => {
  const store = emptyStore();
  store.carts[0] = addCategory(store.carts[0], "RAM");
  store.carts[0].products.push({ id: "p", name: "Memory", url: "https://example.com/ram", image: "", price: 4500, quantity: 1, shop: "Custom link", categories: ["RAM"] });
  store.carts.push({ id: "other", name: "Other", products: [] });
  const moved = moveProductToCart(store, store.active, "p", "other");
  assert.deepEqual(moved.carts[1].categories, ["RAM"]);
  assert.deepEqual(moved.carts[1].products[0].categories, ["RAM"]);
  assert.equal(validStore(moved), true);
  assert.equal(store.carts[0].products.length, 1);
});

test("bulk category assignment updates only selected products and keeps existing labels", () => {
  const cart = emptyStore().carts[0];
  cart.categories = ["Vest"];
  cart.products = [
    { id: "a", name: "Armor", url: "https://example.com/a", image: "", price: 3000, quantity: 1, shop: "Custom link", categories: ["Vest"] },
    { id: "b", name: "Helmet", url: "https://example.com/b", image: "", price: 2000, quantity: 2, shop: "Custom link" },
    { id: "c", name: "Memory", url: "https://example.com/c", image: "", price: 1000, quantity: 1, shop: "Custom link" },
  ];
  const updated = addCategoriesToProducts(cart, ["a", "b"], ["Gear", "Helmet"]);
  assert.deepEqual(updated.categories, ["Vest", "Gear", "Helmet"]);
  assert.deepEqual(updated.products.map((product) => product.categories), [["Vest", "Gear", "Helmet"], ["Gear", "Helmet"], undefined]);
  assert.equal(updated.products[1].quantity, 2);
  assert.equal(validStore({ carts: [updated], active: updated.id }), true);
  assert.deepEqual(cart.categories, ["Vest"]);
  assert.equal(cart.products[1].categories, undefined);
  assert.throws(() => addCategoriesToProducts(cart, ["missing"], ["Gear"]), /Select products/);
  assert.throws(() => addCategoriesToProducts(cart, ["a"], []), /Choose at least one/);
  assert.throws(() => addCategoriesToProducts(cart, ["a"], Array.from({ length: 9 }, (_, index) => `Tag ${index}`)), /up to 8 categories/);
  assert.deepEqual(cart.categories, ["Vest"]);
});

test("totals separate planned, later and bought quantities without losing legacy products", () => {
  const products = [
    { id: "legacy", name: "Legacy", url: "https://example.com/legacy", image: "", price: 1000, quantity: 2, shop: "Custom link" },
    { id: "now", name: "Now", url: "https://example.com/now", image: "", price: 550, quantity: 1, shop: "Custom link", status: "planned" as const },
    { id: "later", name: "Later", url: "https://example.com/later", image: "", price: 1250, quantity: 3, shop: "Custom link", status: "later" as const },
    { id: "bought", name: "Bought", url: "https://example.com/bought", image: "", price: 900, quantity: 2, shop: "Custom link", status: "bought" as const },
  ];
  assert.deepEqual(cartTotals(products), { now: 2550, later: 3750, bought: 1800, all: 8100 });
  assert.deepEqual(cartTotals([]), { now: 0, later: 0, bought: 0, all: 0 });
});

test("category totals include quantities and every status without changing status totals", () => {
  const cart = emptyStore().carts[0];
  cart.categories = ["Vest", "Helmet", "RAM"];
  cart.products = [
    { id: "vest", name: "Vest", url: "https://example.com/vest", image: "", price: 40000, quantity: 2, shop: "Custom link", categories: ["Vest"] },
    { id: "helmet", name: "Helmet", url: "https://example.com/helmet", image: "", price: 30000, quantity: 1, shop: "Custom link", categories: ["Helmet"] },
    { id: "later", name: "Later", url: "https://example.com/later", image: "", price: 60000, quantity: 2, shop: "Custom link", status: "later", categories: ["Vest", "Helmet"] },
  ];
  assert.deepEqual(categoryTotals(cart), [
    { name: "Vest", now: 80000, later: 120000, bought: 0, all: 200000 },
    { name: "Helmet", now: 30000, later: 120000, bought: 0, all: 150000 },
    { name: "RAM", now: 0, later: 0, bought: 0, all: 0 },
  ]);
  assert.deepEqual(cartTotals(cart.products), { now: 110000, later: 120000, bought: 0, all: 230000 });
});

test("product notes and statuses validate, while duplicate links ignore tracking details", () => {
  const store = emptyStore();
  store.carts[0].products.push({ id: "a", name: "Item", url: "https://www.amazon.co.uk/dp/B012345678?tag=abc", image: "", price: 1000, quantity: 1, shop: "Amazon", notes: "Check size", status: "later" });
  assert.equal(validStore(store), true);
  assert.equal(productLinkKey("https://amazon.co.uk/gp/product/B012345678?ref=foo"), "amazon.co.uk/dp/B012345678");
  assert.equal(findDuplicate(store.carts[0].products, "https://amazon.co.uk/gp/product/B012345678?ref=foo")?.id, "a");
  store.carts[0].products[0].notes = "x".repeat(501);
  assert.equal(validStore(store), false);
});

test("moving a product transfers its full quantity and price without changing other carts", () => {
  const store = emptyStore();
  const source = store.carts[0];
  const target = {
    id: "target",
    name: "Other cart",
    products: [] as typeof source.products,
  };
  store.carts.push(target);
  source.products.push({
    id: "product",
    name: "Test item",
    url: "https://example.com/item",
    image: "",
    price: 1299,
    quantity: 3,
    shop: "Custom link",
  });
  const next = moveProductToCart(store, source.id, "product", target.id);
  assert.equal(source.products.length, 1);
  assert.equal(next.carts[0].products.length, 0);
  assert.deepEqual(next.carts[1].products[0], source.products[0]);
  assert.equal(
    next.carts[1].products[0].price * next.carts[1].products[0].quantity,
    3897,
  );
  assert.equal(validStore(next), true);
});

test("moving to a full cart fails without removing the source product", () => {
  const store = emptyStore();
  const source = store.carts[0];
  source.products.push({
    id: "product",
    name: "Test item",
    url: "https://example.com/item",
    image: "",
    price: 100,
    quantity: 1,
    shop: "Custom link",
  });
  store.carts.push({
    id: "full",
    name: "Full cart",
    products: Array.from({ length: 100 }, (_, i) => ({
      ...source.products[0],
      id: `p${i}`,
    })),
  });
  assert.throws(
    () => moveProductToCart(store, source.id, "product", "full"),
    /100 products/,
  );
  assert.equal(source.products.length, 1);
});

test("shop detection cannot be spoofed with a suffix", () => {
  assert.equal(shopFor("https://www.amazon.de/dp/test"), "Amazon");
  assert.equal(shopFor("https://www.amazon.co.uk/dp/test"), "Amazon");
  assert.equal(shopFor("https://www.amazon.com.au/dp/test"), "Amazon");
  assert.equal(
    shopFor("https://amazon.co.uk.attacker.example/item"),
    "Custom link",
  );
  assert.equal(
    shopFor("https://amazon.de.attacker.example/item"),
    "Custom link",
  );
  assert.equal(
    shopFor("https://www.kleinanzeigen.de/s-anzeige/abc"),
    "Kleinanzeigen",
  );
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("https://user:pass@example.com"), "");
});
test("Euro prices format from integer cents", () => {
  assert.match(money(8999 * 3), /269\.97/);
  assert.match(money(10 + 20), /0\.30/);
});
test("invalid imported quantities and unsafe links are rejected", () => {
  const s = emptyStore();
  s.carts[0].products.push({
    id: "p",
    name: "Test",
    url: "https://example.com",
    image: "",
    price: 1999,
    quantity: 2,
    shop: "Custom link",
  });
  assert.equal(validStore(s), true);
  s.carts[0].products[0].quantity = -1;
  assert.equal(validStore(s), false);
  s.carts[0].products[0].quantity = 1;
  s.carts[0].products[0].url = "javascript:alert(1)";
  assert.equal(validStore(s), false);
});
test("chunked cookies round-trip Unicode; oversized updates retain previous data", () => {
  const jar = new Map<string, string>();
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      get cookie() {
        return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
      },
      set cookie(v: string) {
        const first = v.split(";")[0];
        const i = first.indexOf("=");
        if (v.includes("Max-Age=0")) jar.delete(first.slice(0, i));
        else jar.set(first.slice(0, i), first.slice(i + 1));
      },
    },
  });
  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { protocol: "https:" },
  });
  const s = emptyStore();
  s.carts[0].name = "Wünsche & Möbel";
  for (let i = 0; i < 12; i++)
    s.carts[0].products.push({
      id: String(i),
      name: "Kopfhörer und Zubehör " + i,
      url: "https://example.com/" + i,
      image: "https://example.com/image.jpg",
      price: 8999,
      quantity: 2,
      shop: "Custom link",
    });
  saveStore(s);
  assert.deepEqual(readStore(), s);
  assert.ok(jar.has("jasc_1"));
  const tooLarge = structuredClone(s);
  for (const product of tooLarge.carts[0].products)
    product.image = "https://example.com/" + "x".repeat(1500);
  assert.throws(() => saveStore(tooLarge), /full/);
  assert.deepEqual(readStore(), s);
  jar.set("jasc_0", "%bad");
  assert.deepEqual(readStore(), emptyStore());
});

test("legacy labels are translated without changing user product names or totals", async () => {
  const { normalizeStore } = await import("../src/lib/cart.ts");
  const legacy = emptyStore();
  legacy.carts[0].name = "Mein Warenkorb";
  legacy.carts[0].products.push({
    id: "legacy",
    name: "Mein eigener Produktname",
    url: "https://example.com/item",
    image: "",
    price: 1995,
    quantity: 2,
    shop: "Eigener Link",
  });
  const normalized = normalizeStore(legacy);
  assert.equal(normalized.carts[0].name, "My cart");
  assert.equal(normalized.carts[0].products[0].shop, "Custom link");
  assert.equal(
    normalized.carts[0].products[0].name,
    "Mein eigener Produktname",
  );
  assert.equal(
    normalized.carts[0].products[0].price *
      normalized.carts[0].products[0].quantity,
    3990,
  );
});

test("IDs work in a LAN HTTP context without crypto.randomUUID", async () => {
  const { newId } = await import("../src/lib/cart.ts");
  const original = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  const getRandomValues = crypto.getRandomValues.bind(crypto);
  try {
    Object.defineProperty(globalThis, "crypto", {
      configurable: true,
      value: { getRandomValues },
    });
    const ids = Array.from({ length: 100 }, () => newId());
    assert.equal(new Set(ids).size, 100);
    assert.ok(ids.every((id) => /^[0-9a-f]{32}$/.test(id)));
  } finally {
    if (original) Object.defineProperty(globalThis, "crypto", original);
  }
});
