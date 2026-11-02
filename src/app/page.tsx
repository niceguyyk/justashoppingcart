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
  saveStore,
  safeUrl,
  shopFor,
  shops,
  money,
  validStore,
} from "@/lib/cart";
gsap.registerPlugin(useGSAP);
const staticHost = process.env.NEXT_PUBLIC_STATIC_HOST === "true";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const blank = {
  name: "",
  url: "",
  image: "",
  price: "",
  quantity: "1",
  shop: "Automatisch",
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
      <span>Dein nächster Fund</span>
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
      ) : shop === "Eigener Link" ? (
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
  const [store, setStore] = useState<Store>(emptyStore);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Alle Shops");
  const [sort, setSort] = useState("newest");
  const [view, setView] = useState("grid");
  const [link, setLink] = useState("");
  const [preset, setPreset] = useState("Automatisch");
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
  useEffect(() => {
    setStore(readStore());
    setReady(true);
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
        (filter === "Alle Shops" || p.shop === filter),
    )
    .sort((a, b) =>
      sort === "price-asc"
        ? a.price - b.price
        : sort === "price-desc"
          ? b.price - a.price
          : sort === "name"
            ? a.name.localeCompare(b.name, "de")
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
      saveStore(next);
      setStore(next);
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
      setFormError("Bitte gib einen vollständigen http- oder https-Link ein.");
      return;
    }
    if (
      shop !== "Automatisch" &&
      shop !== "Eigener Link" &&
      shopFor(url) !== shop
    ) {
      setFormError(
        "Dieser Link passt nicht zum gewählten Shop. Wähle den passenden Shop oder Automatisch.",
      );
      return;
    }
    if (shop === "Eigener Link") {
      setFormHint("Trage Name, Preis und optional einen Bildlink ein.");
      return;
    }
    if (staticHost) {
      setForm((f) => ({
        ...f,
        shop: shop === "Automatisch" ? shopFor(url) : shop,
      }));
      setFormHint(
        "Shop erkannt. Auf GitHub Pages ergänzt du Name, Bild und Preis manuell; automatisches Auslesen benötigt einen Server.",
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
        throw new Error(data.error || "Produkt konnte nicht geladen werden.");
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
        "Bitte füge einen vollständigen Produktlink ein, zum Beispiel https://www.amazon.de/…",
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
        "Bitte prüfe Name, Link, Preis (maximal zwei Nachkommastellen), Menge (1–999) und Bildlink.",
      );
      return;
    }
    const product: Product = {
      id: editing || crypto.randomUUID(),
      name: form.name.trim(),
      url: safeUrl(form.url),
      image: safeUrl(form.image),
      price: Math.round(price * 100),
      quantity,
      shop: form.shop === "Automatisch" ? shopFor(form.url) : form.shop,
    };
    if (
      products(
        editing
          ? cart.products.map((p) => (p.id === editing ? product : p))
          : [product, ...cart.products],
        editing ? "Produkt aktualisiert." : "Produkt im Warenkorb gespeichert.",
      )
    ) {
      setEditor(false);
      setLink("");
    } else {
      setFormError(
        "Speichern fehlgeschlagen. Bitte prüfe den Cookie-Speicher; exportiere bei Bedarf deinen Warenkorb und kürze lange Bildlinks.",
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
    setNotice("Alle Warenkörbe als Sicherung exportiert.");
  }
  async function importData(file?: File) {
    if (!file) return;
    try {
      if (file.size > 100000) throw new Error("Die Datei ist zu groß.");
      const next: unknown = JSON.parse(await file.text());
      if (!validStore(next))
        throw new Error("Diese Datei enthält keine gültigen Warenkörbe.");
      const carts = next.carts.map((c) => ({ ...c, id: crypto.randomUUID() }));
      if (store.carts.length + carts.length > 12)
        throw new Error("Es sind maximal 12 Warenkörbe möglich.");
      persist(
        { carts: [...store.carts, ...carts], active: carts[0].id },
        "Sicherung als neue Warenkörbe importiert.",
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
      setError("Es sind maximal 12 Warenkörbe möglich.");
      return;
    }
    const id = crypto.randomUUID();
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
        "Warenkorb gespeichert.",
      )
    ) {
      setCartDialog(null);
      setQuery("");
      setFilter("Alle Shops");
    }
  }
  return (
    <div ref={root} className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href={`${basePath}/`}
          aria-label="Just a Shopping Cart Startseite"
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
        <div className="sidebar-label">DEIN SAMMELPLATZ</div>
        <div className="sidebar-active">
          <ShoppingBag />
          <span>Meine Warenkörbe</span>
          <Badge variant="secondary">{store.carts.length}</Badge>
        </div>
        <nav aria-label="Warenkörbe" className="cart-nav">
          {store.carts.map((c) => (
            <button
              disabled={!ready}
              aria-current={c.id === cart.id ? "page" : undefined}
              key={c.id}
              onClick={() => {
                persist({ ...store, active: c.id });
                setQuery("");
                setFilter("Alle Shops");
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
          Neuer Warenkorb
        </Button>
        <div className="sidebar-bottom">
          <div className="local-note">
            <ShieldCheck />
            <strong>Deine Funde. Dein Browser.</strong>
            <p>Ohne Konto. Deine Warenkörbe bleiben in deinen Cookies.</p>
          </div>
          <Button variant="ghost" onClick={() => setHelp(true)}>
            <Cookie data-icon="inline-start" />
            Speicherung & Hilfe
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
            <span>Meine Warenkörbe</span>
            <ChevronRight className="size-3" />
            <strong className="truncate">{cart.name}</strong>
          </div>
          <Badge variant="outline">
            <span className="status-dot" />
            Lokal gespeichert
          </Badge>
        </header>
        <main className="main-content">
          <section className="page-heading reveal">
            <div>
              <div className="eyebrow">WENIGER TABS. MEHR ÜBERBLICK.</div>
              <h1>
                Alle deine Wünsche.
                <br />
                <span>Ein Warenkorb.</span>
              </h1>
              <p>
                Sammle deine Lieblingsprodukte aus allen Shops an einem Ort.
              </p>
            </div>
            <span className="hero-cart" aria-hidden="true">
              <ShoppingCart />
              <span className="hero-plus">+</span>
            </span>
          </section>
          {staticHost && (
            <Alert className="mb-5">
              <Link2 />
              <AlertDescription>
                GitHub-Pages-Version: Links sammeln und Preise berechnen. Name,
                Bild und Preis ergänzt du manuell. Automatisches Auslesen von
                Shops benötigt einen Server.
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
                  aria-label="Hinweis schließen"
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
                <span className="text-primary">
                  <Link2 className="size-4" />
                </span>
                Ein Link. Dein nächster Fund.
              </CardTitle>
              <CardDescription>
                Produktlink einfügen. Details übernehmen. Fertig.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={startAdd} className="flex flex-col gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel className="sr-only" htmlFor="quick-link">
                      Produktlink
                    </FieldLabel>
                    <InputGroup className="quick-input">
                      <InputGroupAddon>
                        <Link2 />
                      </InputGroupAddon>
                      <InputGroupInput
                        id="quick-link"
                        type="url"
                        placeholder="Produktlink von Amazon, Kleinanzeigen oder einem anderen Shop …"
                        value={link}
                        maxLength={2048}
                        onChange={(e) => setLink(e.target.value)}
                        required
                      />
                      <InputGroupAddon align="inline-end">
                        <Button disabled={!ready} type="submit">
                          <Plus data-icon="inline-start" />
                          <span className="hidden sm:inline">
                            Produkt hinzufügen
                          </span>
                          <span className="sm:hidden">Hinzufügen</span>
                        </Button>
                      </InputGroupAddon>
                    </InputGroup>
                  </Field>
                </FieldGroup>
                <div className="preset-row">
                  <span>Importieren mit</span>
                  <ToggleGroup
                    aria-label="Shop-Vorlage"
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
                        {s === "Automatisch" ? (
                          <Sparkles data-icon="inline-start" />
                        ) : s === "Eigener Link" ? (
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
                Dein Warenkorb wird automatisch in diesem Browser gespeichert.
              </span>
            </CardFooter>
          </Card>
          <div className="cart-heading reveal">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="truncate">{cart.name}</h2>
              <Badge variant="secondary">
                {cart.products.length}{" "}
                {cart.products.length === 1 ? "Produkt" : "Produkte"}
              </Badge>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Warenkorb umbenennen"
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
                aria-label="Warenkorb löschen"
                disabled={!ready}
                onClick={() => setDeleting(true)}
              >
                <Trash2 />
              </Button>
              <input
                ref={importRef}
                className="hidden"
                aria-label="Warenkörbe importieren"
                type="file"
                accept="application/json,.json"
                onChange={(e) => void importData(e.target.files?.[0])}
              />
            </div>
          </div>
          <div className="cart-layout">
            <section className="products-section reveal" aria-label="Produkte">
              <div className="toolbar">
                <InputGroup>
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    aria-label="Produkte suchen"
                    placeholder="Produkte suchen …"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </InputGroup>
                <NativeSelect
                  aria-label="Nach Shop filtern"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                >
                  <NativeSelectOption>Alle Shops</NativeSelectOption>
                  {sources.map((s) => (
                    <NativeSelectOption key={s}>{s}</NativeSelectOption>
                  ))}
                </NativeSelect>
                <NativeSelect
                  aria-label="Produkte sortieren"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <NativeSelectOption value="newest">
                    Zuletzt hinzugefügt
                  </NativeSelectOption>
                  <NativeSelectOption value="price-asc">
                    Preis aufsteigend
                  </NativeSelectOption>
                  <NativeSelectOption value="price-desc">
                    Preis absteigend
                  </NativeSelectOption>
                  <NativeSelectOption value="name">Name A–Z</NativeSelectOption>
                </NativeSelect>
                <ToggleGroup
                  aria-label="Ansicht"
                  value={[view]}
                  onValueChange={(v) => {
                    if (v[0]) setView(String(v[0]));
                  }}
                  size="sm"
                  variant="outline"
                  spacing={0}
                >
                  <ToggleGroupItem value="grid" aria-label="Rasteransicht">
                    <LayoutGrid />
                  </ToggleGroupItem>
                  <ToggleGroupItem value="list" aria-label="Listenansicht">
                    <List />
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              {!ready ? (
                <p
                  className="py-20 text-center text-muted-foreground"
                  role="status"
                >
                  Deine Warenkörbe werden geladen …
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
                        ? "Kein passender Fund"
                        : "Hier ist Platz für deine Wünsche."}
                    </EmptyTitle>
                    <EmptyDescription>
                      {cart.products.length
                        ? "Passe deine Suche oder den Shop-Filter an."
                        : "Von der neuen Couch bis zum nächsten Setup: Speichere deinen ersten Produktlink und behalte die Kosten im Blick."}
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button onClick={() => openEditor()}>
                      <Plus data-icon="inline-start" />
                      {cart.products.length
                        ? "Produkt hinzufügen"
                        : "Erstes Produkt hinzufügen"}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Jeder Shop. Alles an einem Ort.
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
                          aria-label={`${p.name} bearbeiten`}
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
                        {p.quantity > 1 && (
                          <span>{money(p.price)} / Stück</span>
                        )}
                      </CardContent>
                      <CardFooter className="justify-between gap-2">
                        <div className="quantity-control">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`${p.name} Menge verringern`}
                            disabled={p.quantity <= 1}
                            onClick={() => updateQuantity(p, p.quantity - 1)}
                          >
                            <Minus />
                          </Button>
                          <span aria-label="Menge">{p.quantity}</span>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            aria-label={`${p.name} Menge erhöhen`}
                            disabled={p.quantity >= 999}
                            onClick={() => updateQuantity(p, p.quantity + 1)}
                          >
                            <Plus />
                          </Button>
                        </div>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={`${p.name} entfernen`}
                          onClick={() =>
                            products(
                              cart.products.filter((item) => item.id !== p.id),
                              "Produkt entfernt.",
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
                  Kein Konto erforderlich
                </span>
                <span>
                  <Cookie className="size-3.5" />
                  In deinen Cookies gespeichert
                </span>
              </div>
            </section>
            <aside className="summary-column reveal">
              <Card className="summary-card">
                <CardHeader>
                  <div className="summary-icon">
                    <ShoppingCart />
                  </div>
                  <CardTitle>Dein Überblick</CardTitle>
                  <CardDescription>Große Pläne. Klare Zahlen.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div className="summary-row">
                    <span>Produkte</span>
                    <strong>{count}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Shops</span>
                    <strong>{sources.length}</strong>
                  </div>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <span className="text-sm text-muted-foreground">
                      Gesamtsumme
                    </span>
                    <strong className="total" aria-live="polite">
                      {money(total)}
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      Ohne zusätzliche Versandkosten
                    </span>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => openEditor()}
                    disabled={!ready}
                  >
                    <Plus data-icon="inline-start" />
                    Weiteren Fund hinzufügen
                  </Button>
                  <p className="summary-disclaimer">
                    Deine persönliche Merkliste. Der Kauf findet direkt beim
                    jeweiligen Shop statt.
                  </p>
                </CardContent>
                <CardFooter className="gap-2">
                  <ShieldCheck className="size-4 shrink-0" />
                  <span>Nur in deinem Browser gespeichert</span>
                </CardFooter>
              </Card>
              <div className="tip">
                <Sparkles className="size-4" />
                <div>
                  <strong>Gute Funde brauchen keinen Tab.</strong>
                  <p>
                    Link kopieren, hier einfügen und später in Ruhe entscheiden.
                  </p>
                </div>
              </div>
              <div className="shops-note">
                <span>DEINE LIEBLINGSSHOPS, VEREINT.</span>
                <div>
                  <strong>amazon</strong>
                  <strong>kleinanzeigen</strong>
                  <strong>ebay</strong>
                  <span>+ mehr</span>
                </div>
              </div>
            </aside>
          </div>
          <footer className="page-footer">
            <Button variant="ghost" size="sm" onClick={() => setHelp(true)}>
              <Cookie data-icon="inline-start" />
              Speicherung & Hilfe
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
              {editing ? "Produkt bearbeiten" : "Neuen Fund hinzufügen"}
            </DialogTitle>
            <DialogDescription>
              Übernimm die Shop-Daten oder trage deine eigenen Angaben ein.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveProduct} className="flex flex-col gap-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="product-shop">Shop-Vorlage</FieldLabel>
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
                <FieldLabel htmlFor="product-url">Produktlink</FieldLabel>
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
                    staticHost || loading || form.shop === "Eigener Link"
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
                    ? "Produkt wird geladen …"
                    : staticHost
                      ? "Nur mit Server verfügbar"
                      : "Name, Bild & Preis auslesen"}
                </Button>
              </Field>
              <Field>
                <FieldLabel htmlFor="product-name">Produktname</FieldLabel>
                <Input
                  id="product-name"
                  required
                  maxLength={180}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Was hast du entdeckt?"
                />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="product-price">
                    Preis pro Stück (€)
                  </FieldLabel>
                  <Input
                    id="product-price"
                    inputMode="decimal"
                    required
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                    placeholder="0,00"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="product-quantity">Menge</FieldLabel>
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
                  Bildlink (optional)
                </FieldLabel>
                <Input
                  id="product-image"
                  type="url"
                  maxLength={2048}
                  value={form.image}
                  onChange={(e) => setForm({ ...form, image: e.target.value })}
                  placeholder="https://…/produkt.jpg"
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
                Abbrechen
              </Button>
              <Button type="submit" disabled={loading}>
                <Check data-icon="inline-start" />
                {editing ? "Änderungen speichern" : "Im Warenkorb speichern"}
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
              {cartDialog === "new"
                ? "Ein neuer Warenkorb"
                : "Warenkorb umbenennen"}
            </DialogTitle>
            <DialogDescription>
              Ein Platz für dein nächstes Projekt oder deine Wunschliste.
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
                  placeholder="Zum Beispiel: Mein neues Setup"
                />
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCartDialog(null)}
              >
                Abbrechen
              </Button>
              <Button type="submit">Speichern</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Warenkorb löschen?</DialogTitle>
            <DialogDescription>
              „{cart.name}“ und die enthaltenen Produkte werden aus deinen
              Cookies entfernt. Du kannst vorher eine Sicherung exportieren.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(false)}>
              Abbrechen
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
                    "Warenkorb gelöscht.",
                  )
                ) {
                  setDeleting(false);
                  setFilter("Alle Shops");
                  setQuery("");
                }
              }}
            >
              Warenkorb löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="help-dialog sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Deine Funde bleiben bei dir.</DialogTitle>
            <DialogDescription>
              So funktioniert Just a Shopping Cart.
            </DialogDescription>
          </DialogHeader>
          <div className="help-content">
            <p>
              <strong>Speicherung:</strong> Deine Warenkörbe werden für bis zu
              einem Jahr in Cookies dieses Browsers gespeichert. Löschst du die
              Cookies, verschwinden auch deine Warenkörbe. Es gibt keine
              Synchronisierung zwischen Geräten. Mit Export und Import kannst du
              Sicherungen übertragen.
            </p>
            <p>
              <strong>Automatischer Import:</strong>{" "}
              {staticHost
                ? "Auf GitHub Pages nicht verfügbar. Trage Name, Bild und Preis manuell ein. In der Server-Version gilt: "
                : ""}
              Amazon.de/.com, Kleinanzeigen, eBay.de, OTTO und IKEA werden
              unterstützt, sofern die Seite Produktdaten bereitstellt und den
              Abruf erlaubt. Der Produktlink wird dafür an unseren Server und
              den jeweiligen Shop gesendet. Preise werden beim Import
              ausgelesen, nicht laufend aktualisiert. Bitte prüfe alle Angaben.
            </p>
            <p>
              <strong>Eigener Link:</strong> Bei jedem anderen Shop kannst du
              Name, Preis und Bild selbst eintragen. Produktbilder werden vom
              angegebenen Bildanbieter geladen.
            </p>
            <p>
              <strong>Cookie-Speicher:</strong> Cookies bieten begrenzten Platz.
              Bei einer vollen Liste erhältst du einen Hinweis. Lange Bildlinks
              benötigen besonders viel Platz. Exportiere regelmäßig eine
              Sicherung.
            </p>
            <p>
              <strong>Gesamtsumme:</strong> Alle Preise sind in Euro. Mengen
              werden berücksichtigt; zusätzliche Versandkosten, Preisänderungen
              und Gutscheine sind nicht enthalten.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setHelp(false)}>Verstanden</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

