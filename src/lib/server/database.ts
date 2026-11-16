import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import { emptyStore, normalizeStore, validStore, type Cart, type Store } from "../cart.ts";

export class StoreConflict extends Error {}
export function openDatabase(directory: string) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(directory, "shopping-cart.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS cart_workspace (user_id TEXT PRIMARY KEY, content TEXT NOT NULL, version INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS cart_share (token TEXT PRIMARY KEY, owner_id TEXT NOT NULL, cart_id TEXT NOT NULL, content TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS cart_share_owner ON cart_share(owner_id, cart_id);`);
  const columns = db.prepare("PRAGMA table_info(cart_share)").all() as { name: string }[];
  if (!columns.some((column) => column.name === "mode")) {
    try {
      db.exec("ALTER TABLE cart_share ADD COLUMN mode TEXT NOT NULL DEFAULT 'view'");
    } catch (error) {
      const current = db.prepare("PRAGMA table_info(cart_share)").all() as { name: string }[];
      if (!current.some((column) => column.name === "mode")) throw error;
    }
  }
  return db;
}
const runtime = globalThis as typeof globalThis & {
  shoppingCartDb?: DatabaseSync;
};
export function dataDirectory() {
  return process.env.APP_DATA_DIR || join(process.cwd(), "work", "data");
}
export function database() {
  return (runtime.shoppingCartDb ??= openDatabase(dataDirectory()));
}
export function authSecret(directory = dataDirectory()) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const path = join(directory, "auth-secret");
  try {
    writeFileSync(path, randomBytes(48).toString("hex"), {
      flag: "wx",
      mode: 0o600,
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
  }
  const secret = readFileSync(path, "utf8").trim();
  if (secret.length < 32) throw new Error("Invalid authentication secret");
  return secret;
}
export function loadWorkspace(db: DatabaseSync, userId: string) {
  const row = db
    .prepare("SELECT content,version FROM cart_workspace WHERE user_id=?")
    .get(userId) as { content: string; version: number } | undefined;
  return row
    ? { store: normalizeStore(JSON.parse(row.content)), version: row.version }
    : { store: emptyStore(), version: 0 };
}
export function saveWorkspace(
  db: DatabaseSync,
  userId: string,
  store: Store,
  version: number,
) {
  if (!validStore(store) || !Number.isSafeInteger(version) || version < 0)
    throw new Error("Invalid cart data");
  const content = JSON.stringify(normalizeStore(store));
  if (Buffer.byteLength(content) > 1_000_000)
    throw new Error(
      "Account storage limit reached. Shorten image URLs or export older carts.",
    );
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = db
      .prepare("SELECT version,content FROM cart_workspace WHERE user_id=?")
      .get(userId) as { version: number; content: string } | undefined;
    if ((current?.version || 0) !== version)
      throw new StoreConflict("Newer changes were saved on another device.");
    if (current) {
      const retained = new Set(store.carts.map((cart) => cart.id));
      const old = JSON.parse(current.content) as Store;
      for (const cart of old.carts)
        if (!retained.has(cart.id))
          db.prepare(
            "DELETE FROM cart_share WHERE owner_id=? AND cart_id=?",
          ).run(userId, cart.id);
    }
    db.prepare(
      "INSERT INTO cart_workspace(user_id,content,version) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET content=excluded.content,version=excluded.version",
    ).run(userId, content, version + 1);
    db.exec("COMMIT");
    return version + 1;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export type ShareMode = "view" | "edit";
export function createShare(db: DatabaseSync, userId: string, cartId: string, mode: ShareMode = "view") {
  if (mode !== "view" && mode !== "edit") throw new Error("Invalid link permission.");
  const { store } = loadWorkspace(db, userId);
  const cart = store.carts.find((c) => c.id === cartId);
  if (!cart || !cart.products.length)
    throw new Error("Save a cart with at least one product before sharing.");
  const now = Date.now();
  db.prepare("DELETE FROM cart_share WHERE expires_at<=?").run(now);
  const count = db
    .prepare("SELECT COUNT(*) AS total FROM cart_share WHERE owner_id=?")
    .get(userId) as { total: number };
  if (count.total >= 50)
    throw new Error("You have 50 active links. Revoke an older link first.");
  const token = randomBytes(24).toString("hex");
  const expiresAt = now + 30 * 86400000;
  db.prepare("INSERT INTO cart_share(token,owner_id,cart_id,content,created_at,expires_at,mode) VALUES(?,?,?,?,?,?,?)").run(
    token,
    userId,
    cartId,
    JSON.stringify(cart),
    now,
    expiresAt,
    mode,
  );
  return { token, createdAt: now, expiresAt, mode };
}
export function getShare(db: DatabaseSync, token: string) {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  const row = db
    .prepare(
      "SELECT s.cart_id,s.mode,s.created_at,s.expires_at,w.content,w.version FROM cart_share s JOIN cart_workspace w ON w.user_id=s.owner_id WHERE s.token=? AND s.expires_at>?",
    )
    .get(token, Date.now()) as
    | {
        cart_id: string;
        mode: ShareMode;
        created_at: number;
        expires_at: number;
        content: string;
        version: number;
      }
    | undefined;
  if (!row) return null;
  const cart = (JSON.parse(row.content) as Store).carts.find(
    (candidate) => candidate.id === row.cart_id,
  );
  return cart
    ? {
        cart,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        version: row.version,
        mode: row.mode,
      }
    : null;
}
export function saveSharedCart(db: DatabaseSync, token: string, cart: Cart, version: number) {
  if (!/^[a-f0-9]{48}$/.test(token) || !Number.isSafeInteger(version) || version < 0)
    throw new Error("Invalid shared cart.");
  db.exec("BEGIN IMMEDIATE");
  try {
    const row = db.prepare(
      "SELECT s.cart_id,s.owner_id,w.content,w.version FROM cart_share s JOIN cart_workspace w ON w.user_id=s.owner_id WHERE s.token=? AND s.mode='edit' AND s.expires_at>?",
    ).get(token, Date.now()) as { cart_id: string; owner_id: string; content: string; version: number } | undefined;
    if (!row) throw new Error("This edit link has expired or has been revoked.");
    if (row.version !== version) throw new StoreConflict("This cart changed elsewhere. Reload it before saving.");
    const store = JSON.parse(row.content) as Store;
    if (cart.id !== row.cart_id || !store.carts.some((item) => item.id === row.cart_id))
      throw new Error("Invalid shared cart.");
    const next = { ...store, carts: store.carts.map((item) => item.id === row.cart_id ? cart : item) };
    if (!validStore(next)) throw new Error("Invalid cart data.");
    const content = JSON.stringify(normalizeStore(next));
    if (Buffer.byteLength(content) > 1_000_000) throw new Error("Account storage limit reached.");
    db.prepare("UPDATE cart_workspace SET content=?,version=? WHERE user_id=?")
      .run(content, version + 1, row.owner_id);
    db.exec("COMMIT");
    return { cart: normalizeStore(next).carts.find((item) => item.id === row.cart_id)!, version: version + 1 };
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
export function listShares(db: DatabaseSync, userId: string, cartId: string) {
  return db
    .prepare(
      "SELECT token,mode,created_at AS createdAt,expires_at AS expiresAt FROM cart_share WHERE owner_id=? AND cart_id=? AND expires_at>? ORDER BY created_at DESC LIMIT 50",
    )
    .all(userId, cartId, Date.now());
}
export function revokeShare(db: DatabaseSync, userId: string, token: string) {
  return (
    db
      .prepare("DELETE FROM cart_share WHERE token=? AND owner_id=?")
      .run(token, userId).changes > 0
  );
}
