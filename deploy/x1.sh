#!/bin/sh
set -eu

# Run as the deployment user on X1. Docker and Compose must already be available.
revision=${1:?Pass the Git commit SHA to deploy}
case "$revision" in *[!0-9a-f]*|'') echo "Expected a commit SHA" >&2; exit 1;; esac
[ "${#revision}" -eq 40 ] || { echo "Expected a full commit SHA" >&2; exit 1; }
command -v git >/dev/null
docker compose version >/dev/null
app_directory="$HOME/JustAShoppingCart"
if [ ! -e "$app_directory" ]; then
  git clone https://github.com/niceguyyk/justashoppingcart.git "$app_directory"
fi
cd "$app_directory"
[ "$(git remote get-url origin)" = 'https://github.com/niceguyyk/justashoppingcart.git' ] || { echo "Unexpected repository" >&2; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Local changes found; stopping without overwriting them" >&2; exit 1; }
git fetch origin main
git checkout --detach "$revision"
docker compose -p justashoppingcart up --build -d --wait --wait-timeout 180
docker compose -p justashoppingcart ps
echo "JustAShoppingCart is running on port ${SHOPPING_CART_PORT:-3030}."
