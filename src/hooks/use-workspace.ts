"use client";
import { useEffect, useRef, useState } from "react";
import {
  emptyStore,
  normalizeStore,
  readStore,
  saveStore,
  validStore,
  type Store,
} from "@/lib/cart";
import { authClient } from "@/lib/auth-client";
export type AccountUser = { id: string; name: string; email: string };
export type SaveStatus = "local" | "saved" | "saving" | "error" | "conflict";
export function useWorkspace(staticHost: boolean) {
  const [store, setStore] = useState<Store>(emptyStore);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<SaveStatus>("local");
  const [problem, setProblem] = useState("");
  const userRef = useRef<AccountUser | null>(null);
  const version = useRef(0);
  const pending = useRef<Store | null>(null);
  const running = useRef(false);
  const generation = useRef(0);
  const alive = useRef(true);
  const storeRef = useRef(store);
  storeRef.current = store;
  async function loadAccount() {
    const epoch = ++generation.current;
    pending.current = null;
    setReady(false);
    setProblem("");
    try {
      const response = await fetch("/api/account", { cache: "no-store" });
      if (!response.ok)
        throw new Error(
          "Account storage is unavailable. Your browser carts are still available.",
        );
      const data = await response.json();
      if (!alive.current || generation.current !== epoch) return;
      if (
        data.user &&
        (!validStore(data.store) || !Number.isSafeInteger(data.version))
      )
        throw new Error("Could not read account carts.");
      userRef.current = data.user || null;
      setUser(userRef.current);
      version.current = data.version || 0;
      setStore(data.user ? normalizeStore(data.store) : readStore());
      setStatus(data.user ? "saved" : "local");
    } catch (error) {
      if (alive.current && generation.current === epoch) {
        userRef.current = null;
        setUser(null);
        setStore(readStore());
        setStatus("local");
        setProblem((error as Error).message);
      }
    } finally {
      if (alive.current && generation.current === epoch) setReady(true);
    }
  }
  useEffect(() => {
    alive.current = true;
    setStore(readStore());
    if (staticHost) setReady(true);
    else void loadAccount();
    return () => {
      alive.current = false;
      ++generation.current;
    };
    // Workspace initialization runs once, before any editing is enabled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staticHost]);
  useEffect(() => {
    if (!user || status === "saved") return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [user, status]);
  async function pump() {
    if (running.current || !userRef.current) return;
    running.current = true;
    const epoch = generation.current;
    try {
      while (
        pending.current &&
        userRef.current &&
        epoch === generation.current
      ) {
        const next = pending.current;
        pending.current = null;
        try {
          const response = await fetch("/api/account", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ store: next, version: version.current }),
          });
          const data = await response.json();
          if (!alive.current || epoch !== generation.current) return;
          if (!response.ok) {
            pending.current = pending.current || next;
            setStatus(response.status === 409 ? "conflict" : "error");
            setProblem(
              data.error ||
                "Could not save to your account. Export a backup, then retry or reload the saved carts.",
            );
            return;
          }
          version.current = data.version;
        } catch {
          if (!alive.current || epoch !== generation.current) return;
          pending.current = pending.current || next;
          setStatus("error");
          setProblem(
            "Connection lost. Changes are not saved to your account yet. Retry, or export a backup before reloading.",
          );
          return;
        }
      }
      if (alive.current && epoch === generation.current) {
        setStatus("saved");
        setProblem("");
      }
    } finally {
      running.current = false;
    }
  }
  function persist(next: Store) {
    if (!validStore(next))
      throw new Error(
        "Invalid cart data. You can have up to 12 carts and 100 products per cart.",
      );
    if (userRef.current) {
      if (new TextEncoder().encode(JSON.stringify(next)).length > 1_000_000)
        throw new Error(
          "Account storage limit reached. Shorten image URLs or export older carts.",
        );
      setStore(next);
      pending.current = next;
      // A cross-device conflict requires an explicit reload before more server writes.
      if (status !== "conflict") {
        setStatus("saving");
        void pump();
      }
    } else {
      saveStore(next);
      setStore(next);
    }
    return true;
  }
  function retry() {
    setProblem("");
    setStatus("saving");
    pending.current = storeRef.current;
    void pump();
  }
  async function signOut() {
    if (status !== "saved") return;
    setReady(false);
    const result = await authClient.signOut();
    if (result.error) {
      setReady(true);
      setProblem("Could not sign out. Please try again.");
      return;
    }
    await loadAccount();
  }
  return {
    store,
    user,
    ready,
    status,
    problem,
    persist,
    retry,
    reload: loadAccount,
    signOut,
  };
}
