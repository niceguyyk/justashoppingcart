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
} from "../src/lib/cart.ts";

test("shop detection cannot be spoofed with a suffix", () => {
  assert.equal(shopFor("https://www.amazon.de/dp/test"), "Amazon");
  assert.equal(
    shopFor("https://amazon.de.attacker.example/item"),
    "Eigener Link",
  );
  assert.equal(
    shopFor("https://www.kleinanzeigen.de/s-anzeige/abc"),
    "Kleinanzeigen",
  );
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("https://user:pass@example.com"), "");
});
test("Euro prices format from integer cents", () => {
  assert.match(money(8999 * 3), /269,97/);
  assert.match(money(10 + 20), /0,30/);
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
    shop: "Eigener Link",
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
      shop: "Eigener Link",
    });
  saveStore(s);
  assert.deepEqual(readStore(), s);
  assert.ok(jar.has("jasc_1"));
  const tooLarge = structuredClone(s);
  tooLarge.carts[0].products[0].image =
    "https://example.com/" + "x".repeat(10000);
  assert.throws(() => saveStore(tooLarge), /voll/);
  assert.deepEqual(readStore(), s);
  jar.set("jasc_0", "%bad");
  assert.deepEqual(readStore(), emptyStore());
});
