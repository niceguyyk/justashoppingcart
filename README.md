# Just a Shopping Cart

A small tool for collecting product links from different shops and calculating a shared total. Built with Next.js, official shadcn/ui components (Base UI, Nova) and GSAP. The interface uses English text and a neutral black theme.

## Features

- Create, rename, switch and delete multiple carts
- Save and edit product URLs, names, image URLs, unit prices and quantities
- Calculate EUR totals using integer cents
- Import JSON-LD and Open Graph details from Amazon.de/.com, Kleinanzeigen, eBay.de, OTTO and IKEA when shops allow access
- Add any other product URL manually
- Search, shop filters, sorting, grid and list views
- Browser cookie storage with JSON backup export and import
- Responsive UI and reduced-motion support

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

The server version includes automatic product import; no database or API key is needed. Docker runs the app as an unprivileged user and restarts it after a reboot.

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

Carts are stored for up to a year in three browser cookies, with a total limit of 9,000 URL-encoded characters. Actual capacity depends on the length of product and image URLs. Oversized updates are rejected before writing. The app allows up to 12 carts and 100 products per cart within the cookie limit.

Clearing cookies removes carts. There is no device sync; export backups regularly. Images load from their providers. Automatic import sends the submitted product URL to the app server and the shop.

The importer only accesses HTTPS URLs on supported shop domains, checks each redirect, and bounds response size and time. It does not execute shop JavaScript, bypass captchas or log in to shops. Missing or non-EUR prices remain unknown. Prices are snapshots, excluding additional shipping, discounts and future changes.

## Verification

`npm test` covers integer-cent formatting, shop URL checks, imported-data validation, cookie round-trips and capacity, structured product metadata, missing prices, non-EUR prices and blocked pages. Check the main cart flows at desktop and mobile widths with reduced motion before deployment.
