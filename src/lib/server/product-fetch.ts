import { lookup, type LookupAddress, type LookupOptions } from "node:dns";
import { BlockList, isIP } from "node:net";
import { Agent, fetch } from "undici";

const blocked4 = new BlockList();
const blocked6 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  blocked4.addSubnet(network, prefix, "ipv4");
for (const [network, prefix] of [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001::", 32],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
] as const)
  blocked6.addSubnet(network, prefix, "ipv6");

export function publicAddress(address: string) {
  const family = isIP(address);
  return family === 4
    ? !blocked4.check(address, "ipv4")
    : family === 6 && !blocked6.check(address, "ipv6");
}

export function publicProductUrl(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname
      .replace(/^\[|\]$/g, "")
      .toLowerCase()
      .replace(/\.$/, "");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      host.includes(".") &&
      !/(^|\.)(localhost|local|internal|test|invalid|example)$/.test(host) &&
      (isIP(host) === 0 || publicAddress(host))
    );
  } catch {
    return false;
  }
}

function safeLookup(
  hostname: string,
  options: LookupOptions,
  callback: (
    error: NodeJS.ErrnoException | null,
    address: string | LookupAddress[],
    family?: number,
  ) => void,
) {
  const family =
    options.family === 4 || options.family === "IPv4"
      ? 4
      : options.family === 6 || options.family === "IPv6"
        ? 6
        : 0;
  lookup(hostname, { all: true, family }, (error, addresses) => {
    const safe =
      addresses?.filter((entry) => publicAddress(entry.address)) || [];
    if (error || !safe.length) {
      callback(error || new Error("This address cannot be imported."), "");
      return;
    }
    if (options.all) callback(null, safe);
    else callback(null, safe[0].address, safe[0].family);
  });
}

export async function fetchProductHtml(value: string) {
  if (!publicProductUrl(value) || value.length > 2048)
    throw new Error("Enter a public HTTPS product URL without a custom port.");
  const agent = new Agent({ connect: { lookup: safeLookup }, connections: 1 });
  const signal = AbortSignal.timeout(12000);
  try {
    let current = value;
    for (let i = 0; i < 4; i++) {
      const response = await fetch(current, {
        dispatcher: agent,
        redirect: "manual",
        signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; JustAShoppingCart/1.0)",
          "Accept-Language": "en-US,en;q=0.9",
          Accept: "text/html",
        },
      });
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location)
          throw new Error("This product page has an invalid redirect.");
        const next = new URL(location, current).href;
        if (!publicProductUrl(next))
          throw new Error(
            "This product page redirects to an unsupported address.",
          );
        current = next;
        continue;
      }
      if (
        !response.ok ||
        !response.headers
          .get("content-type")
          ?.toLowerCase()
          .includes("text/html")
      ) {
        await response.body?.cancel();
        throw new Error(
          "This page did not provide product details. Enter them manually.",
        );
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No product data received.");
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      while (true) {
        const { done, value: chunk } = await reader.read();
        if (done) break;
        bytes += chunk.length;
        if (bytes > 2_000_000) {
          await reader.cancel();
          throw new Error(
            "The product page is too large. Enter the details manually.",
          );
        }
        chunks.push(chunk);
      }
      return { html: Buffer.concat(chunks).toString("utf8"), url: current };
    }
    throw new Error("This product page redirects too many times.");
  } finally {
    await agent.close();
  }
}
