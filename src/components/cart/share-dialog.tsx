"use client";
import { useEffect, useRef, useState } from "react";
import type { Cart } from "@/lib/cart";
import type { AccountUser } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Copy, Link2, LoaderCircle, Share2, Trash2 } from "lucide-react";
type Link = { token: string; createdAt: number; expiresAt: number };
export function ShareDialog({
  open,
  onOpenChange,
  cart,
  user,
  onSignIn,
  staticHost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: Cart;
  user: AccountUser | null;
  onSignIn: () => void;
  staticHost: boolean;
}) {
  const [links, setLinks] = useState<Link[]>([]);
  const [selected, setSelected] = useState<Link | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");
  const input = useRef<HTMLInputElement>(null);
  function linkUrl(token: string) {
    return `${origin}/?share=${token}`;
  }
  useEffect(() => {
    setError("");
    setMessage("");
    setSelected(null);
    setLinks([]);
    setOrigin(location.origin);
    if (!open || !user || staticHost) return;
    const controller = new AbortController();
    fetch(`/api/shares?cartId=${encodeURIComponent(cart.id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setLinks(data.shares);
        setSelected(data.shares[0] || null);
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setError(error.message || "Could not load share links.");
      });
    return () => controller.abort();
  }, [open, user, cart.id, staticHost]);
  async function create() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cartId: cart.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setLinks((current) => [data, ...current]);
      setSelected(data);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function revoke(token: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/shares/${token}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Could not revoke this link.");
      setLinks((current) => current.filter((link) => link.token !== token));
      if (selected?.token === token) setSelected(null);
      setMessage("Link revoked. It can no longer be opened.");
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    if (!selected) return;
    setMessage("");
    const url = linkUrl(selected.token);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setMessage("Link copied.");
        return;
      }
    } catch {}
    input.current?.focus();
    input.current?.select();
    setMessage(
      document.execCommand("copy")
        ? "Link copied."
        : "Select the link above and copy it.",
    );
  }
  async function nativeShare() {
    if (!selected) return;
    try {
      await navigator.share({ title: cart.name, url: linkUrl(selected.token) });
    } catch (error) {
      if ((error as Error).name !== "AbortError")
        setMessage("Use Copy link to share this cart.");
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="share-dialog sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Share cart</DialogTitle>
          <DialogDescription>
            Anyone with a link can view a read-only snapshot. Later edits stay
            private. Links expire after 30 days or when you revoke them.
          </DialogDescription>
        </DialogHeader>
        {staticHost ? (
          <Alert>
            <AlertDescription>
              Share links are available in the server version.
            </AlertDescription>
          </Alert>
        ) : !user ? (
          <>
            <Alert>
              <AlertDescription>
                Sign in to create and manage links. People opening your link do
                not need an account.
              </AlertDescription>
            </Alert>
            <Button onClick={onSignIn}>Sign in or create account</Button>
          </>
        ) : (
          <div className="flex flex-col gap-4">
            <Button
              disabled={busy || !cart.products.length}
              onClick={() => void create()}
            >
              {busy ? (
                <LoaderCircle
                  className="motion-safe:animate-spin"
                  data-icon="inline-start"
                />
              ) : (
                <Link2 data-icon="inline-start" />
              )}
              Create new share link
            </Button>
            {selected && (
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="share-link">Share link</FieldLabel>
                  <Input
                    ref={input}
                    id="share-link"
                    readOnly
                    value={linkUrl(selected.token)}
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => void copy()}>
                      <Copy data-icon="inline-start" />
                      Copy link
                    </Button>
                    {typeof navigator !== "undefined" &&
                      typeof navigator.share === "function" && (
                        <Button
                          variant="outline"
                          onClick={() => void nativeShare()}
                        >
                          <Share2 data-icon="inline-start" />
                          Share link
                        </Button>
                      )}
                  </div>
                </Field>
              </FieldGroup>
            )}
            {!!links.length && (
              <>
                <Separator />
                <p className="text-xs text-muted-foreground">
                  Your active links for this cart
                </p>
                <div className="share-list">
                  {links.map((link) => (
                    <div key={link.token} className="share-row">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs">
                          Created{" "}
                          {new Date(link.createdAt).toLocaleString("en-GB")}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Expires{" "}
                          {new Date(link.expiresAt).toLocaleDateString("en-GB")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelected(link);
                          setMessage("");
                        }}
                      >
                        Use link
                      </Button>
                      <Button
                        aria-label={`Revoke link created ${new Date(link.createdAt).toLocaleString("en-GB")}`}
                        size="icon-sm"
                        variant="destructive"
                        disabled={busy}
                        onClick={() => void revoke(link.token)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription role="status">{error}</AlertDescription>
          </Alert>
        )}
        {message && (
          <Alert>
            <AlertDescription role="status">{message}</AlertDescription>
          </Alert>
        )}
      </DialogContent>
    </Dialog>
  );
}
