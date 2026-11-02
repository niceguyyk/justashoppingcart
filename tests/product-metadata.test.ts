import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseProduct } from "../src/lib/product-metadata.ts";
test("JSON-LD graphs extract product, offer and relative image", () => {
  const html =
    '<script type="application/ld+json">{"@graph":[{"@type":"Product","name":"Kopfhörer","image":["/foto.jpg"],"offers":{"price":"89.99","priceCurrency":"EUR"}}]}</script>';
  assert.deepEqual(parseProduct(html, "https://www.amazon.de/dp/test"), {
    name: "Kopfhörer",
    image: "https://www.amazon.de/foto.jpg",
    price: 8999,
  });
});
test("Open Graph fallback supports German prices and entities", () => {
  const p = parseProduct(
    '<meta property="og:title" content="Tisch &amp; Stuhl"><meta property="product:price:amount" content="1.299,95"><meta property="og:image" content="https://example.com/image.jpg">',
    "https://www.kleinanzeigen.de/item",
  );
  assert.equal(p.name, "Tisch & Stuhl");
  assert.equal(p.price, 129995);
});
test("missing or non-EUR prices remain unknown, never zero", () => {
  assert.equal(
    parseProduct("<title>Produkt</title>", "https://example.com").price,
    null,
  );
  assert.equal(
    parseProduct(
      '<meta property="og:title" content="Produkt"><meta property="product:price:amount" content="99"><meta property="product:price:currency" content="USD">',
      "https://example.com",
    ).price,
    null,
  );
});
test("blocked shop responses and unsafe images are handled", () => {
  assert.throws(
    () => parseProduct("<title>Robot Check</title>", "https://amazon.de"),
    /blockiert/,
  );
  assert.equal(
    parseProduct(
      '<title>Produkt</title><meta property="og:image" content="javascript:alert(1)">',
      "https://example.com",
    ).image,
    "",
  );
});
