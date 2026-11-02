import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  openDatabase,
  loadWorkspace,
  saveWorkspace,
  createShare,
  getShare,
  revokeShare,
  listShares,
  StoreConflict,
  authSecret,
} from "../src/lib/server/database.ts";
import { emptyStore } from "../src/lib/cart.ts";

test("account isolation, optimistic concurrency and persistent restart", () => {
  const path = mkdtempSync(join(tmpdir(), "shopping-cart-db-"));
  let db = openDatabase(path);
  try {
    const store = emptyStore();
    store.carts[0].products.push({
      id: "p1",
      name: "Lamp",
      url: "https://example.com/lamp",
      image: "",
      price: 2995,
      quantity: 2,
      shop: "Custom link",
    });
    assert.equal(saveWorkspace(db, "owner", store, 0), 1);
    assert.equal(
      loadWorkspace(db, "other-user").store.carts[0].products.length,
      0,
    );
    assert.throws(() => saveWorkspace(db, "owner", store, 0), StoreConflict);
    assert.equal(loadWorkspace(db, "owner").version, 1);
    const secret = authSecret(path);
    db.close();
    db = openDatabase(path);
    assert.equal(authSecret(path), secret);
    assert.equal(
      loadWorkspace(db, "owner").store.carts[0].products[0].price,
      2995,
    );
  } finally {
    db.close();
    rmSync(path, { recursive: true, force: true });
  }
});
test("share snapshots are immutable, private to their owner for management, revocable and expiring", () => {
  const path = mkdtempSync(join(tmpdir(), "shopping-cart-share-"));
  const db = openDatabase(path);
  try {
    const store = emptyStore();
    store.carts[0].products.push({
      id: "p1",
      name: "Original",
      url: "https://example.com/item",
      image: "",
      price: 1000,
      quantity: 1,
      shop: "Custom link",
    });
    saveWorkspace(db, "owner", store, 0);
    const share = createShare(db, "owner", store.active);
    assert.equal(share.token.length, 48);
    assert.equal(listShares(db, "other-user", store.active).length, 0);
    store.carts[0].products[0].name = "Changed";
    saveWorkspace(db, "owner", store, 1);
    assert.equal(getShare(db, share.token)?.cart.products[0].name, "Original");
    assert.equal(revokeShare(db, "other-user", share.token), false);
    assert.ok(getShare(db, share.token));
    assert.equal(revokeShare(db, "owner", share.token), true);
    assert.equal(getShare(db, share.token), null);
    const expired = createShare(db, "owner", store.active);
    db.prepare("UPDATE cart_share SET expires_at=0 WHERE token=?").run(
      expired.token,
    );
    assert.equal(getShare(db, expired.token), null);
    const deleted = createShare(db, "owner", store.active);
    const replacement = emptyStore();
    replacement.carts[0].id = "another";
    replacement.active = "another";
    saveWorkspace(db, "owner", replacement, 2);
    assert.equal(getShare(db, deleted.token), null);
  } finally {
    db.close();
    rmSync(path, { recursive: true, force: true });
  }
});
