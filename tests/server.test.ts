import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  openDatabase,
  loadWorkspace,
  saveWorkspace,
  createShare,
  saveSharedCart,
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

test("edit links update only their cart and reject stale, revoked and view-only writes", () => {
  const path = mkdtempSync(join(tmpdir(), "shopping-cart-collab-"));
  const db = openDatabase(path);
  try {
    const store = emptyStore();
    store.carts[0].products.push({ id: "a", name: "Original", url: "https://example.com/a", image: "", price: 1200, quantity: 1, shop: "Custom link" });
    store.carts.push({ id: "private", name: "Private", products: [] });
    saveWorkspace(db, "owner", store, 0);
    const view = createShare(db, "owner", store.active);
    const edit = createShare(db, "owner", store.active, "edit");
    assert.equal(getShare(db, view.token)?.mode, "view");
    assert.equal(getShare(db, edit.token)?.mode, "edit");
    const changed = { ...store.carts[0], products: [{ ...store.carts[0].products[0], notes: "Together", status: "bought" as const }] };
    assert.throws(() => saveSharedCart(db, view.token, changed, 1));
    assert.equal(saveSharedCart(db, edit.token, changed, 1).version, 2);
    assert.equal(getShare(db, view.token)?.cart.products[0].notes, "Together");
    assert.equal(loadWorkspace(db, "owner").store.carts[1].name, "Private");
    assert.throws(() => saveSharedCart(db, edit.token, changed, 1), StoreConflict);
    revokeShare(db, "owner", edit.token);
    assert.throws(() => saveSharedCart(db, edit.token, changed, 2));
  } finally { db.close(); rmSync(path, { recursive: true, force: true }); }
});

test("existing share tables gain view-only permission without losing links", () => {
  const path = mkdtempSync(join(tmpdir(), "shopping-cart-migrate-"));
  const legacy = new DatabaseSync(join(path, "shopping-cart.sqlite"));
  legacy.exec("CREATE TABLE cart_share (token TEXT PRIMARY KEY, owner_id TEXT NOT NULL, cart_id TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL)");
  legacy.prepare("INSERT INTO cart_share VALUES(?,?,?,?,?,?)").run("a".repeat(48), "owner", "cart", "{}", 1, Date.now() + 10000);
  legacy.close();
  const db = openDatabase(path);
  try {
    const row = db.prepare("SELECT mode FROM cart_share WHERE token=?").get("a".repeat(48)) as { mode: string };
    assert.equal(row.mode, "view");
  } finally { db.close(); rmSync(path, { recursive: true, force: true }); }
});
test("share links follow the saved cart, remain owner-controlled, revocable and expiring", () => {
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
    assert.equal(getShare(db, share.token)?.cart.products[0].name, "Changed");
    assert.equal(getShare(db, share.token)?.version, 2);
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
