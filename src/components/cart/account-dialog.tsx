"use client";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import type { AccountUser, SaveStatus } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LoaderCircle, LogOut } from "lucide-react";
export function AccountDialog({
  open,
  onOpenChange,
  user,
  status,
  onSession,
  signOut,
  staticHost,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AccountUser | null;
  status: SaveStatus;
  onSession: () => Promise<void>;
  signOut: () => Promise<void>;
  staticHost: boolean;
}) {
  const [mode, setMode] = useState("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function close(value: boolean) {
    if (busy) return;
    setError("");
    setPassword("");
    setConfirm("");
    onOpenChange(value);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (mode === "signup" && password !== confirm) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const result =
        mode === "signup"
          ? await authClient.signUp.email({
              name: name.trim(),
              email: email.trim(),
              password,
            })
          : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(
          result.error.message ||
            "Could not sign in. Check your details and try again.",
        );
        return;
      }
      await onSession();
      setPassword("");
      setConfirm("");
      onOpenChange(false);
    } catch {
      setError("Could not connect. Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="account-dialog sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {user ? "Your account" : "Save carts to your account"}
          </DialogTitle>
          <DialogDescription>
            {user
              ? "Your carts are stored on this server and available after signing in on another device."
              : "Create an account or sign in to save carts and create share links."}
          </DialogDescription>
        </DialogHeader>
        {staticHost ? (
          <Alert>
            <AlertDescription>
              Accounts are available in the server version. This GitHub Pages
              version only saves carts in your browser.
            </AlertDescription>
          </Alert>
        ) : user ? (
          <>
            <div className="flex flex-col gap-2 text-sm">
              <strong className="break-words">{user.name}</strong>
              <span className="break-all text-muted-foreground">
                {user.email}
              </span>
              <p className="text-muted-foreground">
                Browser-only carts stay separate from account carts.
              </p>
              {status !== "saved" && (
                <Alert>
                  <AlertDescription>
                    Finish saving your changes, or export a backup and reload
                    saved carts before signing out.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                disabled={busy || status !== "saved"}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await signOut();
                    onOpenChange(false);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <LogOut data-icon="inline-start" />
                Sign out
              </Button>
              <Button onClick={() => onOpenChange(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <Tabs
            value={mode}
            onValueChange={(value) => {
              setMode(String(value));
              setError("");
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value={mode}>
              <form onSubmit={submit} className="flex flex-col gap-5 pt-3">
                <FieldGroup>
                  {mode === "signup" && (
                    <Field>
                      <FieldLabel htmlFor="account-name">Name</FieldLabel>
                      <Input
                        id="account-name"
                        autoComplete="name"
                        required
                        minLength={2}
                        maxLength={60}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={busy}
                      />
                    </Field>
                  )}
                  <Field>
                    <FieldLabel htmlFor="account-email">Email</FieldLabel>
                    <Input
                      id="account-email"
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={busy}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="account-password">Password</FieldLabel>
                    <Input
                      id="account-password"
                      type="password"
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      minLength={mode === "signup" ? 10 : 1}
                      maxLength={128}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={busy}
                    />
                    {mode === "signup" && (
                      <p className="text-xs text-muted-foreground">
                        Use at least 10 characters.
                      </p>
                    )}
                  </Field>
                  {mode === "signup" && (
                    <Field>
                      <FieldLabel htmlFor="account-confirm">
                        Confirm password
                      </FieldLabel>
                      <Input
                        id="account-confirm"
                        type="password"
                        autoComplete="new-password"
                        required
                        maxLength={128}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        disabled={busy}
                      />
                    </Field>
                  )}
                </FieldGroup>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription role="status">{error}</AlertDescription>
                  </Alert>
                )}
                <p className="text-xs text-muted-foreground">
                  After signing in, you can import existing browser carts into
                  your account.
                </p>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy}
                    onClick={() => close(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={busy}>
                    {busy && (
                      <LoaderCircle
                        className="motion-safe:animate-spin"
                        data-icon="inline-start"
                      />
                    )}
                    {mode === "signup" ? "Create account" : "Sign in"}
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
