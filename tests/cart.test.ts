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
} from "../src/lib/cart.ts";

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
