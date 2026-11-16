"use client";
import { useEffect, useState } from "react";
import { type Cart, money, validStore } from "@/lib/cart";
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
import { ArrowLeft, ArrowUpRight, Copy, ShoppingBag } from "lucide-react";
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
  } | null>(null);
  const [error, setError] = useState("");
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
          if (!controller.signal.aborted) setData(value);
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
        <Badge variant="outline">Shared cart</Badge>
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
                Updates automatically as the owner saves changes. Link expires{" "}
                {new Date(data.expiresAt).toLocaleDateString("en-GB")}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="summary-row">
                <span>
                  {data.cart.products.reduce((sum, p) => sum + p.quantity, 0)}{" "}
                  items · {new Set(data.cart.products.map((p) => p.shop)).size}{" "}
                  {new Set(data.cart.products.map((p) => p.shop)).size === 1
                    ? "shop"
                    : "shops"}
                </span>
                <strong className="shared-total">
                  {money(
                    data.cart.products.reduce(
                      (sum, p) => sum + p.price * p.quantity,
                      0,
                    ),
                  )}
                </strong>
              </div>
            </CardContent>
            <CardFooter className="flex-wrap justify-between gap-3">
              <span className="text-xs text-muted-foreground">
                Excludes additional shipping. Prices reflect the saved cart.
              </span>
              <Button disabled={!ready} onClick={() => onCopy(data.cart)}>
                <Copy data-icon="inline-start" />
                Copy to my carts
              </Button>
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
                </CardHeader>
                <CardContent className="pb-4">
                  <strong>{money(product.price * product.quantity)}</strong>
                  <p className="text-xs text-muted-foreground">
                    {product.quantity} × {money(product.price)}
                  </p>
                </CardContent>
                <CardFooter>
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
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}
    </main>
  );
}
