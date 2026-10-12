#!/bin/sh
# Guided one-command setup for opencode-go-whoami.
# Usage: sh scripts/setup.sh
#
# It will:
#   1. find your signed-in OpenCode keys,
#   2. ask you for the email each key belongs to,
#   3. save that list, link the plugin, and add a /go-whoami command.
set -eu

SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
MAP="$CONFIG_DIR/go-accounts.json"

if ! command -v node >/dev/null 2>&1; then
  echo "Need 'node' to run setup. Install Node 22+ and try again."
  exit 1
fi

# 1. Find your signed-in keys (same places OpenCode keeps them).
KEYS_JSON="$(node -e '
const {existsSync,readFileSync} = require("node:fs");
const {homedir} = require("node:os");
const {join} = require("node:path");
const cands = [process.env.OPENCODE_AUTH_PATH,
  process.env.XDG_DATA_HOME ? join(process.env.XDG_DATA_HOME,"opencode","auth.json") : null,
  join(homedir(),".local","share","opencode","auth.json"),
  join(homedir(),".config","opencode","auth.json")].filter(Boolean);
const p = cands.find((x) => existsSync(x));
if (!p) { console.log(JSON.stringify({authPath:null,keys:[]})); process.exit(0); }
let auth = {};
try { auth = JSON.parse(readFileSync(p,"utf8")); } catch(e) {}
const crypto = require("node:crypto");
const keys = Object.keys(auth).sort().map((provider) => {
  const key = auth[provider] && typeof auth[provider].key === "string" ? auth[provider].key : "";
  return {provider,
    masked: key && key.length > 12 ? key.slice(0,7) + "…" + key.slice(-4) : "(none)",
    fp: key ? crypto.createHash("sha256").update(key,"utf8").digest("hex").slice(0,12) : "none",
    prefix: key ? key.slice(0,7) : ""};
});
console.log(JSON.stringify({authPath:p,keys}));
')"

AUTH_PATH="$(node -p "JSON.parse(process.argv[1]).authPath || ''" "$KEYS_JSON")"
if [ -z "$AUTH_PATH" ] || [ "$AUTH_PATH" = "null" ]; then
  echo "No signed-in OpenCode account found."
  echo "Sign in first with:  opencode auth login"
  exit 1
fi

echo ""
echo "Found your signed-in keys ($AUTH_PATH):"
node -e 'JSON.parse(process.argv[1]).keys.forEach((k)=>console.log("  - "+k.provider+"  "+k.masked+"  (id "+k.fp+")"))' "$KEYS_JSON"
echo ""
echo "OpenCode only stores keys, not emails — so tell me which email"
echo "each key belongs to (compare with https://opencode.ai/auth)."
echo "Press Enter to skip a key."
echo ""

# 2. Ask for an email per key, build the list.
# NOTE: the key list comes in on fd 3 so the questions can still
# read your answers from stdin (a pipe would eat them).
ANSWERS_FILE="$(mktemp)"
PROVIDERS_FILE="$(mktemp)"
trap 'rm -f "$ANSWERS_FILE" "${PROVIDERS_FILE:-}" "${MAP_TMP:-}"' EXIT INT TERM
node -e 'JSON.parse(process.argv[1]).keys.forEach((k)=>console.log(k.provider+"|"+k.fp+"|"+k.masked+"|"+k.prefix))' "$KEYS_JSON" > "$PROVIDERS_FILE"
while IFS='|' read -r provider fp masked prefix <&3; do
  if [ "$fp" = "none" ]; then continue; fi
  printf "Email for %s (%s)? " "$provider" "$masked"
  read -r email || email=""
  # trim whitespace
  email="$(printf '%s' "$email" | tr -d '[:space:]')"
  if [ -n "$email" ]; then
    printf '%s|%s|%s\n' "$fp" "$email" "$prefix" >> "$ANSWERS_FILE"
  fi
done 3< "$PROVIDERS_FILE"

# 3. Save the list (keep a backup of any previous one).
mkdir -p "$CONFIG_DIR"
if [ -f "$MAP" ]; then
  cp "$MAP" "$MAP.bak-$(date +%Y%m%d-%H%M%S)"
  echo "Backed up your old list."
fi
MAP_TMP="$(mktemp)"
node -e '
const {readFileSync,writeFileSync,existsSync} = require("node:fs");
const mapPath = process.argv[1], answersPath = process.argv[2];
let prev = {};
try { if (existsSync(mapPath)) prev = JSON.parse(readFileSync(mapPath,"utf8")); } catch(e) {}
const accounts = (prev.accounts && typeof prev.accounts === "object") ? {...prev.accounts} : {};
const byPrefix = (prev.byPrefix && typeof prev.byPrefix === "object") ? {...prev.byPrefix} : {};
const lines = readFileSync(answersPath,"utf8").split("\n").filter(Boolean);
for (const line of lines) {
  const [fp,email,prefix] = line.split("|");
  if (email && email.includes("@")) {
    accounts[fp] = email;
    if (prefix) byPrefix[prefix] = email;
  }
}
const out = {"_comment":"Which email each OpenCode key belongs to. Re-run sh scripts/setup.sh after switching accounts. Source of truth: https://opencode.ai/auth",accounts,byPrefix};
writeFileSync(mapPath, JSON.stringify(out,null,2)+"\n");
console.log("Saved " + lines.length + " email label(s) to " + mapPath);
' "$MAP" "$ANSWERS_FILE" > "$MAP_TMP"
cat "$MAP_TMP"

# 4. Install the server plugin, sidebar, and /go-whoami command.
sh "$SRC_DIR/scripts/link-global.sh"
