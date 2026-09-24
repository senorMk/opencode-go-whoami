#!/bin/sh
# Link this plugin into global opencode config (no npm publish needed).
# Usage: sh scripts/link-global.sh
set -eu
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST_DIR="$HOME/.config/opencode/plugins"
MAP="$HOME/.config/opencode/go-accounts.json"
mkdir -p "$DEST_DIR"
ln -sf "$SRC_DIR/src/index.ts" "$DEST_DIR/go-whoami.ts"
ln -sf "$SRC_DIR/src/whoami.ts" "$DEST_DIR/go-whoami-whoami.ts"
# fix relative import: plugin dir expects ./go-whoami-whoami.js next to go-whoami.ts
# src/index.ts imports ./whoami.js -> resolves to go-whoami-whoami.ts? No:
# so instead copy with rewritten import for global use.
cp "$SRC_DIR/src/index.ts" "$DEST_DIR/go-whoami.ts.tmp"
# rewrite ./whoami.js -> ./go-whoami-whoami.js for the flat plugins dir
sed 's#./whoami.js#./go-whoami-whoami.js#' "$DEST_DIR/go-whoami.ts.tmp" > "$DEST_DIR/go-whoami.ts"
rm "$DEST_DIR/go-whoami.ts.tmp"
if [ ! -f "$MAP" ]; then
  cp "$SRC_DIR/go-accounts.example.json" "$MAP"
  echo "created $MAP — fill in your emails"
else
  echo "kept existing $MAP"
fi
echo "linked -> $DEST_DIR/go-whoami.ts"
echo "restart opencode, then run: node $SRC_DIR/bin/cli.mjs"
