# Just a Shopping Cart

A small tool for collecting product links from different shops and calculating a shared total. Built with Next.js, official shadcn/ui components (Base UI, Nova) and GSAP. The interface uses English text and a neutral black theme.

## Features

- Create, rename, switch and delete multiple carts
- Save and edit product URLs, names, image URLs, unit prices and quantities
- Add notes and a planned, for-later or bought status to products
- Create up to 30 categories per cart, assign up to eight per product, and show or hide multiple categories at once (including uncategorized products)
- Click anywhere on product cards in selection mode, or select all shown products, then add one or more categories in one action
- Detect duplicate links and increase quantity or keep a separate entry
- Calculate EUR totals using integer cents
- Show separate totals for products to buy now, for later and already bought, plus all items
- Show quantity-adjusted totals for each category in the cart and live shared view; category totals include every status and may overlap for products with multiple labels
- Import JSON-LD, Open Graph and itemprop details from Amazon country sites and other public HTTPS product pages when they allow access
- Enter or correct any missing product details manually
- Search, shop and category filters, sorting, grid and list views
- Browser cookie storage with JSON backup export and import
- Responsive UI and reduced-motion support
- Send the current product page from Chrome, Edge or Firefox with the extension in `extension/`

## Local development

Use Node.js 22.13 or later.

```sh
npm ci
npm run dev
```

Open http://localhost:3000.

```sh
npm test
npm run build
npm start
```

The canonical local project directory is `C:\Users\nikos\Documents\JustAShoppingCart`.

## X1 deployment

The server version includes automatic product import; no external database or API key is needed. Docker runs the app as an unprivileged user and restarts it after a reboot.

On X1, with Docker and the Compose plugin installed:

```sh
git clone https://github.com/niceguyyk/justashoppingcart.git ~/JustAShoppingCart
cd ~/JustAShoppingCart
docker compose -p justashoppingcart up --build -d --wait
```

Open `http://<X1-address>:3030`. Use `SHOPPING_CART_PORT` to choose a different free port. The app health endpoint is `/api/health`. Check logs with `docker compose -p justashoppingcart logs --tail 100 app`.

For a pinned release, run `sh deploy/x1.sh <full-commit-sha>` on X1. It refuses to overwrite local changes. To roll back, run the script with a previous commit that includes this Docker deployment setup. A reachable, authorized SSH login is required to deploy remotely.

## GitHub Pages

`npm run build:pages` exports the static version to `out`, with the base path `/justashoppingcart`. `.github/workflows/pages.yml` publishes it on pushes to `main`.

GitHub Pages cannot run server-side import. In that version, product details are entered manually. Cookie storage, totals, export and import work in both versions. The normal server build keeps `/api/product` enabled.

## Storage and import limits

Carts are stored for up to a year in three browser cookies, with a total limit of 9,000 URL-encoded characters. Actual capacity depends on the length of product and image URLs. Oversized updates are rejected before writing. The app allows up to 12 carts, 100 products and 30 categories per cart within the cookie limit.

Clearing cookies removes browser-only carts. Browser-only carts do not sync between devices; signed-in carts do. Export backups regularly. Images load from their providers. Automatic import sends the submitted product URL to the app server and the shop.

The importer only accesses public HTTPS URLs on the standard port, validates DNS addresses at connection time and checks each redirect. It bounds response size and time. It does not execute shop JavaScript, bypass captchas or log in to shops. Missing or non-EUR prices remain unknown; a foreign-currency price must be entered as EUR manually. Prices are snapshots, excluding additional shipping, discounts and future changes.

## Verification

`npm test` covers integer-cent formatting, shop URL checks, imported-data validation, cookie round-trips and capacity, structured product metadata, missing prices, non-EUR prices and blocked pages. Check the main cart flows at desktop and mobile widths with reduced motion before deployment.

## Accounts and sharing

The X1/server version supports email/password registration and sign-in through Better Auth. Account carts autosave to SQLite on the server. Browser carts remain separate and can be imported explicitly after signing in. Simultaneous edits on different devices are detected; export your edits or reload the saved version if there is a conflict.

Set `SHOPPING_CART_URL` in the server's ignored `.env` file to the exact URL you open, for example `http://<X1-address>:3030`, before running Compose. Authentication only accepts this configured origin. Use an HTTPS URL when exposing the app outside a trusted network.

The named Docker volume `justashoppingcart_cart-data` stores the SQLite database, authentication secret and persistent sessions. Container rebuilds and restarts preserve it. Do not remove that volume. Back it up using SQLite's online backup API (or stop the container before copying the database and secret together). The local development directory defaults to ignored `work/data`; set `APP_DATA_DIR` and `BETTER_AUTH_URL` to use an isolated test instance. The secret is generated on the server and never committed.

Passwords are hashed by Better Auth. Session cookies are HTTP-only, same-site and secure when the configured URL uses HTTPS. Email sending, verification email and password-reset email are not configured. Account data is scoped to the authenticated user; guest mode only uses browser cookies.

To share a saved cart, sign in, press **Share**, choose **View only** or **Can edit**, and create a link. Links contain unguessable tokens, follow the owner's latest saved cart, and expire in 30 days. The shared page checks for updates every 10 seconds while open. Anyone with an edit link can add, edit and remove products without signing in; treat that link as a password and revoke it if needed. Concurrent edits use version checks and reject stale saves. Owners can revoke links. Deleting a cart revokes its links. A user can have up to 50 active links. Set `SHOPPING_CART_URL` to the public HTTPS address when using a reverse proxy.

Downloadable extension source is packaged at `public/extension/justashoppingcart-extension.zip`; see `extension/README.md` for Chrome, Edge and Firefox installation. The extension opens the app with a product URL, so the user can review imported details before saving. It requires no shop-wide permissions.

GitHub Pages remains browser-only; accounts, share-link creation and product import require the server version.
