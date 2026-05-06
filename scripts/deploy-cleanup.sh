#!/usr/bin/env bash
# Post-build cleanup to keep deployment image under 8 GiB.
#
# At runtime neither artifact needs any of the deleted paths:
#   - API server → self-contained esbuild bundle (artifacts/api-server/dist/index.mjs)
#   - Mobile app → zero-dependency serve.js using only Node.js built-ins
#
# Size breakdown (before cleanup, ~30 GiB total):
#   .git/              ~21 GiB  (.git/lfs/objects ~17 GiB, .git/objects/pack ~3.5 GiB)
#   node_modules/       ~1 GiB
#   .local/ (pnpm)     ~0.9 GiB
#   .cache/            ~0.6 GiB
#
# This script is run as the last step of the mobile production build command.
set -euo pipefail

WORKSPACE=/home/runner/workspace

echo "=== deploy-cleanup: removing unneeded files before image snapshot ==="

# 1. Git history and LFS objects — not needed at runtime (~21 GiB saved)
echo "[1/5] removing .git history and LFS objects..."
rm -rf "$WORKSPACE/.git"

# 2. Delete root node_modules (pnpm virtual store)
echo "[2/5] removing workspace node_modules..."
rm -rf "$WORKSPACE/node_modules"

# 3. Delete per-artifact and per-lib node_modules
echo "[3/5] removing per-package node_modules..."
for dir in artifacts lib scripts; do
  find "$WORKSPACE/$dir" -maxdepth 3 -name "node_modules" -type d \
    -exec rm -rf {} + 2>/dev/null || true
done

# 4. Delete pnpm content-addressable stores (both possible locations)
echo "[4/5] removing pnpm stores..."
rm -rf "$WORKSPACE/.local/share/pnpm"
rm -rf /home/runner/.local/share/pnpm 2>/dev/null || true

# 5. Delete build caches
echo "[5/5] removing build caches..."
rm -rf "$WORKSPACE/.cache"
rm -rf "$WORKSPACE/artifacts/mobile/.expo"
rm -rf /tmp/metro-* /tmp/haste-* 2>/dev/null || true

echo "=== deploy-cleanup: done ==="
du -sh "$WORKSPACE" 2>/dev/null || true
