"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  Cookie,
  ImageIcon,
  LayoutGrid,
  Link2,
  List,
  LoaderCircle,
  Minus,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
  Share2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupInput,
  InputGroupAddon,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import {
  type Product,
  type Store,
  emptyStore,
  readStore,
  safeUrl,
  shopFor,
  shops,
  money,
  validStore,
  normalizeStore,
  newId,
} from "@/lib/cart";
import { useWorkspace } from "@/hooks/use-workspace";
import { AccountDialog } from "@/components/cart/account-dialog";
import { ShareDialog } from "@/components/cart/share-dialog";
import { SharedCartView } from "@/components/cart/shared-cart-view";
gsap.registerPlugin(useGSAP);
const staticHost = process.env.NEXT_PUBLIC_STATIC_HOST === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const blank = {
  name: "",
  url: "",
  image: "",
  price: "",
  quantity: "1",
  shop: "Auto-detect",
};
function ProductImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img
      src={src}
      alt={name}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  ) : (
    <div className="image-placeholder">
      <ShoppingBag aria-hidden="true" />
      <span>No image</span>
    </div>
  );
}
function ShopMark({ shop }: { shop: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "shop-mark",
        shop === "Amazon" && "shop-amazon",
        shop === "Kleinanzeigen" && "shop-kleinanzeigen",
      )}
    >
      {shop === "Amazon" ? (
        "a"
      ) : shop === "Kleinanzeigen" ? (
        "k"
      ) : shop === "Custom link" ? (
        <Link2 />
      ) : (
        shop.slice(0, 1)
      )}
    </span>
  );
}
export default function Home() {
  const root = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const workspace = useWorkspace(staticHost);
  const { store, ready, user, status } = workspace;
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All shops");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("grid");
  const [link, setLink] = useState("");
  const [preset, setPreset] = useState("Auto-detect");
  const [editor, setEditor] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState("");
  const [formHint, setFormHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [cartDialog, setCartDialog] = useState<"new" | "rename" | null>(null);
  const [cartName, setCartName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [help, setHelp] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [sharedToken, setSharedToken] = useState("");
  useEffect(() => {
    if (!staticHost)
      setSharedToken(new URL(location.href).searchParams.get("share") || "");
    return () => requestRef.current?.abort();
  }, []);
  const cart = store.carts.find((c) => c.id === store.active) || store.carts[0];
  const total = cart.products.reduce((sum, p) => sum + p.price * p.quantity, 0);
  const count = cart.products.reduce((sum, p) => sum + p.quantity, 0);
  const sources = [...new Set(cart.products.map((p) => p.shop))];
  const visible = cart.products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) &&
        (filter === "All shops" || p.shop === filter),
    )
    .sort((a, b) =>
      sort === "price-asc"
        ? a.price - b.price
        : sort === "price-desc"
          ? b.price - a.price
          : sort === "name"
            ? a.name.localeCompare(b.name, "en")
            : 0,
    );
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(".reveal", {
          y: 15,
          opacity: 0,
          duration: 0.6,
          stagger: 0.07,
          ease: "power2.out",
        });
      });
      return () => mm.revert();
    },
    { scope: root },
  );
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        if (root.current?.querySelector(".product-card"))
          gsap.from(".product-card", {
            y: 10,
            opacity: 0,
            duration: 0.35,
            stagger: 0.035,
            clearProps: "all",
          });
      });
      return () => mm.revert();
    },
    {
      scope: root,
      dependencies: [store.active, cart.products.length, view],
      revertOnUpdate: true,
    },
  );
  function persist(next: Store, message = "") {
    try {
      workspace.persist(next);
      setError("");
      if (message) setNotice(message);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  function products(next: Product[], message = "") {
    return persist(
      {
        ...store,
        carts: store.carts.map((c) =>
          c.id === cart.id ? { ...c, products: next } : c,
        ),
      },
      message,
    );
  }
  function updateQuantity(p: Product, quantity: number) {
    products(
      cart.products.map((item) =>
        item.id === p.id ? { ...item, quantity } : item,
      ),
    );
  }
  function openEditor(product?: Product) {
    requestRef.current?.abort();
    setLoading(false);
    setEditing(product?.id || null);
    setFormError("");
    setFormHint("");
    setForm(
      product
        ? {
            ...product,
            price: (product.price / 100).toFixed(2),
            quantity: String(product.quantity),
          }
        : { ...blank, shop: preset },
    );
    setEditor(true);
  }
  async function lookup(url: string, shop: string) {
    if (!safeUrl(url)) {
      setFormError("Enter a complete http or https URL.");
      return;
    }
    if (
      shop !== "Auto-detect" &&
      shop !== "Custom link" &&
      shopFor(url) !== shop
    ) {
      setFormError(
        "This URL does not match the selected shop. Choose the matching shop or Auto-detect.",
      );
      return;
    }
    if (shop === "Custom link") {
      setFormHint("Enter a name, price and optional image URL.");
      return;
    }
    if (staticHost) {
      setForm((f) => ({
        ...f,
        shop: shop === "Auto-detect" ? shopFor(url) : shop,
      }));
      setFormHint(
        "Shop detected. Enter the name, image and price manually on GitHub Pages. Automatic import requires the server version.",
      );
      return;
    }
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setFormError("");
    setFormHint("");
    try {
      const response = await fetch(`${basePath}/api/product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not load the product.");
      setForm((f) => ({
        ...f,
        name: data.name || f.name,
        image: data.image || "",
        price: data.price === null ? "" : (data.price / 100).toFixed(2),
        shop: data.shop,
      }));
      setFormHint(data.warning);
    } catch (e) {
      if (!controller.signal.aborted) setFormError((e as Error).message);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  function startAdd(e: FormEvent) {
    e.preventDefault();
    if (!safeUrl(link)) {
      setError(
        "Enter a complete product URL, for example https://www.amazon.de/…",
      );
      return;
    }
    openEditor();
    setForm({ ...blank, url: link, shop: preset });
    void lookup(link, preset);
  }
  function saveProduct(e: FormEvent) {
    e.preventDefault();
    const price = Number(form.price.replace(",", "."));
    const quantity = Number(form.quantity);
    if (
      !form.name.trim() ||
      !safeUrl(form.url) ||
      !/^\d+(?:[.,]\d{1,2})?$/.test(form.price) ||
      !Number.isFinite(price) ||
      price < 0 ||
      price > 1000000 ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 999 ||
      (form.image && !safeUrl(form.image))
    ) {
      setFormError(
        "Check the name, URL, price (up to two decimal places), quantity (1–999) and image URL.",
      );
      return;
    }
    const product: Product = {
      id: editing || newId(),
      name: form.name.trim(),
      url: safeUrl(form.url),
      image: safeUrl(form.image),
      price: Math.round(price * 100),
      quantity,
      shop: form.shop === "Auto-detect" ? shopFor(form.url) : form.shop,
    };
    if (
      products(
        editing
          ? cart.products.map((p) => (p.id === editing ? product : p))
          : [product, ...cart.products],
        editing ? "Product updated." : "Product added.",
      )
    ) {
      setEditor(false);
      setLink("");
    } else {
      setFormError(
        user
          ? "Could not save. Check account storage, export a backup or shorten image URLs."
          : "Could not save. Check cookie storage, export a backup or shorten image URLs.",
      );
    }
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(store, null, 2)], { type: "application/json" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "justashoppingcart.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("All carts exported as a backup.");
  }
  async function importData(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error("The file is too large.");
      const next: unknown = JSON.parse(await file.text());
      if (!validStore(next))
        throw new Error("This file does not contain valid carts.");
      const carts = normalizeStore(next).carts.map((c) => ({
        ...c,
        id: newId(),
      }));
      if (store.carts.length + carts.length > 12)
        throw new Error("You can have up to 12 carts.");
      persist(
        { carts: [...store.carts, ...carts], active: carts[0].id },
        "Backup imported as new carts.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
    if (importRef.current) importRef.current.value = "";
  }
  function saveCart(e: FormEvent) {
    e.preventDefault();
    if (!cartName.trim()) return;
    if (cartDialog === "new" && store.carts.length >= 12) {
      setError("You can have up to 12 carts.");
      return;
    }
    const id = newId();
    if (
      persist(
        cartDialog === "new"
          ? {
              carts: [
                ...store.carts,
                { id, name: cartName.trim(), products: [] },
              ],
              active: id,
            }
          : {
              ...store,
              carts: store.carts.map((c) =>
                c.id === cart.id ? { ...c, name: cartName.trim() } : c,
              ),
            },
        "Cart saved.",
      )
    ) {
      setCartDialog(null);
      setQuery("");
      setFilter("All shops");
    }
  }
  function closeSharedView() {
    history.replaceState(null, "", `${basePath}/`);
    setSharedToken("");
  }
  function copySharedCart(shared: import("@/lib/cart").Cart) {
    const copied = { ...shared, id: newId() };
    if (
      persist(
        { carts: [...store.carts, copied], active: copied.id },
        "Shared cart copied. Your edits do not change the original.",
      )
    )
      closeSharedView();
  }
  function importBrowserCarts() {
    const incoming = readStore()
      .carts.filter((c) => c.products.length)
      .map((c) => ({ ...c, id: newId() }));
    if (!incoming.length) {
      setNotice("There are no browser products to import.");
      return;
    }
    const existing =
      store.carts.length === 1 && !store.carts[0].products.length
        ? []
        : store.carts;
    persist(
      { carts: [...existing, ...incoming], active: incoming[0].id },
      "Browser carts imported into your account.",
    );
  }
  if (sharedToken)
    return (
      <SharedCartView
        token={sharedToken}
        onBack={closeSharedView}
        onCopy={copySharedCart}
        ready={ready}
        copyError={error}
      />
    );
  return (
    <div ref={root} className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href={`${basePath}/`}
          aria-label="Just a Shopping Cart home"
        >
          <span className="brand-icon">
            <ShoppingCart />
          </span>
          <span>
            just a<br />
            <strong>
              shopping cart<span className="text-primary">.</span>
            </strong>
          </span>
        </a>
        <div className="sidebar-label">CARTS</div>
        <div className="sidebar-active">
          <ShoppingBag />
          <span>My carts</span>
          <Badge variant="secondary">{store.carts.length}</Badge>
        </div>
        <nav aria-label="Carts" className="cart-nav">
          {store.carts.map((c) => (
            <button
              disabled={!ready}
              aria-current={c.id === cart.id ? "page" : undefined}
              key={c.id}
              onClick={() => {
                persist({ ...store, active: c.id });
                setQuery("");
                setFilter("All shops");
              }}
              className={cn("cart-nav-item", c.id === cart.id && "selected")}
            >
              <span className="cart-dot" />
              <span className="truncate">{c.name}</span>
              <span>{c.products.length}</span>
            </button>
          ))}
        </nav>
        <Button
          disabled={!ready}
          className="new-cart"
          variant="ghost"
          onClick={() => {
            setCartName("");
            setCartDialog("new");
          }}
        >
          <Plus data-icon="inline-start" />
          New cart
        </Button>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck />
            <strong>{user ? "Account storage" : "Browser storage"}</strong>
            <p>
              {user
                ? "Your carts are saved on this server."
                : "Sign in to save carts across devices, or keep using browser cookies."}
            </p>
          </div>
          <Button variant="ghost" onClick={() => setHelp(true)}>
            <Cookie data-icon="inline-start" />
            Storage & help
            <ChevronRight data-icon="inline-end" />
          </Button>
          <div className="sidebar-version">
            JUSTASHOPPINGCART <span>V1.0</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            <ShoppingBag className="size-4" />
            <span>My carts</span>
            <ChevronRight className="size-3" />
            <strong className="truncate">{cart.name}</strong>
          </div>
          <div className="account-actions">
            <Badge variant="outline" role="status">
              <span className="status-dot" />
              {user
                ? status === "saving"
                  ? "Saving…"
                  : status === "saved"
                    ? "Saved to account"
                    : "Not saved"
                : "Saved locally"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              disabled={!ready}
              onClick={() => setAccountOpen(true)}
            >
              <UserRound data-icon="inline-start" />
              {user ? "Account" : "Sign in"}
            </Button>
          </div>
        </header>
        <main className="main-content">
          <section className="page-heading reveal">
            <div>
              <h1>Shopping cart</h1>
              <p>Save product links, edit prices and track your total.</p>
            </div>
          </section>
          {workspace.problem && (
            <Alert variant="destructive" className="mb-5">
              <AlertDescription className="flex flex-col gap-3">
                <span role="status">{workspace.problem}</span>
                <div className="flex flex-wrap gap-2">
                  {status === "error" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={workspace.retry}
                    >
                      Retry save
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void workspace.reload()}
                  >
                    {user ? "Reload saved carts" : "Retry account connection"}
                  </Button>
                  {user && (
                    <Button size="sm" variant="outline" onClick={exportData}>
                      Export my edits
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}
          {user &&
            ready &&
            readStore().carts.some((c) => c.products.length > 0) && (
              <Alert className="mb-5">
                <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                  <span>You also have carts saved in this browser.</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={importBrowserCarts}
                  >
                    Import browser carts
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          {staticHost && (
            <Alert className="mb-5">
              <Link2 />
              <AlertDescription>
                GitHub Pages: save links and calculate totals. Enter product
                details manually. Automatic import is available in the server
                version.
              </AlertDescription>
            </Alert>
          )}
          {(error || notice) && (
            <Alert variant={error ? "destructive" : "default"} className="mb-5">
              <AlertDescription
                className="flex items-center justify-between gap-3"
                aria-live="polite"
              >
                <span>{error || notice}</span>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Dismiss message"
                  onClick={() => {
                    setError("");
                    setNotice("");
                  }}
                >
                  <X />
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <Card className="reveal add-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="size-4" />
                Add a product link
              </CardTitle>
              <CardDescription>
                Import product details or enter them manually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={startAdd} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel className="sr-only" htmlFor="quick-link">
                      Product URL
                    </FieldLabel>
                    <InputGroup className="quick-input">
                      <InputGroupAddon>
                        <Link2 />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="quick-link"
                        type="url"
                        placeholder="Paste a product URL from any shop…"
                        value={link}
                        maxLength={2048}
                        onChange={(e) => setLink(e.target.value)}
                        required
                      />
                      <InputGroupAddon align="inline-end">
                        <Button disabled={!ready} type="submit">
                          <Plus data-icon="inline-start" />
                          <span className="hidden sm:inline">Add product</span>
                          <span className="sm:hidden">Add</span>
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                </FieldGroup>
                <div className="preset-row">
                  <span>Shop preset</span>
                  <ToggleGroup
                    aria-label="Shop preset"
                    value={[preset]}
                    onValueChange={(v) => {
                      if (v[0]) setPreset(String(v[0]));
                    }}
                    size="sm"
                    variant="outline"
                    className="flex-wrap"
                  >
                    {shops.map((s) => (
                      <ToggleGroupItem key={s} value={s}>
                        {s === "Auto-detect" ? (
                          <Sparkles data-icon="inline-start" />
                        ) : s === "Custom link" ? (
                          <Link2 data-icon="inline-start" />
                        ) : null}
                        {s}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </form>
            </CardContent>
            <CardFooter className="gap-2">
              <ShieldCheck className="size-3.5 shrink-0" />
              <span>
                {user
                  ? "Changes are saved automatically to your account on this server."
                  : "Changes are saved in cookies in this browser."}
              </span>
            </CardFooter>
          </Card>
          <div className="cart-heading reveal">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="truncate">{cart.name}</h2>
              <Badge variant="secondary">
                {cart.products.length}{" "}
                {cart.products.length === 1 ? "Product" : "Products"}
              </Badge>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Rename cart"
                disabled={!ready}
                onClick={() => {
                  setCartName(cart.name);
                  setCartDialog("rename");
                }}
              >
                <Pencil />
              </Button>
            </div>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                aria-label="Share cart"
                disabled={
                  !ready ||
                  !cart.products.length ||
                  (!!user && status !== "saved")
                }
                onClick={() => setShareOpen(true)}
              >
                <Share2 data-icon="inline-start" />
                Share
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => importRef.current?.click()}
                disabled={!ready}
              >
                <ArrowUpFromLine data-icon="inline-start" />
                <span className="hidden sm:inline">Import</span>
                <span className="sr-only sm:hidden">Import</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportData}
                disabled={!ready}
              >
                <ArrowDownToLine data-icon="inline-start" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Delete cart"
                disabled={!ready}
                onClick={() => setDeleting(true)}
              >
                <Trash2 />
              </Button>
              <input
                ref={importRef}
                className="hidden"
                aria-label="Import carts"
                type="file"
                accept="application/json,.json"
                onChange={(e) => void importData(e.target.files?.[0])}
              />
            </div>
          </div>
          <div className="cart-layout">
            <section className="products-section reveal" aria-label="Products">
              <div className="toolbar">
                <InputGroup>
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Search products"
                    placeholder="Search products …"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </InputGroup>
                <NativeSelect
                  aria-label="Filter by shop"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <NativeSelectOption>All shops</NativeSelectOption>
                  {sources.map((s) => (
                    <NativeSelectOption key={s}>{s}</NativeSelectOption>
                  ))}
                </NativeSelect>
                <NativeSelect
                  aria-label="Sort products"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <NativeSelectOption value="newest">
                    Newest first
                  </NativeSelectOption>
                  <NativeSelectOption value="price-asc">
                    Price: low to high
                  </NativeSelectOption>
                  <NativeSelectOption value="price-desc">
                    Price: high to low
                  </NativeSelectOption>
                  <NativeSelectOption value="name">Name A–Z</NativeSelectOption>
                </NativeSelect>
                <ToggleGroup
                  aria-label="View"
                  value={[view]}
                  onValueChange={(v) => {
                    if (v[0]) setView(String(v[0]));
                  }}
                  size="sm"
                  variant="outline"
                  spacing={0}
                >
                  <ToggleGroupItem value="grid" aria-label="Grid view">
                    <LayoutGrid />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="List view">
                    <List />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              {!ready ? (
                <p
                  className="py-20 text-center text-muted-foreground"
                  role="status"
                >
                  Loading carts…
                </p>
              ) : !visible.length ? (
                <Empty className="empty-cart">
                  <EmptyHeader>
                    <EmptyMedia>
                      <div className="empty-illustration">
                        <ShoppingBag />
                        <span>
                          <Plus />
                        </span>
                      </div>
                    </EmptyMedia>
                    <EmptyTitle>
                      {cart.products.length
                        ? "No matching products"
                        : "Your cart is empty"}
                    </EmptyTitle>
                    <EmptyDescription>
                      {cart.products.length
                        ? "Try a different search or shop filter."
                        : "Add a product URL, enter its details and track the total cost."}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button onClick={() => openEditor()}>
                      <Plus data-icon="inline-start" />
                      {cart.products.length
                        ? "Add product"
                        : "Add your first product"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Add links from any shop.
                    </span>
                  </EmptyContent>
                </Empty>
              ) : (
                <div
                  className={cn("product-grid", view === "list" && "list-view")}
                >
                  {visible.map((p) => (
                    <Card key={p.id} className="product-card">
                      <div className="product-image">
                        <ProductImage
                          key={p.image}
                          src={p.image}
                          name={p.name}
                        />
                        <Badge variant="secondary" className="product-shop">
                          <ShopMark shop={p.shop} />
                          {p.shop}
                        </Badge>
                        <Button
                          className="product-edit"
                          size="icon-sm"
                          variant="secondary"
                          aria-label={`${p.name} edit`}
                          onClick={() => openEditor(p)}
                        >
                          <Pencil />
                        </Button>
                      </div>
                      <CardHeader>
                        <CardTitle>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="product-title"
                          >
                            {p.name}
                            <ArrowUpRight className="size-3.5 shrink-0" />
                          </a>
                        </CardTitle>
                        <CardDescription className="truncate">
                          {new URL(p.url).hostname.replace("www.", "")}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="product-price">
                        <strong>{money(p.price * p.quantity)}</strong>
                        {p.quantity > 1 && <span>{money(p.price)} / unit</span>}
                      </CardContent>
                      <CardFooter className="justify-between gap-2">
                        <div className="quantity-control">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`${p.name} decrease quantity`}
                            disabled={p.quantity <= 1}
                            onClick={() => updateQuantity(p, p.quantity - 1)}
                          >
                            <Minus />
                          </Button>
                          <span aria-label="Quantity">{p.quantity}</span>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`${p.name} increase quantity`}
                            disabled={p.quantity >= 999}
                            onClick={() => updateQuantity(p, p.quantity + 1)}
                          >
                            <Plus />
                          </Button>
                        </div>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`${p.name} remove`}
                          onClick={() =>
                            products(
                              cart.products.filter((item) => item.id !== p.id),
                              "Product removed.",
                            )
                          }
                        >
                          <Trash2 />
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
              <div className="under-products">
                <span>
                  <Check className="size-3.5" />
                  {user ? "Account storage" : "No account required"}
                </span>
                <span>
                  <Cookie className="size-3.5" />
                  {user ? "Saved on this server" : "Saved in your cookies"}
                </span>
              </div>
            </section>
            <aside className="summary-column reveal">
              <Card className="summary-card">
                <CardHeader>
                  <div className="summary-icon">
                    <ShoppingCart />
                  </div>
                  <CardTitle>Summary</CardTitle>
                  <CardDescription>Current cart totals.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="summary-row">
                    <span>Products</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Shops</span>
                    <strong>{sources.length}</strong>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-muted-foreground">Total</span>
                    <strong className="total" aria-live="polite">
                      {money(total)}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      Excludes additional shipping
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => openEditor()}
                    disabled={!ready}
                  >
                    <Plus data-icon="inline-start" />
                    Add product
                  </Button>
                  <p className="summary-disclaimer">
                    This is a saved list. Open the product link to buy from the
                    shop.
                  </p>
                </CardContent>
                <CardFooter className="gap-2">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>
                    {user ? "Stored in your account" : "Stored in this browser"}
                  </span>
                </CardFooter>
              </Card>
            </aside>
          </div>
          <footer className="page-footer">
            <Button variant="ghost" size="sm" onClick={() => setHelp(true)}>
              <Cookie data-icon="inline-start" />
              Storage & help
            </Button>
            <span>
              just a shopping cart<span className="text-primary">.</span>
            </span>
          </footer>
        </main>
      </div>
      <Dialog
        open={editor}
        onOpenChange={(open) => {
          setEditor(open);
          if (!open) {
            requestRef.current?.abort();
            setLoading(false);
          }
        }}
      >
        <DialogContent className="editor-dialog sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit product" : "Add product"}
            </DialogTitle>
            <DialogDescription>
              Import product details or enter them manually.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProduct} className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="product-shop">Shop preset</FieldLabel>
                <NativeSelect
                  id="product-shop"
                  value={form.shop}
                  onChange={(e) => {
                    requestRef.current?.abort();
                    setLoading(false);
                    setForm({ ...form, shop: e.target.value });
                  }}
                >
                  {shops.map((s) => (
                    <NativeSelectOption key={s}>{s}</NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor="product-url">Product URL</FieldLabel>
                <Input
                  id="product-url"
                  type="url"
                  required
                  value={form.url}
                  maxLength={2048}
                  onChange={(e) => {
                    requestRef.current?.abort();
                    setLoading(false);
                    setForm({ ...form, url: e.target.value });
                  }}
                  placeholder="https://…"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={
                    staticHost || loading || form.shop === "Custom link"
                  }
                  onClick={() => void lookup(form.url, form.shop)}
                >
                  {loading ? (
                    <LoaderCircle
                      className="motion-safe:animate-spin"
                      data-icon="inline-start"
                    />
                  ) : (
                    <Sparkles data-icon="inline-start" />
                  )}
                  {loading
                    ? "Loading product…"
                    : staticHost
                      ? "Requires the server version"
                      : "Import name, image & price"}
                </Button>
              </Field>
              <Field>
                <FieldLabel htmlFor="product-name">Product name</FieldLabel>
                <Input
                  id="product-name"
                  required
                  maxLength={180}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Product name"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="product-price">
                    Unit price (€)
                  </FieldLabel>
                  <Input
                    id="product-price"
                    inputMode="decimal"
                    required
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="0.00"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="product-quantity">Quantity</FieldLabel>
                  <Input
                    id="product-quantity"
                    type="number"
                    min={1}
                    max={999}
                    required
                    value={form.quantity}
                    onChange={(e) =>
                      setForm({ ...form, quantity: e.target.value })
                    }
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="product-image">
                  <ImageIcon className="size-3.5" />
                  Image URL (optional)
                </FieldLabel>
                <Input
                  id="product-image"
                  type="url"
                  maxLength={2048}
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://…/product.jpg"
                />
              </Field>
            </FieldGroup>
            {(formError || formHint) && (
              <Alert variant={formError ? "destructive" : "default"}>
                <AlertDescription aria-live="polite">
                  {formError || formHint}
                </AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditor(false);
                  requestRef.current?.abort();
                  setLoading(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                <Check data-icon="inline-start" />
                {editing ? "Save changes" : "Save product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!cartDialog}
        onOpenChange={(v) => {
          if (!v) setCartDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {cartDialog === "new" ? "New cart" : "Rename cart"}
            </DialogTitle>
            <DialogDescription>
              Keep separate carts for different lists or projects.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveCart} className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="cart-name">Name</FieldLabel>
                <Input
                  autoFocus
                  id="cart-name"
                  required
                  maxLength={60}
                  value={cartName}
                  onChange={(e) => setCartName(e.target.value)}
                  placeholder="For example: Desk setup"
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCartDialog(null)}
              >
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete cart?</DialogTitle>
            <DialogDescription>
              The cart “{cart.name}” and its products will be removed from{" "}
              {user
                ? "your account. Its share links will also be revoked."
                : "this browser."}{" "}
              Export a backup first if needed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const remaining = store.carts.filter((c) => c.id !== cart.id);
                if (
                  persist(
                    remaining.length
                      ? { carts: remaining, active: remaining[0].id }
                      : emptyStore(),
                    "Cart deleted.",
                  )
                ) {
                  setDeleting(false);
                  setFilter("All shops");
                  setQuery("");
                }
              }}
            >
              Delete cart
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="help-dialog sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Storage & help</DialogTitle>
            <DialogDescription>How this tool works.</DialogDescription>
          </DialogHeader>
          <div className="help-content">
            <p>
              <strong>Storage:</strong> In browser mode, carts are stored in
              cookies for up to a year. Signed-in carts are stored on this
              server and load on other devices after signing in. Browser carts
              stay separate until imported. Export backups regularly.
            </p>
            <p>
              <strong>Automatic import:</strong>{" "}
              {staticHost
                ? "Not available on GitHub Pages. Enter product details manually. In the server version: "
                : ""}
              Amazon.de/.com, Kleinanzeigen, eBay.de, OTTO and IKEA are
              supported when the shop provides metadata and allows access. The
              product URL is sent to our server and the shop. Prices are
              snapshots, not live updates. Check the imported details.
            </p>
            <p>
              <strong>Custom link:</strong> For any other shop, enter the name,
              price and image yourself. Images are loaded from the image
              provider you specify.
            </p>
            <p>
              <strong>Cookie storage:</strong> Cookies have limited space. The
              app will tell you when storage is full. Long image URLs use more
              space. Export backups regularly.
            </p>
            <p>
              <strong>Sharing:</strong> Sign in to create read-only snapshot
              links. Anyone with a link can view it without an account. Links
              expire after 30 days, and you can revoke them. Deleting the
              original cart revokes its links.
            </p>
            <p>
              <strong>Total:</strong> All prices are in euros. Totals include
              quantities, but exclude additional shipping, price changes and
              discounts.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setHelp(false)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AccountDialog
        open={accountOpen}
        onOpenChange={setAccountOpen}
        user={user}
        status={status}
        onSession={workspace.reload}
        signOut={workspace.signOut}
        staticHost={staticHost}
      />
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        cart={cart}
        user={user}
        staticHost={staticHost}
        onSignIn={() => {
          setShareOpen(false);
          setAccountOpen(true);
        }}
      />
    </div>
  );
}
