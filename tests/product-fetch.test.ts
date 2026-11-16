import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  publicAddress,
  publicProductUrl,
} from "../src/lib/server/product-fetch.ts";

test("product import only accepts public HTTPS targets", () => {
  assert.equal(publicProductUrl("https://www.amazon.co.uk/dp/example"), true);
  assert.equal(publicProductUrl("https://shop.example.com/item"), true);
  assert.equal(publicProductUrl("http://shop.example.com/item"), false);
  assert.equal(publicProductUrl("https://127.0.0.1/item"), false);
  assert.equal(publicProductUrl("https://192.168.178.100/item"), false);
  assert.equal(publicProductUrl("https://localhost/item"), false);
  assert.equal(publicProductUrl("https://shop.example.com:444/item"), false);
  assert.equal(
    publicProductUrl("https://user:pass@shop.example.com/item"),
    false,
  );
  assert.equal(publicAddress("10.0.0.4"), false);
  assert.equal(publicAddress("169.254.169.254"), false);
  assert.equal(publicAddress("::1"), false);
  assert.equal(publicAddress("8.8.8.8"), true);
});
