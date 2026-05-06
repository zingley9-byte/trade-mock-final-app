#!/usr/bin/env bash
# Post-build cleanup to keep deployment image under 8 GiB.
#
# At runtime neither artifact needs node_modules:
#   - API server   → self-contained esbuild bundle (artifacts/api-server/dist/index.mjs)
#   - Mobile app   → zero-dependency serve.js using only Node.js built-ins
#
# This script is referenced by .replit [deployment.postBuild].
set -euo pipefail

echo "=== deploy-cleanup: removing dev dependencies before image snapshot ==="

# 1. Prune the pnpm content-addressable store (removes orphaned package blobs)
echo "[1/4] pruning pnpm store..."
pnpm store prune --force 2>/dev/null || true

# 2. Delete root node_modules (pnpm virtual store – the big one)
echo "[2/4] removing workspace node_modules..."
rm -rf /home/runner/workspace/node_modules

# 3. Delete per-artifact and per-lib node_modules
echo "[3/4] removing per-package node_modules..."
for dir in artifacts lib scripts; do
  find /home/runner/workspace/"$dir" -maxdepth 3 -name "node_modules" -type d \
    -exec rm -rf {} + 2>/dev/null || true
done

# 4. Delete the pnpm content-addressable store itself
echo "[4/4] removing pnpm store..."
rm -rf /home/runner/workspace/.local/share/pnpm/store
rm -rf /home/runner/.local/share/pnpm/store 2>/dev/null || true

# Remove Expo / Metro caches that aren't part of the built dist
rm -rf /home/runner/workspace/artifacts/mobile/.expo
rm -rf /tmp/metro-* /tmp/haste-* 2>/dev/null || true

echo "=== deploy-cleanup: done ==="
du -sh /home/runner/workspace 2>/dev/null || true
