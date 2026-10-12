#!/bin/sh
# Install or upgrade the OpenCode v2 plugin, preserving account labels.
set -eu
SRC_DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$SRC_DIR/scripts/install.mjs"
