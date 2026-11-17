"use client";
import { useEffect, useState, type FormEvent } from "react";
import { type Cart, type Product, money, validStore, safeUrl, shopFor, newId, findDuplicate, cartTotals } from "@/lib/cart";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { ArrowLeft, ArrowUpRight, Copy, ShoppingBag, Pencil, Plus, Trash2, Sparkles } from "lucide-react";
const blank = { name: "", url: "", image: "", price: "", quantity: "1", shop: "Custom link", notes: "", status: "planned" as "planned" | "later" | "bought" };
export function SharedCartView({
  token,
  onBack,
  onCopy,
  ready,
  copyError,
}: {
  token: string;
  onBack: () => void;
  onCopy: (cart: Cart) => void;
  ready: boolean;
  copyError?: string;
}) {
  const [data, setData] = useState<{
    cart: Cart;
    createdAt: number;
    expiresAt: number;
    version: number;
    mode: "view" | "edit";
  } | null>(null);
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");
  const [editor, setEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVersion, setEditVersion] = useState(0);
  const [draft, setDraft] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const [duplicate, setDuplicate] = useState<Product | null>(null);
  const totals = cartTotals(data?.cart.products || []);
  const hasDeferredProducts = data?.cart.products.some((product) => product.status === "later" || product.status === "bought");
  async function reload() {
    const response = await fetch(`/api/shares/${encodeURIComponent(token)}`, { cache: "no-store" });
    const value = await response.json();
    if (!response.ok) throw new Error(value.error || "Could not reload this cart.");
    if (!validStore({ carts: [value.cart], active: value.cart.id })) throw new Error("Invalid shared cart.");
    setData((current) => !current || value.version >= current.version ? value : current);
  }
  async function writeCart(next: Cart, version: number) {
    setBusy(true);
    setEditError("");
    try {
      const response = await fetch(`/api/shares/${encodeURIComponent(token)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: next, version }),
      });
      const value = await response.json();
      if (!response.ok) {
        if (response.status === 409) await reload();
        throw new Error(value.error || "Could not save this cart.");
      }
      setData((current) => current ? { ...current, cart: value.cart, version: value.version } : current);
      setEditor(false);
      setDuplicate(null);
      return true;
    } catch (problem) {
      setEditError((problem as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  function openEditor(product?: Product) {
    if (!data || data.mode !== "edit") return;
    setEditingId(product?.id || null);
    setEditVersion(data.version);
    setDraft(product ? { ...product, price: (product.price / 100).toFixed(2), quantity: String(product.quantity), notes: product.notes || "", status: product.status || "planned" } : blank);
    setEditError("");
    setDuplicate(null);
    setEditor(true);
  }
  async function importProduct() {
    if (!safeUrl(draft.url)) { setEditError("Enter a complete product URL."); return; }
    setImporting(true);
    setEditError("");
    try {
      const response = await fetch("/api/product", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: draft.url }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not import product details.");
      setDraft((current) => ({ ...current, name: result.name || current.name, image: result.image || current.image, price: result.price == null ? current.price : (result.price / 100).toFixed(2), shop: result.shop || current.shop }));
      if (result.warning) setEditError(result.warning);
    } catch (problem) { setEditError((problem as Error).message); }
    finally { setImporting(false); }
  }
  function saveProduct(event: Pick<FormEvent, "preventDefault">, allowDuplicate = false) {
    event.preventDefault();
    if (!data || data.mode !== "edit") return;
    const price = Number(draft.price.replace(",", "."));
    const quantity = Number(draft.quantity);
    if (!draft.name.trim() || !safeUrl(draft.url) || !/^\d+(?:[.,]\d{1,2})?$/.test(draft.price) || !Number.isFinite(price) || price < 0 || price > 1000000 || !Number.isInteger(quantity) || quantity < 1 || quantity > 999 || (draft.image && !safeUrl(draft.image)) || draft.notes.length > 500) {
      setEditError("Check the name, URL, EUR price, quantity, notes and image URL."); return;
    }
    const product: Product = { id: editingId || newId(), name: draft.name.trim(), url: safeUrl(draft.url), image: safeUrl(draft.image), price: Math.round(price * 100), quantity, shop: draft.shop || shopFor(draft.url), notes: draft.notes.trim(), status: draft.status };
    const match = !editingId && findDuplicate(data.cart.products, product.url);
    if (match && !allowDuplicate) { setDuplicate(match); return; }
    const products = editingId ? data.cart.products.map((item) => item.id === editingId ? product : item) : [product, ...data.cart.products];
    void writeCart({ ...data.cart, products }, editVersion);
  }
  useEffect(() => {
    setError("");
    setData(null);
    const controller = new AbortController();
    const refresh = () =>
      fetch(`/api/shares/${encodeURIComponent(token)}`, {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          const value = await response.json();
          if (!response.ok)
            throw new Error(value.error || "Could not open this link.");
          if (
            !value.cart ||
            !validStore({ carts: [value.cart], active: value.cart.id })
          )
            throw new Error("Invalid shared cart.");
          if (!controller.signal.aborted) setData((current) => !current || value.version >= current.version ? value : current);
        })
        .catch((error) => {
          if (!controller.signal.aborted) setError(error.message);
        });
    void refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 10000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      controller.abort();
    };
  }, [token]);
  return (
    <main className="shared-page">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft data-icon="inline-start" />
          My carts
        </Button>
        <Badge variant="outline">{data?.mode === "edit" ? "Can edit" : "View only"}</Badge>
      </div>
      {copyError && (
        <Alert variant="destructive">
          <AlertDescription>{copyError}</AlertDescription>
        </Alert>
      )}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : !data ? (
        <p role="status" className="py-16 text-center text-muted-foreground">
          Loading shared cart…
        </p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <Badge variant="secondary" className="mb-2 w-fit">
                Live shared cart
              </Badge>
              <CardTitle>
                <h1>{data.cart.name}</h1>
              </CardTitle>
              <CardDescription>
                Updates automatically when anyone saves changes. Link expires{" "}
                {new Date(data.expiresAt).toLocaleDateString("en-GB")}.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="summary-row">
                <span>
                  {data.cart.products.reduce((sum, p) => sum + p.quantity, 0)}{" "}
                  items · {new Set(data.cart.products.map((p) => p.shop)).size}{" "}
                  {new Set(data.cart.products.map((p) => p.shop)).size === 1
                    ? "shop"
                    : "shops"}
                </span>
              </div>
              <div className="flex items-end justify-between gap-3">
                <span className="text-sm text-muted-foreground">Buy now</span>
                <strong className="shared-total" aria-live="polite">{money(totals.now)}</strong>
              </div>
              {hasDeferredProducts && <div className="flex flex-col gap-3 border-t border-border pt-4" aria-live="polite">
                <div className="summary-row"><span>For later</span><strong>{money(totals.later)}</strong></div>
                <div className="summary-row"><span>Bought</span><strong>{money(totals.bought)}</strong></div>
                <div className="summary-row border-t border-border pt-3"><span>All items</span><strong>{money(totals.all)}</strong></div>
              </div>}
            </CardContent>
            <CardFooter className="flex-wrap justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Excludes additional shipping. Prices reflect the saved cart.
              </span>
              <div className="flex flex-wrap gap-2">
                {data.mode === "edit" && <Button onClick={() => openEditor()}><Plus data-icon="inline-start" />Add product</Button>}
                <Button variant="outline" disabled={!ready} onClick={() => onCopy(data.cart)}><Copy data-icon="inline-start" />Copy to my carts</Button>
              </div>
            </CardFooter>
          </Card>
          <div className="shared-products">
            {data.cart.products.map((product) => (
              <Card key={product.id} className="shared-product-card gap-0 py-0">
                <div className="shared-image">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <ShoppingBag className="size-10 text-muted-foreground" />
                  )}
                </div>
                <CardHeader className="gap-2 py-4">
                  <CardTitle>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start justify-between gap-2"
                    >
                      {product.name}
                      <ArrowUpRight className="size-4 shrink-0" />
                    </a>
                  </CardTitle>
                  <CardDescription>{product.shop}</CardDescription>
                  {product.status && product.status !== "planned" && <Badge variant="outline" className="w-fit">{product.status === "later" ? "For later" : "Bought"}</Badge>}
                  {product.notes && <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{product.notes}</p>}
                </CardHeader>
                <CardContent className="pb-4">
                  <strong>{money(product.price * product.quantity)}</strong>
                  <p className="text-xs text-muted-foreground">
                    {product.quantity} × {money(product.price)}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      />
                    }
                  >
                    Open product
                    <ArrowUpRight data-icon="inline-end" />
                  </Button>
                  {data.mode === "edit" && <>
                    <Button variant="outline" onClick={() => openEditor(product)}><Pencil data-icon="inline-start" />Edit</Button>
                    <Button variant="ghost" aria-label={`Remove ${product.name}`} disabled={busy} onClick={() => void writeCart({ ...data.cart, products: data.cart.products.filter((item) => item.id !== product.id) }, data.version)}><Trash2 /></Button>
                  </>}
                </CardFooter>
              </Card>
            ))}
          </div>
          {editError && !editor && <Alert variant="destructive"><AlertDescription role="status">{editError}</AlertDescription></Alert>}
        </>
      )}
      <Dialog open={editor} onOpenChange={setEditor}>
        <DialogContent className="sm:max-w-lg max-h-[calc(100dvh-32px)] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingId ? "Edit product" : "Add product"}</DialogTitle><DialogDescription>Changes appear for everyone with a link to this cart.</DialogDescription></DialogHeader>
          <form onSubmit={saveProduct} className="flex flex-col gap-4">
            <FieldGroup>
              <Field><FieldLabel htmlFor="shared-url">Product URL</FieldLabel><Input id="shared-url" type="url" required maxLength={2048} value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /><Button type="button" variant="outline" disabled={importing || busy} onClick={() => void importProduct()}><Sparkles data-icon="inline-start" />{importing ? "Importing…" : "Import name, image & price"}</Button></Field>
              <Field><FieldLabel htmlFor="shared-name">Product name</FieldLabel><Input id="shared-name" required maxLength={180} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field><FieldLabel htmlFor="shared-price">Unit price (€)</FieldLabel><Input id="shared-price" required inputMode="decimal" value={draft.price} onChange={(event) => setDraft({ ...draft, price: event.target.value })} /></Field>
                <Field><FieldLabel htmlFor="shared-quantity">Quantity</FieldLabel><Input id="shared-quantity" type="number" min={1} max={999} required value={draft.quantity} onChange={(event) => setDraft({ ...draft, quantity: event.target.value })} /></Field>
              </div>
              <Field><FieldLabel htmlFor="shared-image">Image URL (optional)</FieldLabel><Input id="shared-image" type="url" maxLength={2048} value={draft.image} onChange={(event) => setDraft({ ...draft, image: event.target.value })} /></Field>
              <Field><FieldLabel htmlFor="shared-status">Status</FieldLabel><NativeSelect id="shared-status" value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as "planned" | "later" | "bought" })}><NativeSelectOption value="planned">Planned</NativeSelectOption><NativeSelectOption value="later">For later</NativeSelectOption><NativeSelectOption value="bought">Bought</NativeSelectOption></NativeSelect></Field>
              <Field><FieldLabel htmlFor="shared-notes">Notes (optional)</FieldLabel><Textarea id="shared-notes" maxLength={500} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></Field>
            </FieldGroup>
            {duplicate && <Alert><AlertDescription>“{duplicate.name}” already uses this link. <Button type="button" variant="outline" size="sm" className="mt-2" disabled={busy || duplicate.quantity + Number(draft.quantity) > 999} onClick={() => { if (!data) return; void writeCart({ ...data.cart, products: data.cart.products.map((item) => item.id === duplicate.id ? { ...item, quantity: item.quantity + Number(draft.quantity) } : item) }, editVersion); }}>Increase its quantity</Button> <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={(event) => saveProduct(event, true)}>Add separately</Button></AlertDescription></Alert>}
            {editError && <Alert variant="destructive"><AlertDescription role="status">{editError}</AlertDescription></Alert>}
            <DialogFooter><Button type="button" variant="outline" onClick={() => setEditor(false)}>Cancel</Button><Button type="submit" disabled={busy || importing}>Save product</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}
