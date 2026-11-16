import type { Metadata } from "next";
import { ArrowLeft, Download, ExternalLink, MousePointerClick } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Browser extension | Just a Shopping Cart",
  description: "Add product pages to your cart from Firefox, Chrome and Edge.",
};
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const steps = [
  { browser: "Chrome", url: "chrome://extensions", steps: "Extract the ZIP, enable Developer mode, choose Load unpacked, and select the extracted folder." },
  { browser: "Edge", url: "edge://extensions", steps: "Extract the ZIP, enable Developer mode, choose Load unpacked, and select the extracted folder." },
  { browser: "Firefox", url: "about:debugging#/runtime/this-firefox", steps: "Extract the ZIP, choose Load Temporary Add-on, and select manifest.json. Firefox removes temporary add-ons when it restarts." },
];
export default function ExtensionPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <Button variant="ghost" size="sm" className="w-fit" nativeButton={false} render={<a href={`${basePath}/`} />}><ArrowLeft data-icon="inline-start" />Back to carts</Button>
      <div className="flex flex-col gap-3">
        <Badge variant="outline" className="w-fit">Firefox · Chrome · Edge</Badge>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Add a product from your browser</h1>
        <p className="max-w-2xl text-muted-foreground">Open a product page, click the extension button, then review the imported name, image and price in your cart before saving.</p>
      </div>
      <Button className="w-fit" size="lg" nativeButton={false} render={<a href={`${basePath}/extension/justashoppingcart-extension.zip`} download />}><Download data-icon="inline-start" />Download extension ZIP</Button>
      <div className="grid gap-4 sm:grid-cols-3">
        {steps.map((step) => <Card key={step.browser}>
          <CardHeader><CardTitle>{step.browser}</CardTitle><CardDescription>Install the extension</CardDescription></CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm"><p>{step.steps}</p><p className="break-all text-muted-foreground">Open <code>{step.url}</code> in your browser.</p></CardContent>
        </Card>)}
      </div>
      <Alert><MousePointerClick /><AlertDescription>The extension only reads the page you are viewing after you click its button. Choosing Add product page sends its URL to this website. Import may fail if a shop blocks access; you can always enter product details manually.</AlertDescription></Alert>
      <p className="text-sm text-muted-foreground">Permanent Firefox installation requires Mozilla Add-ons signing. <a className="inline-flex items-center gap-1 underline" href="https://addons.mozilla.org/en-US/developers/" target="_blank" rel="noreferrer">Mozilla Add-ons <ExternalLink className="size-3" /></a></p>
    </main>
  );
}
